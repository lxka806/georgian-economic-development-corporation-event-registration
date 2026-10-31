const express = require("express");
const {
    adminLogin,
    adminLogout,
    adminSession,
    getAdminDashboard,
    getPublicAdminSummary,
    setSessionOrder,
    setSessionRequired
} = require("../controller/admin.controller");
const { authenticateAdmin } = require("../middleware/authentication");

const router = express.Router();

router.get("/summary", getPublicAdminSummary);
router.post("/session", adminLogin);
router.get("/session", authenticateAdmin, adminSession);
router.delete("/session", authenticateAdmin, adminLogout);
router.get("/dashboard", authenticateAdmin, getAdminDashboard);
router.patch("/sessions/:id/required", authenticateAdmin, setSessionRequired);
router.patch("/sessions/:id/order", authenticateAdmin, setSessionOrder);

module.exports = router;
