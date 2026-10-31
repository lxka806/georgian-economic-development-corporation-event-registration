
const nodemailer = require("nodemailer");

console.log("EMAIL_USER configured:", Boolean(process.env.EMAIL_USER));
console.log("EMAIL_PASS configured:", Boolean(process.env.EMAIL_PASS));

const createTransporter = () => {
    const user = process.env.EMAIL_USER;
    const configuredPassword = process.env.EMAIL_PASS;

    if (!user || !configuredPassword) {
        throw new Error("EMAIL_USER and EMAIL_PASS must be configured");
    }

    const host = process.env.SMTP_HOST || "smtp.gmail.com";
    const port = Number(process.env.SMTP_PORT || 587);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error("SMTP_PORT must be a valid port number");
    }

    const secure = process.env.SMTP_SECURE
        ? process.env.SMTP_SECURE.toLowerCase() === "true"
        : port === 465;
    const password = host.toLowerCase() === "smtp.gmail.com"
        ? configuredPassword.replace(/\s/g, "")
        : configuredPassword.trim();

    return nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass: password }
    });
};

const escapeHtml = (value) => value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const sendVerificationEmail = async (user, code) => {
    if (typeof code !== "string" || !/^\d{8}$/.test(code)) {
        throw new Error("Verification code must contain exactly 8 digits");
    }

    const safeFirstName = escapeHtml(user.firstName);

    const transporter = createTransporter();
    await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: "Your email verification code",
        text: `Hello ${user.firstName},

Your email verification code is: ${code}

Enter this code on the email verification page. It expires in 15 minutes.
If you did not request an account, you can ignore this email.`,
        html: `
            <div style="font-family:Arial,sans-serif;line-height:1.6;color:#222;max-width:600px;margin:0 auto;padding:24px;">
                <h1 style="font-size:24px;">Your email verification code</h1>
                <p>Hello ${safeFirstName},</p>
                <p>Enter this code on the email verification page to confirm your email address:</p>
                <p style="font-size:32px;font-weight:bold;letter-spacing:8px;padding:12px 16px;background:#f3f4f6;display:inline-block;border-radius:6px;">${code}</p>
                <p>This code expires in 15 minutes.</p>
                <p>If you did not request an account, you can ignore this email; no further action is needed.</p>
            </div>
        `
    });
};

module.exports = { sendVerificationEmail };
