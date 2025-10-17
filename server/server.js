import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import path from "path";
import cookieParser from "cookie-parser";

// Import route modules
import authRoutes from "./routes/auth.js";
import accountRoutes from "./routes/accounts.js";
import uploadRoutes from "./routes/uploads.js";
import internshipSubjectRoutes from "./routes/internshipSubjects.js";
import lecturerRoutes from "./routes/lecturers.js";
import pageManagementRoutes from "./routes/pageManagement.js";
import studentRoutes from "./routes/students.js";
import requestRoutes from "./routes/requests.js";
const app = express();

/* Basic middlewares */
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

/* Static uploads */
const uploadsDir = path.resolve("./uploads");
app.use("/uploads", express.static(uploadsDir));
app.use("/api/students", studentRoutes);
/* MongoDB connection */
const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/QLTT";

console.log('Connecting to MongoDB...');

try {
  await mongoose.connect(uri, {
    dbName: 'QLTT'
  });
  console.log('✅ Connected to MongoDB - Database: QLTT');
  
  const collections = await mongoose.connection.db.listCollections().toArray();
  console.log('📋 Available collections:', collections.map(c => c.name));
} catch (error) {
  console.error('❌ MongoDB connection error:', error);
  process.exit(1);
}

/* Health check route */
app.get("/api/health", (_req, res) => {
  res.json({ 
    ok: true, 
    time: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

/* Route modules */
app.use("/api/auth", authRoutes);
app.use("/api/accounts", accountRoutes);
app.use("/api/internship-subjects", internshipSubjectRoutes);
app.use("/api/lecturers", lecturerRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/pages", pageManagementRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/requests", requestRoutes);

// Add the teacher-specific page routes from pages.js
import pagesRoutes from "./routes/pages.js";
app.use("/api/pages", pagesRoutes);

/* Legacy routes for backward compatibility */
const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    role: { type: String, enum: ["PDT", "BCN", "GV", "SV"], required: true },
    department: { type: String }
  },
  { timestamps: true }
);
const User = mongoose.model("User", UserSchema);

const InternshipCourseSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    department: { type: String, required: true },
    lecturers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    students: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
  },
  { timestamps: true }
);
const InternshipCourse = mongoose.model("InternshipCourse", InternshipCourseSchema);

app.post("/api/users", async (req, res) => {
  try {
    const created = await User.create(req.body);
    res.status(201).json(created);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/courses", async (_req, res) => {
  try {
    const data = await InternshipCourse.find().populate("lecturers").populate("students").lean();
    res.json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/* Error handling middleware */
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ 
    error: process.env.NODE_ENV === 'production' 
      ? 'Đã xảy ra lỗi máy chủ' 
      : error.message 
  });
});

/* Start server */
const port = Number(process.env.PORT || 3001);
app.listen(port, () => {
  console.log(`🚀 API server listening on http://localhost:${port}`);
  console.log(`📖 API documentation: http://localhost:${port}/api/health`);
});
