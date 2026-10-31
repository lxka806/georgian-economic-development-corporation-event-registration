const express = require("express");
const {
    getAllSessions,
    getSessionById,
    getSessionEvents
} = require("../controller/session.controller");

const route = express.Router();

route.get("/", getAllSessions);
route.get("/:id/events", getSessionEvents);
route.get("/:id", getSessionById);

module.exports = route;