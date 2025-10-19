import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
}));
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());


import userRouter from "./routes/user.routes.js";
import complaintRouter from "./routes/complaint.routes.js";
import incidentRouter from "./routes/incident.routes.js";
import escalationRouter from "./routes/escalation.routes.js";
import departmentRouter from "./routes/department.routes.js";
import feedbackRouter from "./routes/feedback.routes.js";
import evidenceRouter from "./routes/evidence.routes.js";
import railRouter from "./routes/rail.routes.js";
import historyRouter from "./routes/history.routes.js";
import analyticsRouter from "./routes/analytics.routes.js";
import { initRailSchema } from "./services/rail.service.js";
import http from "http";
import { Server } from "socket.io";

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: process.env.CORS_ORIGIN,
        credentials: true,
    }
})

io.on("connection", (socket) => {
    console.log("A user connected: ", socket.id);

    socket.on("disconnect", () => {
        console.log("A user disconnected", socket.id);
    });
});

(async function initializeServices() {
    try {
        await initRailSchema();
        console.log("Rail schema initialized successfully.");
    } catch (error) {
        console.error("Error initializing rail schema:", error);
    }
})();

app.use("/api/v1/users", userRouter);
app.use("/api/v1/complaints", complaintRouter);
app.use("/api/v1/incidents", incidentRouter);
app.use("/api/v1/escalations", escalationRouter);
app.use("/api/v1/departments", departmentRouter);
app.use("/api/v1/feedbacks", feedbackRouter);
app.use("/api/v1/evidences", evidenceRouter);
app.use("/api/v1/rail", railRouter);
app.use("/api/v1/history", historyRouter);
app.use("/api/v1/analytics", analyticsRouter);


import { errorHandler } from "./middlewares/error.middlewares.js";
app.use(errorHandler);

export { app, server, io };
