import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

// Import routes
import authRoutes from "./routes/auth.js";
import internshipSubjectRoutes from "./routes/internshipSubjects.js";
import pageRoutes from "./routes/pageManagement.js";
import lecturerRoutes from "./routes/lecturers.js";
import studentRoutes from "./routes/students.js";
import studentsRouter from './routes/students.js';
import uploadRoutes from "./routes/uploads.js";
import chatRoutes from "./routes/chat.js";
import gradeRoutes from "./routes/grades.js";

dotenv.config();

const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true
}));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/accounts", authRoutes); // Account management routes
app.use("/api/internship-subjects", internshipSubjectRoutes);
app.use("/api/pages", pageRoutes); // Page management routes (main)
app.use("/api/lecturers", lecturerRoutes);
app.use("/api/students", studentRoutes);
app.use('/api/students', studentsRouter);
app.use("/api/uploads", uploadRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/grades", gradeRoutes);

// Static uploads - fix the undefined uploadsDir
const uploadsDir = path.resolve("./uploads");
app.use(
  "/uploads",
  express.static(uploadsDir, {
    // If you see CORP/CORS issues when opening in new tab:
    setHeaders: (res) => {
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    },
  })
);
// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/qltt")
  .then(() => console.log("Connected to MongoDB"))
  .catch(err => console.error("MongoDB connection error:", err));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;