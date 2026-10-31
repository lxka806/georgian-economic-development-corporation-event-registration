
const crypto = require("crypto");
const User = require("../models/User");
const { sendVerificationEmail } = require("../conf/mailer");

const georgianInputError = "გთხოვთ, ყველა ველი (ელფოსტის გარდა) შეავსოთ ქართულად";

const registerUser = async (req, res) => {
    try {
        const requestBody = req.body && typeof req.body === "object" &&
            !Array.isArray(req.body) ? req.body : {};
        const {
            firstName,
            lastName,
            phoneNumber,
            email,
            businessName,
            position,
            activity,
            businessDescription
        } = requestBody;

        const requiredFields = {
            firstName,
            lastName,
            phoneNumber,
            email,
            businessName,
            position,
            activity,
            businessDescription
        };

        if (Object.values(requiredFields).some((value) =>
            typeof value !== "string" || value.trim().length === 0
        )) {
            return res.status(400).json({
                message: "გთხოვთ, შეავსოთ ყველა სავალდებულო ველი"
            });
        }

        if (!phoneNumber.trim().startsWith("5")) {
            return res.status(400).json({
                message: "ტელეფონის ნომერი უნდა იწყებოდეს 5-ით"
            });
        }

        const georgianTextFields = [
            firstName,
            lastName,
            businessName,
            position,
            activity,
            businessDescription
        ];
        if (
            georgianTextFields.some(value =>
                !/\p{Script=Georgian}/u.test(value) ||
                !/^[\p{Script=Georgian}\p{White_Space}\p{Punctuation}\p{Number}]+$/u.test(value)
            ) ||
            /\p{Script=Latin}/u.test(phoneNumber)
        ) {
            return res.status(400).json({
                message: georgianInputError
            });
        }

        const normalizedEmail = email.trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
            return res.status(400).json({
                message: "Please provide a valid email address"
            });
        }

        const existingUser = await User.findOne({ email: normalizedEmail });

        if (existingUser) {
            return res.status(409).json({
                message: "An account with this email address already exists"
            });
        }

        const verificationCode = crypto
            .randomInt(10000000, 100000000)
            .toString();

        const hashedToken = crypto
            .createHash("sha256")
            .update(verificationCode)
            .digest("hex");

        const user = await User.create({
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            phoneNumber: phoneNumber.trim(),
            email: normalizedEmail,
            businessName: businessName.trim(),
            position: position.trim(),
            activity: activity.trim(),
            businessDescription: businessDescription.trim(),
            isEmailVerified: false,
            emailVerificationToken: hashedToken,
            emailVerificationExpires: new Date(
                Date.now() + 15 * 60 * 1000
            )
        });

        try {
            await sendVerificationEmail(user, verificationCode);
        } catch (emailError) {
            console.error("Verification email delivery failed:", {
                code: emailError.code || "EMAIL_CONFIGURATION_ERROR",
                responseCode: emailError.responseCode || null,
                command: emailError.command || null
            });

            return res.status(503).json({
                message: "Your account was created, but the verification email could not be sent. Please try resending the verification email."
            });
        }

        return res.status(201).json({
            message: "Registration successful. Check your email to verify your account."
        });
    } catch (error) {
        console.error("Registration error:", error);

        if (error.code === 11000) {
            return res.status(409).json({
                message: "An account with this email address already exists"
            });
        }

        return res.status(500).json({
            message: "Server error"
        });
    }
};

module.exports = { registerUser };
