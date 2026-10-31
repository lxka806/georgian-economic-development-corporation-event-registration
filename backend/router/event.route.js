const express = require("express")


const route = express.Router()

const {
    getAllEvents
} = require("../controller/event.controller")

route.get("/", getAllEvents)


module.exports = route