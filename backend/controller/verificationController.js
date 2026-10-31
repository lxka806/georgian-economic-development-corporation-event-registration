
const crypto = require("crypto");
const User = require("../models/User");
const { sendVerificationEmail } = require("../conf/mailer");
const {
    assertTokenSecretConfigured,
    createBearerToken,
    setAuthenticationCookie
} = require("../middleware/authentication");

const RESEND_WINDOW_MS = 15 * 60 * 1000;
const RESEND_LIMIT = 5;
const resendRequestsByIp = new Map();
const VERIFY_LIMIT = 10;
const verifyRequestsByIp = new Map();

const isRateLimited = (requestsByIp, ipAddress, limit) => {
    const now = Date.now();
    const recentRequests = (requestsByIp.get(ipAddress) || [])
        .filter((timestamp) => now - timestamp < RESEND_WINDOW_MS);

    if (recentRequests.length >= limit) {
        requestsByIp.set(ipAddress, recentRequests);
        return true;
    }

    recentRequests.push(now);
    requestsByIp.set(ipAddress, recentRequests);

    for (const [ip, timestamps] of requestsByIp) {
        if (timestamps.every((timestamp) => now - timestamp >= RESEND_WINDOW_MS)) {
            requestsByIp.delete(ip);
        }
    }

    return false;
};

const verifyEmail = async (req, res) => {
    if (isRateLimited(verifyRequestsByIp, req.ip || "unknown", VERIFY_LIMIT)) {
        return res.status(429).json({
            message: "Too many verification attempts. Please try again later."
        });
    }

    try {
        const code = req.body && req.body.code;

        if (typeof code !== "string" || !/^\d{8}$/.test(code)) {
            return res.status(400).json({
                message: "Enter the 8-digit verification code from your email"
            });
        }

        assertTokenSecretConfigured();

        const hashedToken = crypto
            .createHash("sha256")
            .update(code)
            .digest("hex");

        const now = new Date();
        const user = await User.findOneAndUpdate(
            {
                emailVerificationToken: hashedToken,
                emailVerificationExpires: { $gt: now }
            },
            {
                $set: {
                    isEmailVerified: true,
                    emailVerificationToken: null,
                    emailVerificationExpires: null
                }
            },
            { new: true }
        );

        if (!user) {
            const expiredUser = await User.findOne({
                emailVerificationToken: hashedToken
            }).select("emailVerificationExpires");

            if (expiredUser && (!expiredUser.emailVerificationExpires ||
                expiredUser.emailVerificationExpires <= now)) {
                return res.status(410).json({
                    message: "This verification code has expired. Request a new verification code."
                });
            }

            return res.status(400).json({
                message: "This verification code is invalid or has already been used"
            });
        }
        const { token, expiresIn } = createBearerToken(user._id);
        setAuthenticationCookie(res, token, expiresIn);
        return res.status(200).json({
            message: "Email verified successfully.",
            expiresIn
        });
    } catch (error) {
        if (error.code === "AUTH_TOKEN_SECRET_NOT_CONFIGURED") {
            return res.status(503).json({
                message: "Authentication is not configured on the server"
            });
        }

        console.error("Email verification error:", error);

        return res.status(500).json({
            message: "Server error"
        });
    }
};

const resendVerificationEmail = async (req, res) => {
    if (isRateLimited(resendRequestsByIp, req.ip || "unknown", RESEND_LIMIT)) {
        return res.status(429).json({
            message: "Too many requests. Please try again later."
        });
    }

    const genericResponse = {
        message: "If an account exists for that email address, a verification email will be sent shortly."
    };

    try {
        const email = req.body && req.body.email;
        if (typeof email !== "string" ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            return res.status(200).json(genericResponse);
        }

        const user = await User.findOne({ email: email.trim().toLowerCase() });

        if (user) {
            const verificationCode = crypto.randomInt(10000000, 100000000).toString();
            user.emailVerificationToken = crypto
                .createHash("sha256")
                .update(verificationCode)
                .digest("hex");
            user.emailVerificationExpires = new Date(Date.now() + 15 * 60 * 1000);
            await user.save();

            try {
                await sendVerificationEmail(user, verificationCode);
            } catch (emailError) {
                console.error("Verification email delivery failed:", {
                    code: emailError.code || "EMAIL_CONFIGURATION_ERROR",
                    responseCode: emailError.responseCode || null,
                    command: emailError.command || null
                });
            }
        }

        return res.status(200).json(genericResponse);
    } catch (error) {
        console.error("Verification email resend failed.");
        return res.status(200).json(genericResponse);
    }
};

module.exports = { verifyEmail, resendVerificationEmail };
