import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import mongoose from "mongoose";
import dotenv from "dotenv";
import socketHandler from "./socket.js";
import Poll from "./models/Poll.js";
import Response from "./models/Response.js";

// service layer
import {
    getActivePoll,
    computeResults,
} from "./services/PollService.js";

dotenv.config();

const app = express();
const server = http.createServer(app);

// Enable CORS for frontend access
app.use(cors());
app.use(express.json());

// Create the Socket.IO server
const io = new Server(server, {
    cors: {
        origin: "*", // You can restrict this to your frontend domain in production
        methods: ["GET", "POST"]
    }
});

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log("MongoDB connected successfully"))
    .catch((err) => console.error("MongoDB connection error:", err));

// Socket.IO logic
io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);
    socketHandler(socket, io);
});

// regularly broadcast timer updates and finalize polls
let lastPollId = null;
setInterval(async () => {
    try {
        const active = await getActivePoll();
        if (active) {
            const { poll, remaining } = active;
            // if this is the first time we've noticed this poll, emit start
            if (poll._id.toString() !== lastPollId) {
                io.emit("poll-started", { poll, remaining });
                lastPollId = poll._id.toString();
            }
            io.emit("timer", { remaining });

            if (remaining <= 0) {
                // compute final results and broadcast
                const result = await computeResults(poll._id);
                io.emit("poll-results", result);
                // let teacher know it's okay to start a new poll
                io.emit("poll-status", { canAskNew: true });
                lastPollId = null;
            }
        } else {
            lastPollId = null;
        }
    } catch (err) {
        console.error("Error in poll monitor:", err);
    }
}, 1000);

// Basic test route
app.get("/", (req, res) => {
    res.send("Polling server is running.");
});

// REST endpoints are handled by controller to keep index clean
import { httpGetCurrent, httpGetHistory } from "./controllers/PollController.js";

app.get("/api/polls/current", httpGetCurrent);
app.get("/api/polls/history", httpGetHistory);


// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
