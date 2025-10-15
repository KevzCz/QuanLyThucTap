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

// Get student's assigned instructor (alternative route)
router.get('/assigned-instructor', authSV, async (req, res) => {
  try {
    console.log("Getting assigned instructor for student:", req.account.id);
    
    // Find the student profile
    const student = await SinhVien.findOne({ account: req.account._id })
      .populate('internshipSubject', 'id title')
      .lean();

    console.log("Found student profile:", student ? "Yes" : "No");
    console.log("Student supervisor:", student?.supervisor);

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
    // First find the GiangVien profile, then get their account
    const supervisor = await GiangVien.findById(student.supervisor)
      .populate('account', 'id name email')
      .lean();

    console.log("Found supervisor profile:", supervisor ? "Yes" : "No");

    if (!supervisor || !supervisor.account) {
      // If supervisor ObjectId doesn't match a GiangVien, it might be an Account ObjectId directly
      const supervisorAccount = await Account.findById(student.supervisor)
        .select('id name email role')
        .lean();

      console.log("Found supervisor account directly:", supervisorAccount ? "Yes" : "No");

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
      error: 'Internal server error: ' + error.message
    });
  }
});

export default router;
