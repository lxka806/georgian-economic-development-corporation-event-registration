const express = require("express");
const {
    getMySelections,
    saveSelections
} = require("../controller/selection.controller");
const {
    authenticate,
    requireVerifiedEmail
} = require("../middleware/authentication");

const router = express.Router();

router.post("/selections", authenticate, requireVerifiedEmail, saveSelections);
router.get("/selections/me", authenticate, requireVerifiedEmail, getMySelections);

module.exports = router;
