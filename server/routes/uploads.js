import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs"; // Add fs for directory check
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

/* Multer storage configuration */
const uploadsDir = path.resolve("./uploads");


// Ensure uploads directory exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (_req, file, cb) {
    const safeOriginal = file.originalname.replace(/\s+/g, "_");
    // Use UUID + time to avoid any collision
    const unique = `${Date.now()}-${crypto.randomUUID()}`;
    cb(null, `${unique}-${safeOriginal}`);
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow common file types
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|ppt|pptx|txt|zip|rar/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Loại file không được hỗ trợ'));
    }
  }
});

// Upload single file
// server/routes/uploads.js (your POST /api/uploads route)
router.post("/", authenticate, upload.single("file"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Không có file nào được tải lên" });
    }

    const baseUrl = `${req.protocol}://${req.get("host")}`;
    // If your API is mounted at /api, the static /uploads is still at host/uploads
    const publicUrl = `${baseUrl}/uploads/${req.file.filename}`;

    res.json({
      success: true,
      fileUrl: publicUrl,           // <— absolute URL
      fileName: req.file.originalname,
      fileSize: req.file.size,
      uploadedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(400).json({ error: error.message });
  }
});


// Upload multiple files
router.post("/multiple", authenticate, upload.array("files", 10), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "Không có file nào được tải lên" });
    }

    const files = req.files.map(file => ({
      path: `/uploads/${file.filename}`,
      filename: file.filename,
      originalName: file.originalname,
      size: file.size
    }));

    res.json({ 
      success: true,
      files
    });
  } catch (error) {
    console.error('Upload multiple error:', error);
    res.status(400).json({ error: error.message });
  }
});

export default router;
