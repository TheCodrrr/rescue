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


app.use("/api/v1/users", userRouter);
app.use("/api/v1/complaints", complaintRouter);
app.use("/api/v1/incidents", incidentRouter);
app.use("/api/v1/escalations", escalationRouter);
app.use("/api/v1/departments", departmentRouter);
app.use("/api/v1/feedbacks", feedbackRouter);
app.use("/api/v1/evidences", evidenceRouter);


import { errorHandler } from "./middlewares/error.middlewares.js";
app.use(errorHandler);

export { app };
