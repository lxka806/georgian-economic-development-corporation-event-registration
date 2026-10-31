const crypto = require("crypto");
const mongoose = require("mongoose");
const User = require("../models/User");

const TOKEN_LIFETIME_SECONDS = 7 * 24 * 60 * 60;
const AUTH_COOKIE_NAME = "selection_auth";
const AUTH_COOKIE_PATH = "/api";
const ADMIN_COOKIE_NAME = "admin_dashboard";
const ADMIN_COOKIE_PATH = "/api/admin";
const ADMIN_TOKEN_LIFETIME_SECONDS = 8 * 60 * 60;

const getTokenSecret = () => {
    const secret = process.env.AUTH_TOKEN_SECRET;
    if (typeof secret !== "string" || Buffer.byteLength(secret, "utf8") < 32) {
        const error = new Error("AUTH_TOKEN_SECRET must contain at least 32 bytes");
        error.code = "AUTH_TOKEN_SECRET_NOT_CONFIGURED";
        throw error;
    }

    return secret;
};

const assertTokenSecretConfigured = () => {
    getTokenSecret();
};

const createBearerToken = (userId) => {
    const now = Math.floor(Date.now() / 1000);
    const payload = Buffer.from(JSON.stringify({
        sub: userId.toString(),
        iat: now,
        exp: now + TOKEN_LIFETIME_SECONDS
    })).toString("base64url");
    const signature = crypto
        .createHmac("sha256", getTokenSecret())
        .update(payload)
        .digest("base64url");

    return {
        token: `${payload}.${signature}`,
        expiresIn: TOKEN_LIFETIME_SECONDS
    };
};

const setAuthenticationCookie = (res, token, expiresIn) => {
    res.clearCookie(AUTH_COOKIE_NAME, { path: "/api/registrations" });
    const secure = process.env.NODE_ENV === "production";
    res.cookie(AUTH_COOKIE_NAME, token, {
        httpOnly: true,
        secure,
        sameSite: secure ? "none" : "lax",
        path: AUTH_COOKIE_PATH,
        maxAge: expiresIn * 1000
    });
};

const createAdminToken = () => {
    const now = Math.floor(Date.now() / 1000);
    const payload = Buffer.from(JSON.stringify({
        sub: "admin",
        role: "admin",
        iat: now,
        exp: now + ADMIN_TOKEN_LIFETIME_SECONDS
    })).toString("base64url");
    const signature = crypto
        .createHmac("sha256", getTokenSecret())
        .update(payload)
        .digest("base64url");

    return {
        token: `${payload}.${signature}`,
        expiresIn: ADMIN_TOKEN_LIFETIME_SECONDS
    };
};

const setAdminCookie = (res, token, expiresIn) => {
    const secure = process.env.NODE_ENV === "production";
    res.cookie(ADMIN_COOKIE_NAME, token, {
        httpOnly: true,
        secure,
        sameSite: secure ? "none" : "lax",
        path: ADMIN_COOKIE_PATH,
        maxAge: expiresIn * 1000
    });
};

const clearAdminCookie = (res) => {
    const secure = process.env.NODE_ENV === "production";
    res.clearCookie(ADMIN_COOKIE_NAME, {
        httpOnly: true,
        secure,
        sameSite: secure ? "none" : "lax",
        path: ADMIN_COOKIE_PATH
    });
};

const getCookieToken = (cookieHeader) => {
    if (typeof cookieHeader !== "string") {
        return null;
    }

    const cookie = cookieHeader.split(";")
        .map((part) => part.trim())
        .find((part) => part.startsWith(`${AUTH_COOKIE_NAME}=`));

    return cookie ? cookie.slice(AUTH_COOKIE_NAME.length + 1) : null;
};

const authenticate = async (req, res, next) => {
    let secret;
    try {
        secret = getTokenSecret();
    } catch (error) {
        return res.status(503).json({
            message: "Authentication is not configured on the server"
        });
    }

    const authorization = req.get("authorization") || "";
    const bearerMatch = authorization.match(/^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/);
    const token = bearerMatch ? bearerMatch[1] : getCookieToken(req.headers.cookie);
    if (!token || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)) {
        return res.status(401).json({
            message: "Authentication required. Register first to receive an authentication cookie."
        });
    }

    try {
        const [payloadPart, signaturePart] = token.split(".");
        const expectedSignature = crypto
            .createHmac("sha256", secret)
            .update(payloadPart)
            .digest();
        const actualSignature = Buffer.from(signaturePart, "base64url");

        if (actualSignature.length !== expectedSignature.length ||
            !crypto.timingSafeEqual(actualSignature, expectedSignature)) {
            return res.status(401).json({ message: "Invalid or expired bearer token" });
        }

        const payload = JSON.parse(Buffer.from(payloadPart, "base64url").toString("utf8"));
        if (typeof payload.sub !== "string" ||
            !/^[a-f\d]{24}$/i.test(payload.sub) ||
            !Number.isInteger(payload.exp) ||
            payload.exp <= Math.floor(Date.now() / 1000)) {
            return res.status(401).json({ message: "Invalid or expired bearer token" });
        }

        const user = await User.findById(new mongoose.Types.ObjectId(payload.sub))
            .select("_id sessions");
        if (!user) {
            return res.status(401).json({ message: "Invalid or expired bearer token" });
        }

        req.user = user;
        return next();
    } catch (error) {
        console.error("Authentication request failed:", error.message);
        return res.status(500).json({ message: "Unable to authenticate request" });
    }
};

const authenticateAdmin = (req, res, next) => {
    let secret;
    try {
        secret = getTokenSecret();
    } catch (error) {
        return res.status(503).json({
            message: "Admin authentication is not configured on the server"
        });
    }

    const cookieHeader = req.headers.cookie || "";
    const token = cookieHeader.split(";")
        .map((part) => part.trim())
        .find((part) => part.startsWith(`${ADMIN_COOKIE_NAME}=`))
        ?.slice(ADMIN_COOKIE_NAME.length + 1);
    if (!token || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)) {
        return res.status(401).json({ message: "Admin authentication required" });
    }

    try {
        const [payloadPart, signaturePart] = token.split(".");
        const expectedSignature = crypto
            .createHmac("sha256", secret)
            .update(payloadPart)
            .digest();
        const actualSignature = Buffer.from(signaturePart, "base64url");

        if (actualSignature.length !== expectedSignature.length ||
            !crypto.timingSafeEqual(actualSignature, expectedSignature)) {
            return res.status(401).json({ message: "Admin session is invalid or expired" });
        }

        const payload = JSON.parse(Buffer.from(payloadPart, "base64url").toString("utf8"));
        if (payload.sub !== "admin" ||
            payload.role !== "admin" ||
            !Number.isInteger(payload.exp) ||
            payload.exp <= Math.floor(Date.now() / 1000)) {
            return res.status(401).json({ message: "Admin session is invalid or expired" });
        }

        req.admin = true;
        return next();
    } catch (error) {
        console.error("Admin authentication failed:", error.message);
        return res.status(401).json({ message: "Admin session is invalid or expired" });
    }
};

module.exports = {
    authenticate,
    authenticateAdmin,
    assertTokenSecretConfigured,
    createBearerToken,
    createAdminToken,
    setAuthenticationCookie,
    setAdminCookie,
    clearAdminCookie
};
