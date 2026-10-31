
const express = require("express");
const {
    verifyEmail,
    resendVerificationEmail
} = require("../controller/verificationController");

const router = express.Router();

router.post("/verify-email", verifyEmail);
router.post("/resend-verification", resendVerificationEmail);

module.exports = router;
