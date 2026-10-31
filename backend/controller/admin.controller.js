const crypto = require("crypto");
const Event = require("../models/Event");
const Session = require("../models/Session");
const User = require("../models/User");
const { getReferenceId, isObjectIdString } = require("../utils/mongoIds");
const {
    clearAdminCookie,
    createAdminToken,
    setAdminCookie
} = require("../middleware/authentication");
const { orderSessions } = require("../utils/sessionOrder");

const ADMIN_LOGIN_WINDOW_MS = 15 * 60 * 1000;
const ADMIN_LOGIN_LIMIT = 5;
const adminLoginAttempts = new Map();

const isAdminLoginRateLimited = (ipAddress) => {
    const now = Date.now();
    const recentAttempts = (adminLoginAttempts.get(ipAddress) || [])
        .filter((timestamp) => now - timestamp < ADMIN_LOGIN_WINDOW_MS);

    if (recentAttempts.length >= ADMIN_LOGIN_LIMIT) {
        adminLoginAttempts.set(ipAddress, recentAttempts);
        return true;
    }

    recentAttempts.push(now);
    adminLoginAttempts.set(ipAddress, recentAttempts);
    return false;
};

const adminLogin = (req, res) => {
    if (isAdminLoginRateLimited(req.ip || "unknown")) {
        return res.status(429).json({
            message: "Too many admin login attempts. Please try again later."
        });
    }

    const configuredPassword = process.env.ADMIN_DASHBOARD_PASSWORD;
    if (typeof configuredPassword !== "string" || configuredPassword.length === 0) {
        return res.status(503).json({
            message: "Admin authentication is not configured. Set ADMIN_DASHBOARD_PASSWORD on the server."
        });
    }

    if (configuredPassword.length < 16) {
        return res.status(503).json({
            message: "The configured admin password must be at least 16 characters. Update ADMIN_DASHBOARD_PASSWORD in the backend environment and restart the server."
        });
    }

    const password = req.body && req.body.password;
    if (typeof password !== "string") {
        return res.status(400).json({ message: "Admin password is required" });
    }

    const providedDigest = crypto.createHash("sha256").update(password).digest();
    const configuredDigest = crypto.createHash("sha256").update(configuredPassword).digest();
    if (!crypto.timingSafeEqual(providedDigest, configuredDigest)) {
        return res.status(401).json({ message: "Invalid admin password" });
    }

    try {
        const { token, expiresIn } = createAdminToken();
        setAdminCookie(res, token, expiresIn);
        return res.status(200).json({
            authenticated: true,
            expiresIn
        });
    } catch (error) {
        if (error.code === "AUTH_TOKEN_SECRET_NOT_CONFIGURED") {
            return res.status(503).json({
                message: "Admin authentication is not configured on the server"
            });
        }

        console.error("Unable to create admin session:", error.message);
        return res.status(500).json({ message: "Unable to start admin session" });
    }
};

const adminSession = (req, res) =>
    res.status(200).json({ authenticated: true });

const adminLogout = (req, res) => {
    clearAdminCookie(res);
    return res.status(200).json({ authenticated: false });
};

const setSessionRequired = async (req, res) => {
    const { id } = req.params;
    const { isRequired } = req.body || {};
    if (!isObjectIdString(id) || typeof isRequired !== "boolean") {
        return res.status(400).json({ message: "A valid session ID and isRequired boolean are required" });
    }

    try {
        const session = await Session.findByIdAndUpdate(
            id,
            { $set: { isRequired } },
            { new: true, runValidators: true }
        ).select("_id name isRequired");
        if (!session) {
            return res.status(404).json({ message: "Session not found" });
        }
        return res.status(200).json({ session });
    } catch (error) {
        console.error("Failed to update required session:", error.message);
        return res.status(500).json({ message: "Failed to update session" });
    }
};

const setSessionOrder = async (req, res) => {
    const { id } = req.params;
    const { order } = req.body || {};
    if (!isObjectIdString(id) || !Number.isSafeInteger(order) || order < 1) {
        return res.status(400).json({ message: "A valid session ID and positive integer order are required" });
    }

    try {
        const sessions = orderSessions(await Session.find().lean());
        const sessionIndex = sessions.findIndex((session) => getReferenceId(session._id) === id);
        if (sessionIndex === -1) {
            return res.status(404).json({ message: "Session not found" });
        }
        if (order > sessions.length) {
            return res.status(400).json({ message: `Order must be between 1 and ${sessions.length}` });
        }

        const [session] = sessions.splice(sessionIndex, 1);
        sessions.splice(order - 1, 0, session);
        const orderedSessions = sessions.map((item, index) => ({
            ...item,
            order: index + 1
        }));
        await Session.bulkWrite(orderedSessions.map((item) => ({
            updateOne: {
                filter: { _id: item._id },
                update: { $set: { order: item.order } }
            }
        })));

        return res.status(200).json({
            sessions: orderedSessions.map(({ _id, name, startTime, endTime, isRequired, order: sessionOrder }) => ({
                _id,
                name,
                startTime,
                endTime,
                isRequired,
                order: sessionOrder
            }))
        });
    } catch (error) {
        console.error("Failed to update session order:", error.message);
        return res.status(500).json({ message: "Failed to update session order" });
    }
};

const getPublicAdminSummary = async (req, res) => {
    try {
        const [users, sessions, events] = await Promise.all([
            User.find().select("_id sessions").lean(),
            Session.find().select("_id").lean(),
            Event.find().select("_id participants").lean()
        ]);
        const registeredUserIds = new Set(users.map((user) => getReferenceId(user._id)));
        const selectedSessionIdsByUser = users.map((user) => new Set(
            (user.sessions || [])
                .map((session) => getReferenceId(session))
                .filter(Boolean)
        ));
        const sessionParticipantIds = new Set();
        const eventParticipantIds = new Set();
        let totalEventSelections = 0;

        for (const user of users) {
            const userId = getReferenceId(user._id);
            if (selectedSessionIdsByUser.some((ids) => ids.has(userId))) {
                sessionParticipantIds.add(userId);
            }
        }

        for (const event of events) {
            const eventParticipants = new Set(
                (event.participants || [])
                    .map((participant) => getReferenceId(participant))
                    .filter((userId) => userId && registeredUserIds.has(userId))
            );
            totalEventSelections += eventParticipants.size;
            for (const userId of eventParticipants) {
                eventParticipantIds.add(userId);
            }
        }

        return res.status(200).json({
            summary: {
                totalUsers: users.length,
                usersWithSessions: sessionParticipantIds.size,
                usersWithEvents: eventParticipantIds.size,
                totalSessions: sessions.length,
                totalEvents: events.length,
                totalSessionSelections: selectedSessionIdsByUser.reduce(
                    (total, selections) => total + selections.size,
                    0
                ),
                totalEventSelections
            }
        });
    } catch (error) {
        console.error("Failed to load public dashboard summary:", error.message);
        return res.status(500).json({ message: "Failed to load dashboard summary" });
    }
};

const getAdminDashboard = async (req, res) => {
    try {
        const [users, sessions, events] = await Promise.all([
            User.find()
                .select("_id firstName lastName email phoneNumber businessName position activity businessDescription sessions createdAt")
                .populate({ path: "sessions", select: "name startTime endTime order" })
                .lean(),
            Session.find().select("_id name startTime endTime isRequired order").lean(),
            Event.find().select("_id name place time sessionId participants").lean()
        ]);

        const orderedSessions = orderSessions(sessions);
        const orderBySessionId = new Map(
            orderedSessions.map((session) => [getReferenceId(session._id), session.order])
        );
        const requiredSessions = sessions.filter((session) => session.isRequired === true);
        const requiredSessionIds = requiredSessions
            .map((session) => getReferenceId(session._id))
            .filter(Boolean);
        const registeredUserIds = new Set(users.map((user) => getReferenceId(user._id)));
        const eventsByUser = new Map();
        const selectedEventUsers = new Set();
        let totalEventSelections = 0;
        const selectedSessionIdsByUser = users.map((user) => new Set(
            [
                ...(user.sessions || []).map((session) => getReferenceId(session)).filter(Boolean),
                ...requiredSessionIds
            ]
        ));
        const totalSessionSelections = selectedSessionIdsByUser.reduce(
            (total, selectedIds) => total + selectedIds.size,
            0
        );
        const usersWithSessions = selectedSessionIdsByUser.filter(
            (selectedIds) => selectedIds.size > 0
        ).length;

        for (const event of events) {
            const eventSummary = {
                _id: getReferenceId(event._id),
                name: event.name,
                place: event.place,
                time: event.time,
                sessionId: getReferenceId(event.sessionId)
            };

            const eventParticipants = new Set(
                (event.participants || [])
                    .map((participant) => getReferenceId(participant))
                    .filter((userId) => userId && registeredUserIds.has(userId))
            );
            for (const userId of eventParticipants) {

                selectedEventUsers.add(userId);
                totalEventSelections += 1;
                const userEvents = eventsByUser.get(userId) || [];
                userEvents.push(eventSummary);
                eventsByUser.set(userId, userEvents);
            }
        }

        const dashboardUsers = users.map((user) => {
            const userId = getReferenceId(user._id);
            const selectedSessions = (user.sessions || []).map((session) => ({
                _id: getReferenceId(session?._id),
                name: session?.name,
                startTime: session?.startTime,
                endTime: session?.endTime,
                order: orderBySessionId.get(getReferenceId(session?._id))
            })).filter((session) => session._id);
            const selectedSessionIds = new Set(selectedSessions.map((session) => session._id));
            for (const session of requiredSessions) {
                const sessionId = getReferenceId(session._id);
                if (!selectedSessionIds.has(sessionId)) {
                    selectedSessions.push({
                        _id: sessionId,
                        name: session.name,
                        startTime: session.startTime,
                        endTime: session.endTime,
                        order: orderBySessionId.get(sessionId)
                    });
                }
            }
            selectedSessions.sort((left, right) => left.order - right.order);

            return {
                _id: userId,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                phoneNumber: user.phoneNumber,
                businessName: user.businessName,
                position: user.position,
                activity: user.activity,
                businessDescription: user.businessDescription,
                createdAt: user.createdAt,
                sessions: selectedSessions,
                events: eventsByUser.get(userId) || []
            };
        });

        return res.status(200).json({
            summary: {
                totalUsers: users.length,
                usersWithSessions,
                usersWithEvents: selectedEventUsers.size,
                totalSessions: sessions.length,
                totalEvents: events.length,
                totalSessionSelections,
                totalEventSelections
            },
            users: dashboardUsers
        });
    } catch (error) {
        console.error("Failed to load admin dashboard:", error.message);
        return res.status(500).json({ message: "Failed to load admin dashboard" });
    }
};

module.exports = {
    adminLogin,
    adminLogout,
    adminSession,
    getAdminDashboard,
    getPublicAdminSummary,
    setSessionOrder,
    setSessionRequired
};
