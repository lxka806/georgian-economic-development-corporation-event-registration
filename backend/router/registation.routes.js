
const express = require("express");
const { registerUser } = require("../controller/registration.controller");

const router = express.Router();

router.post("/register", registerUser);

module.exports = router;
