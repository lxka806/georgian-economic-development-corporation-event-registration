const express = require("express");
const {
    getMySelections,
    saveSelections
} = require("../controller/selection.controller");
const { authenticate } = require("../middleware/authentication");

const router = express.Router();

router.post("/selections", authenticate, saveSelections);
router.get("/selections/me", authenticate, getMySelections);

module.exports = router;
