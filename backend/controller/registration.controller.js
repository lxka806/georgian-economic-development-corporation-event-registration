
const User = require("../models/User");
const {
    assertTokenSecretConfigured,
    createBearerToken,
    setAuthenticationCookie
} = require("../middleware/authentication");

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

        assertTokenSecretConfigured();

        const user = await User.create({
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            phoneNumber: phoneNumber.trim(),
            email: normalizedEmail,
            businessName: businessName.trim(),
            position: position.trim(),
            activity: activity.trim(),
            businessDescription: businessDescription.trim()
        });

        const { token, expiresIn } = createBearerToken(user._id);
        setAuthenticationCookie(res, token, expiresIn);

        return res.status(201).json({
            message: "Registration successful.",
            expiresIn
        });
    } catch (error) {
        if (error.code === "AUTH_TOKEN_SECRET_NOT_CONFIGURED") {
            return res.status(503).json({
                message: "Authentication is not configured on the server"
            });
        }

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
