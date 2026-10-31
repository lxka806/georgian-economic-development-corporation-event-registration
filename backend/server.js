const express = require("express")
const dotenv = require("dotenv")
const path = require("path")
dotenv.config({ path: path.join(__dirname, ".env") })
const mongoose = require("mongoose")

const PORT = process.env.PORT || 3000
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URL

const app = express()
const registerRoute = require("./router/registation.routes")
const verificationRoute = require("./router/verification.routes")
const sessionRoute = require("./router/session.routes")
const eventRoute = require("./router/event.route")
const selectionRoute = require("./router/selection.routes")
const adminRoute = require("./router/admin.routes")
const cors = require("cors");

const configuredOrigins = (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
const allowedOrigins = configuredOrigins.length > 0
    ? configuredOrigins
    : process.env.NODE_ENV === "production"
        ? []
        : ["http://localhost:5173", "http://127.0.0.1:5173"]

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true)
        }

        return callback(new Error("Origin is not allowed by CORS"))
    },
    credentials: true,
    optionsSuccessStatus: 204
}))

app.use(express.json())

app.use("/api/users", registerRoute)
app.use("/api/auth", verificationRoute)
app.use("/api/sessions", sessionRoute)
app.use("/api/events", eventRoute)
app.use("/api/registrations", selectionRoute)
app.use("/api/admin", adminRoute)

if (!MONGO_URI) {
    console.error("MONGO_URI is not configured")
    process.exitCode = 1
} else {
    mongoose.connect(MONGO_URI)
        .then(() => {
            console.log("MONGODB connected")

            app.listen(PORT, () => {
                console.log("server is running on port:", PORT)
            })
        })
        .catch((error) => {
            console.error("MONGODB connection failed:", error)
            process.exitCode = 1
        })
}