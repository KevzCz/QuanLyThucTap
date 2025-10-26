import express from "express";
import { authenticate, authorize, authSV } from "../middleware/auth.js";
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
    // Find the student's profile
    const student = await SinhVien.findOne({ account: req.account._id })
      .populate('internshipSubject', 'id title')
      .lean();

    if (!student) {
      return res.json({
        success: true,
        instructor: null,
        subject: null,
        message: "Không tìm thấy hồ sơ sinh viên"
      });
    }

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

    res.json({
      success: true,
      instructor: null,
      subject: student.internshipSubject ? {
        id: student.internshipSubject.id,
        title: student.internshipSubject.title
      } : null,
      message: "Chưa được phân công giảng viên hướng dẫn"
    });

  } catch (error) {
    console.error("Get student instructor error:", error);
    res.status(500).json({ 
      success: false, 
      error: "Lỗi server",
      details: error.message 
    });
  }
});

// Get student's assigned instructor (alternative route)
router.get('/assigned-instructor', authSV, async (req, res) => {
  try {
    // Find the student profile
    const student = await SinhVien.findOne({ account: req.account._id })
      .populate('internshipSubject', 'id title')
      .lean();

    if (!student) {
      return res.json({
        success: true,
        instructor: null,
        subject: null
      });
    }

    if (!student.supervisor) {
      return res.json({
        success: true,
        instructor: null,
        subject: student.internshipSubject ? {
          id: student.internshipSubject.id,
          title: student.internshipSubject.title
        } : null
      });
    }

    // Get the supervisor's account details
    const supervisor = await GiangVien.findById(student.supervisor)
      .populate('account', 'id name email')
      .lean();

    if (!supervisor || !supervisor.account) {
      // If supervisor ObjectId doesn't match a GiangVien, it might be an Account ObjectId directly
      const supervisorAccount = await Account.findById(student.supervisor)
        .select('id name email role')
        .lean();

      if (supervisorAccount && supervisorAccount.role === 'giang-vien') {
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

      return res.json({
        success: true,
        instructor: null,
        subject: student.internshipSubject ? {
          id: student.internshipSubject.id,
          title: student.internshipSubject.title
        } : null
      });
    }

    res.json({
      success: true,
      instructor: {
        id: supervisor.account.id,
        name: supervisor.account.name,
        email: supervisor.account.email
      },
      subject: student.internshipSubject ? {
        id: student.internshipSubject.id,
        title: student.internshipSubject.title
      } : null
    });

  } catch (error) {
    console.error('Error getting student assigned instructor:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Lỗi server: ' + error.message
    });
  }
});

export default router;
