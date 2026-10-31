
const mongoose = require("mongoose");

const EventSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },
        place: {
            type: String,
            required: true,
            trim: true
        },
        time: {
            type: String,
            required: true
        },
        participants: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            }
        ],
        sessionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Session",
            required: true
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Event", EventSchema);
