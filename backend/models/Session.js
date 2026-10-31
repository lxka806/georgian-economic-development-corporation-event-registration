
const mongoose = require("mongoose");

const SessionSchema = new mongoose.Schema(
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
        startTime: {
            type: Date,
            required: true
        },
        endTime: {
            type: Date,
            required: true
        },
        order: {
            type: Number,
            min: 1,
            default: 1,
            validate: Number.isSafeInteger
        },
        description: {
            type: String,
            trim: true,
            default: ""
        },
        isRequired: {
            type: Boolean,
            default: false
        },
        participants: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            }
        ],
        events: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Event"
            }
        ]
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Session", SessionSchema);
