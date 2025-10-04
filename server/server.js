import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import path from "path";
import multer from "multer";

const app = express();

/* Basic middlewares */
app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

/* Static uploads */
const uploadsDir = path.resolve("./uploads");
app.use("/uploads", express.static(uploadsDir));

/* Multer storage (simple disk storage under /uploads) */
const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (_req, file, cb) {
    const safe = Date.now() + "-" + file.originalname.replace(/\s+/g, "_");
    cb(null, safe);
  }
});
const upload = multer({ storage });

/* MongoDB connection */
const uri = process.env.MONGODB_URI || "";
await mongoose.connect(uri);

/* Example models */
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

/* Routes: apis for your web app */
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

app.post("/api/uploads", upload.single("file"), (req, res) => {
  res.json({ path: `/uploads/${req.file?.filename}` });
});

app.post("/api/users", async (req, res) => {
  const created = await User.create(req.body);
  res.status(201).json(created);
});

app.get("/api/courses", async (_req, res) => {
  const data = await InternshipCourse.find().populate("lecturers").populate("students").lean();
  res.json(data);
});

/* Start server */
const port = Number(process.env.PORT || 3001);
app.listen(port, () => {
  /* eslint-disable no-console */
  console.log(`API listening on http://localhost:${port}`);
});
