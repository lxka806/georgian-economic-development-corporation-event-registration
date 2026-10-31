const express = require("express")
const dotenv = require("dotenv")
const path = require("path")
dotenv.config({ path: path.join(__dirname, ".env") })
const mongoose = require("mongoose")

const PORT = process.env.PORT || 3000
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URL

const app = express()
const registerRoute = require("./router/registation.routes")
const sessionRoute = require("./router/session.routes")
const eventRoute = require("./router/event.route")
const selectionRoute = require("./router/selection.routes")
const adminRoute = require("./router/admin.routes")
const cors = require("cors");

const allowedOrigins = (process.env.CORS_ORIGINS || "")
    .split(",")
    .map(origin => origin.trim())
    .filter(Boolean);

const corsOptions = {
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        return callback(new Error("Not allowed by CORS"));
    },
    credentials: false,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
};


app.use(cors(corsOptions))

app.use(express.json())

app.use("/api/users", registerRoute)
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