const mongoose = require("mongoose");
const Event = require("../models/Event");
const Session = require("../models/Session");
const User = require("../models/User");
const { getReferenceId, isObjectIdString } = require("../utils/mongoIds");
const { withParticipantCount } = require("../utils/publicDocuments");
const { isRequiredSession } = require("../utils/registrationRules");

const httpError = (statusCode, message) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

const parseSelectionIds = (body) => {
    if (!body || typeof body !== "object" || Array.isArray(body) ||
        !Array.isArray(body.sessionIds) || !Array.isArray(body.eventIds)) {
        throw httpError(400, "sessionIds and eventIds must both be arrays");
    }

    for (const [field, ids] of Object.entries({
        sessionIds: body.sessionIds,
        eventIds: body.eventIds
    })) {
        if (ids.some((id) => !isObjectIdString(id))) {
            throw httpError(400, `${field} must contain only valid MongoDB ObjectIds`);
        }

        const normalizedIds = ids.map((id) => id.toLowerCase());
        if (new Set(normalizedIds).size !== normalizedIds.length) {
            throw httpError(400, `${field} must not contain duplicate IDs`);
        }
    }

    if (body.sessionIds.length === 0 && body.eventIds.length === 0) {
        throw httpError(400, "Select at least one session or event");
    }
    if (body.eventIds.length !== 1) {
        throw httpError(400, "Select exactly one event");
    }

    return {
        sessionIds: body.sessionIds.map((id) => new mongoose.Types.ObjectId(id)),
        eventIds: body.eventIds.map((id) => new mongoose.Types.ObjectId(id))
    };
};

const withDatabaseSession = (query, databaseSession) =>
    databaseSession ? query.session(databaseSession) : query;

const buildSelectionPlan = async (userId, selections, databaseSession) => {
    const user = await withDatabaseSession(
        User.findById(userId).select("sessions"),
        databaseSession
    );
    if (!user) {
        throw httpError(401, "Authenticated user no longer exists");
    }

    const selectedSessions = selections.sessionIds.length
        ? await withDatabaseSession(
            Session.find({ _id: { $in: selections.sessionIds } }).select("_id"),
            databaseSession
        )
        : [];
    const requiredSessions = await withDatabaseSession(
        Session.find({ isRequired: true }).select("_id"),
        databaseSession
    );
    const selectedSessionIds = [...new Map(
        [...selectedSessions, ...requiredSessions]
            .map((session) => [getReferenceId(session._id), session._id])
    ).values()];

    const selectedEvents = selections.eventIds.length
        ? await withDatabaseSession(
            Event.find({ _id: { $in: selections.eventIds } }).select("_id sessionId"),
            databaseSession
        )
        : [];
    if (selectedEvents.length !== selections.eventIds.length) {
        throw httpError(404, "One or more selected events were not found");
    }

    const eventParentIds = selectedEvents.map((event) => getReferenceId(event.sessionId));
    if (eventParentIds.some((id) => !isObjectIdString(id))) {
        throw httpError(400, "A selected event is not linked to a valid session");
    }

    const uniqueParentIds = [...new Set(eventParentIds)];
    const parentSessions = uniqueParentIds.length
        ? await Session.collection.find(
            {
                _id: {
                    $in: uniqueParentIds.flatMap((id) => [
                        new mongoose.Types.ObjectId(id),
                        id
                    ])
                }
            },
            databaseSession ? { session: databaseSession } : {}
        ).toArray()
        : [];
    const foundParentIds = new Set(parentSessions.map((session) => getReferenceId(session._id)));
    if (uniqueParentIds.some((id) => !foundParentIds.has(id))) {
        throw httpError(400, "A selected event belongs to a session that no longer exists");
    }

    const oldSessionIds = Array.from(user.sessions || []);
    const oldEvents = await withDatabaseSession(
        Event.find({ participants: userId }).select("_id"),
        databaseSession
    );
    const oldEventIds = oldEvents.map((event) => event._id);
    const affectedSessionIds = [...new Map(
        [...oldSessionIds, ...selectedSessionIds]
            .map((id) => [getReferenceId(id), id])
    ).values()];
    const affectedEventIds = [...new Map(
        [...oldEventIds, ...selections.eventIds]
            .map((id) => [getReferenceId(id), id])
    ).values()];

    const [sessionSnapshots, eventSnapshots] = await Promise.all([
        affectedSessionIds.length
            ? withDatabaseSession(
                Session.find({ _id: { $in: affectedSessionIds } }).select("_id participants"),
                databaseSession
            )
            : [],
        affectedEventIds.length
            ? withDatabaseSession(
                Event.find({ _id: { $in: affectedEventIds } }).select("_id participants"),
                databaseSession
            )
            : []
    ]);

    return {
        userId,
        oldSessionIds,
        selectedSessionIds,
        oldEventIds,
        selectedEventIds: selections.eventIds,
        affectedSessionIds,
        affectedEventIds,
        previousSessionParticipants: sessionSnapshots
            .filter((document) => (document.participants || []).some((id) =>
                getReferenceId(id) === getReferenceId(userId)
            ))
            .map((document) => document._id),
        previousEventParticipants: eventSnapshots
            .filter((document) => (document.participants || []).some((id) =>
                getReferenceId(id) === getReferenceId(userId)
            ))
            .map((document) => document._id)
    };
};

const updateParticipantRelationships = async (plan, databaseSession) => {
    const options = databaseSession ? { session: databaseSession } : {};
    const userId = plan.userId;

    if (plan.affectedSessionIds.length) {
        await Session.updateMany(
            { _id: { $in: plan.affectedSessionIds } },
            { $pull: { participants: userId } },
            options
        );
        if (plan.selectedSessionIds.length) {
            await Session.updateMany(
                { _id: { $in: plan.selectedSessionIds } },
                { $addToSet: { participants: userId } },
                options
            );
        }
    }

    if (plan.affectedEventIds.length) {
        await Event.updateMany(
            { _id: { $in: plan.affectedEventIds } },
            { $pull: { participants: userId } },
            options
        );
        if (plan.selectedEventIds.length) {
            await Event.updateMany(
                { _id: { $in: plan.selectedEventIds } },
                { $addToSet: { participants: userId } },
                options
            );
        }
    }

    const userUpdate = await User.updateOne(
        { _id: userId },
        { $set: { sessions: plan.selectedSessionIds } },
        options
    );
    if (userUpdate.matchedCount === 0) {
        throw httpError(401, "Authenticated user no longer exists");
    }
};

const rollbackParticipantRelationships = async (plan) => {
    const rollbackErrors = [];
    const operations = [
        () => plan.affectedSessionIds.length && Session.updateMany(
            { _id: { $in: plan.affectedSessionIds } },
            { $pull: { participants: plan.userId } }
        ),
        () => plan.previousSessionParticipants.length && Session.updateMany(
            { _id: { $in: plan.previousSessionParticipants } },
            { $addToSet: { participants: plan.userId } }
        ),
        () => plan.affectedEventIds.length && Event.updateMany(
            { _id: { $in: plan.affectedEventIds } },
            { $pull: { participants: plan.userId } }
        ),
        () => plan.previousEventParticipants.length && Event.updateMany(
            { _id: { $in: plan.previousEventParticipants } },
            { $addToSet: { participants: plan.userId } }
        ),
        () => User.updateOne(
            { _id: plan.userId },
            { $set: { sessions: plan.oldSessionIds } }
        )
    ];

    for (const operation of operations) {
        try {
            await operation();
        } catch (error) {
            rollbackErrors.push(error);
        }
    }

    return rollbackErrors;
};

const saveSelectionsWithoutTransaction = async (userId, selections) => {
    let plan;
    try {
        plan = await buildSelectionPlan(userId, selections);
        await updateParticipantRelationships(plan);
        return plan;
    } catch (error) {
        if (plan) {
            const rollbackErrors = await rollbackParticipantRelationships(plan);
            if (rollbackErrors.length) {
                throw new AggregateError(
                    [error, ...rollbackErrors],
                    "Selection update failed and rollback was incomplete"
                );
            }
        }
        throw error;
    }
};

const transactionIsUnsupported = (error) =>
    error.code === 20 ||
    error.code === 303 ||
    /Transaction numbers are only allowed on a replica set member or mongos/i
        .test(error.message || "");

const saveSelections = async (req, res) => {
    let selections;
    try {
        selections = parseSelectionIds(req.body);
        const userId = req.user._id;
        const databaseSession = await mongoose.startSession();
        let plan;

        try {
            await databaseSession.withTransaction(async () => {
                plan = await buildSelectionPlan(userId, selections, databaseSession);
                await updateParticipantRelationships(plan, databaseSession);
            });
        } catch (error) {
            if (!transactionIsUnsupported(error)) {
                throw error;
            }

            plan = await saveSelectionsWithoutTransaction(userId, selections);
        } finally {
            await databaseSession.endSession();
        }

        return res.status(200).json({
            message: "Selections saved",
            selections: {
                sessionIds: plan.selectedSessionIds.map(getReferenceId),
                eventIds: plan.selectedEventIds.map(getReferenceId)
            }
        });
    } catch (error) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({ message: error.message });
        }

        console.error("Failed to save selections:", error);
        return res.status(500).json({ message: "Failed to save selections" });
    }
};

const getMySelections = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select("sessions");
        if (!user) {
            return res.status(401).json({ message: "Authenticated user no longer exists" });
        }

        const selectedSessionIds = user.sessions || [];
        const [sessions, events] = await Promise.all([
            selectedSessionIds.length
                ? Session.find({ _id: { $in: selectedSessionIds } }).lean()
                : [],
            Event.find({ participants: user._id }).lean()
        ]);
        const selectedEvents = events.map((event) => ({
            ...withParticipantCount(event),
            sessionId: getReferenceId(event.sessionId)
        }));
        const eventsBySession = new Map();
        for (const event of selectedEvents) {
            const sessionEvents = eventsBySession.get(event.sessionId) || [];
            sessionEvents.push(event);
            eventsBySession.set(event.sessionId, sessionEvents);
        }

        return res.status(200).json({
            sessions: sessions.map((session) => ({
                ...withParticipantCount(session),
                isRequired: isRequiredSession(session),
                events: eventsBySession.get(getReferenceId(session._id)) || []
            })),
            events: selectedEvents
        });
    } catch (error) {
        console.error("Failed to get current selections:", error.message);
        return res.status(500).json({ message: "Failed to get current selections" });
    }
};

module.exports = { getMySelections, saveSelections };
