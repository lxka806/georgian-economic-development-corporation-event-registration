const mongoose = require("mongoose");
const Session = require("../models/Session");
const Event = require("../models/Event");
const { getReferenceId, isObjectIdString } = require("../utils/mongoIds");
const { withParticipantCount } = require("../utils/publicDocuments");
const { isRequiredSession } = require("../utils/registrationRules");
const { orderSessions } = require("../utils/sessionOrder");

const publicEvent = (event) => {
    const result = withParticipantCount(event);
    return {
        ...result,
        sessionId: getReferenceId(event.sessionId)
    };
};

const getEventsBySession = async () => {
    const events = await Event.find().lean();
    const eventsBySession = new Map();

    for (const event of events) {
        const sessionId = getReferenceId(event.sessionId);
        if (!sessionId) {
            continue;
        }

        const sessionEvents = eventsBySession.get(sessionId) || [];
        sessionEvents.push(publicEvent(event));
        eventsBySession.set(sessionId, sessionEvents);
    }

    return eventsBySession;
};

const getAllSessions = async (req, res) => {
    try {
        const [sessionDocuments, eventsBySession] = await Promise.all([
            Session.find().lean(),
            getEventsBySession()
        ]);
        const sessions = orderSessions(sessionDocuments);
        const sessionsWithEvents = sessions.map((session) => ({
            ...withParticipantCount(session),
            isRequired: isRequiredSession(session),
            events: eventsBySession.get(getReferenceId(session._id)) || []
        }));

        return res.status(200).json(sessionsWithEvents);
    } catch (error) {
        console.error("Failed to get sessions:", error.message);
        return res.status(500).json({ message: "Failed to get sessions" });
    }
};

const getSessionById = async (req, res) => {
    if (!isObjectIdString(req.params.id)) {
        return res.status(400).json({ message: "Invalid session ID" });
    }

    try {
        const sessionId = new mongoose.Types.ObjectId(req.params.id);
        const [session, eventsBySession] = await Promise.all([
            Session.findById(sessionId).lean(),
            getEventsBySession()
        ]);
        if (!session) {
            return res.status(404).json({ message: "Session not found" });
        }

        return res.status(200).json({
            ...withParticipantCount(session),
            isRequired: isRequiredSession(session),
            events: eventsBySession.get(getReferenceId(session._id)) || []
        });
    } catch (error) {
        console.error("Failed to get session:", error.message);
        return res.status(500).json({ message: "Failed to get session" });
    }
};

const getSessionEvents = async (req, res) => {
    if (!isObjectIdString(req.params.id)) {
        return res.status(400).json({ message: "Invalid session ID" });
    }

    try {
        const sessionId = new mongoose.Types.ObjectId(req.params.id);
        const session = await Session.findById(sessionId).select("_id").lean();
        if (!session) {
            return res.status(404).json({ message: "Session not found" });
        }

        const eventsBySession = await getEventsBySession();
        return res.status(200).json(eventsBySession.get(getReferenceId(session._id)) || []);
    } catch (error) {
        console.error("Failed to get session events:", error.message);
        return res.status(500).json({ message: "Failed to get session events" });
    }
};

module.exports = { getAllSessions, getSessionById, getSessionEvents };
