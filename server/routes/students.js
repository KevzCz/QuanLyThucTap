import express from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import SinhVien from "../models/SinhVien.js";
import GiangVien from "../models/GiangVien.js";
import Account from "../models/Account.js";

const router = express.Router();

// Test endpoint to verify the route is working
router.get("/test", (req, res) => {
  res.json({ success: true, message: "Students route is working" });
});

// Get student's assigned instructor
router.get("/my-instructor", authenticate, authorize(["sinh-vien"]), async (req, res) => {
  try {
    console.log("Student my-instructor endpoint hit by:", req.account.email);
    
    // Find the student's profile
    const student = await SinhVien.findOne({ account: req.account._id })
      .populate('internshipSubject', 'id title')
      .lean();

    console.log("Found student:", student ? "Yes" : "No");

    if (!student) {
      return res.json({
        success: true,
        instructor: null,
        subject: null,
        message: "Student profile not found"
      });
    }

    console.log("Student has supervisor:", student.supervisor ? "Yes" : "No");

    // If student has a supervisor, get their account info
    if (student.supervisor) {
      const supervisorAccount = await Account.findById(student.supervisor)
        .select('id name email')
        .lean();

      if (supervisorAccount) {
        return res.json({
          success: true,
          instructor: {
            id: supervisorAccount.id,
            name: supervisorAccount.name,
            email: supervisorAccount.email
          },
          subject: student.internshipSubject ? {
            id: student.internshipSubject.id,
            title: student.internshipSubject.title
          } : null
        });
      }
    }

    // No assigned supervisor
    res.json({
      success: true,
      instructor: null,
      subject: student.internshipSubject ? {
        id: student.internshipSubject.id,
        title: student.internshipSubject.title
      } : null,
      message: "No supervisor assigned"
    });

  } catch (error) {
    console.error("Get student instructor error:", error);
    res.status(500).json({ 
      success: false, 
      error: "Internal server error",
      details: error.message 
    });
  }
});

export default router;
