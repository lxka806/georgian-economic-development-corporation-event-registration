const Event = require("../models/Event");
const { getReferenceId } = require("../utils/mongoIds");
const { withParticipantCount } = require("../utils/publicDocuments");

const getAllEvents = async (req, res) => {
    try {
        const events = await Event.find().lean();
        return res.status(200).json(events.map((event) => ({
            ...withParticipantCount(event),
            sessionId: getReferenceId(event.sessionId)
        })));
    } catch (error) {
        console.error("Failed to get events:", error.message);
        return res.status(500).json({ message: "Failed to get events" });
    }
};

module.exports = { getAllEvents };
