const mongoose = require("mongoose");

const georgianInputError = "გთხოვთ, ყველა ველი (ელფოსტის გარდა) შეავსოთ ქართულად";
const isGeorgianText = value =>
    /\p{Script=Georgian}/u.test(value) &&
    /^[\p{Script=Georgian}\p{White_Space}\p{Punctuation}\p{Number}]+$/u.test(value);

const UserSchema = new mongoose.Schema(
    {
        firstName: {
            type: String,
            required: true,
            validate: { validator: isGeorgianText, message: georgianInputError }
        },
        lastName: {
            type: String,
            required: true,
            validate: { validator: isGeorgianText, message: georgianInputError }
        },
        phoneNumber: {
            type: String,
            required: true,
            validate: {
                validator: value =>
                    value.trim().startsWith("5") &&
                    !/\p{Script=Latin}/u.test(value),
                message: "ტელეფონის ნომერი უნდა იწყებოდეს 5-ით"
            }
        },
        email: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true
        },
        businessName: {
            type: String,
            required: true,
            validate: { validator: isGeorgianText, message: georgianInputError }
        },
        position: {
            type: String,
            required: true,
            validate: { validator: isGeorgianText, message: georgianInputError }
        },
        activity: {
            type: String,
            required: true,
            validate: { validator: isGeorgianText, message: georgianInputError }
        },
        businessDescription: {
            type: String,
            required: true,
            validate: {
                validator: isGeorgianText,
                message: georgianInputError
            }
        },
        sessions: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Session"
            }
        ]
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("User", UserSchema);