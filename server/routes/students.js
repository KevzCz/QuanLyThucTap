import express from "express";
import { authenticate, authorize, authSV } from "../middleware/auth.js";
import SinhVien from "../models/SinhVien.js";
import GiangVien from "../models/GiangVien.js";
import Account from "../models/Account.js";
import BanChuNhiem from "../models/BanChuNhiem.js";

const router = express.Router();

// Test endpoint to verify the route is working
router.get("/test", (req, res) => {
  res.json({ success: true, message: "Students route is working" });
});

// Get all students (BCN sees only their khoa, PDT sees all)
router.get("/", authenticate, authorize(["ban-chu-nhiem", "phong-dao-tao"]), async (req, res) => {
  try {
    let students;

    if (req.account.role === "ban-chu-nhiem") {
      // Find BCN's khoa
      const bcn = await BanChuNhiem.findOne({ account: req.account._id }).lean();
      
      if (!bcn) {
        return res.status(404).json({
          success: false,
          error: "Không tìm thấy thông tin ban chủ nhiệm"
        });
      }

      // Get students from this khoa
      students = await SinhVien.find({ khoa: bcn.khoa })
        .populate('account', 'id name email status')
        .populate('supervisor', 'account')
        .lean();
    } else {
      // PDT can see all students
      students = await SinhVien.find()
        .populate('account', 'id name email status')
        .populate('supervisor', 'account')
        .lean();
    }

    res.json({
      success: true,
      students: students.map(s => ({
        _id: s._id,
        id: s.id,
        name: s.account?.name,
        email: s.account?.email,
        khoa: s.khoa,
        status: s.account?.status,
        supervisor: s.supervisor
      }))
    });

  } catch (error) {
    console.error("Get students error:", error);
    res.status(500).json({ 
      success: false, 
      error: "Lỗi server",
      details: error.message 
    });
  }
});

// Get student's assigned instructor
router.get("/my-instructor", authenticate, authorize(["sinh-vien"]), async (req, res) => {
  try {
    // Find the student's profile
    const student = await SinhVien.findOne({ account: req.account._id })
      .lean();

    if (!student) {
      return res.json({
        success: true,
        instructor: null,
        khoa: null,
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
          khoa: student.khoa || null
        });
      }
    }

    res.json({
      success: true,
      instructor: null,
      khoa: student.khoa || null,
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
      .lean();

    if (!student) {
      return res.json({
        success: true,
        instructor: null,
        khoa: null
      });
    }

    if (!student.supervisor) {
      return res.json({
        success: true,
        instructor: null,
        khoa: student.khoa || null
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
          khoa: student.khoa || null
        });
      }

      return res.json({
        success: true,
        instructor: null,
        khoa: student.khoa || null
      });
    }

    res.json({
      success: true,
      instructor: {
        id: supervisor.account.id,
        name: supervisor.account.name,
        email: supervisor.account.email
      },
      khoa: student.khoa || null
    });

  } catch (error) {
    console.error('Error getting student assigned instructor:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Lỗi server: ' + error.message
    });
  }
});

// Get available students for BCN's khoa (students without supervisor)
router.get("/available", authenticate, authorize(["ban-chu-nhiem"]), async (req, res) => {
  try {
    const bcn = await BanChuNhiem.findOne({ account: req.account._id }).lean();
    
    if (!bcn) {
      return res.status(404).json({
        success: false,
        error: "Không tìm thấy thông tin ban chủ nhiệm"
      });
    }

    // Get all students in this khoa without a supervisor
    const students = await SinhVien.find({ 
      khoa: bcn.khoa,
      $or: [
        { supervisor: { $exists: false } },
        { supervisor: null }
      ]
    })
      .populate('account', 'id name email status')
      .lean();

    const availableStudents = students
      .filter(s => s.account?.status === 'open')
      .map(s => ({
        id: s.account.id,
        name: s.account.name,
        email: s.account.email
      }));

    res.json({ success: true, students: availableStudents });
  } catch (error) {
    console.error("Get available students error:", error);
    res.status(500).json({ 
      success: false, 
      error: 'Lỗi server: ' + error.message
    });
  }
});

// Update student's supervisor (BCN only)
router.put("/:studentId/supervisor", authenticate, authorize(["ban-chu-nhiem"]), async (req, res) => {
  try {
    const { studentId } = req.params;
    const { supervisorId } = req.body;

    const bcn = await BanChuNhiem.findOne({ account: req.account._id }).lean();
    
    if (!bcn) {
      return res.status(404).json({
        success: false,
        error: "Không tìm thấy thông tin ban chủ nhiệm"
      });
    }

    // Find student by account ID
    const studentAccount = await Account.findOne({ id: studentId, role: 'sinh-vien' });
    if (!studentAccount) {
      return res.status(404).json({
        success: false,
        error: "Không tìm thấy sinh viên"
      });
    }

    const student = await SinhVien.findOne({ account: studentAccount._id });
    if (!student) {
      return res.status(404).json({
        success: false,
        error: "Không tìm thấy hồ sơ sinh viên"
      });
    }

    // Verify student is in BCN's khoa
    if (student.khoa !== bcn.khoa) {
      return res.status(403).json({
        success: false,
        error: "Sinh viên không thuộc khoa của bạn"
      });
    }

    // If supervisorId is provided, verify the lecturer
    if (supervisorId) {
      const lecturerAccount = await Account.findOne({ id: supervisorId, role: 'giang-vien' });
      if (!lecturerAccount) {
        return res.status(404).json({
          success: false,
          error: "Không tìm thấy giảng viên"
        });
      }

      const lecturer = await GiangVien.findOne({ account: lecturerAccount._id });
      if (!lecturer) {
        return res.status(404).json({
          success: false,
          error: "Không tìm thấy hồ sơ giảng viên"
        });
      }

      // Verify lecturer is in the same khoa
      if (lecturer.khoa !== bcn.khoa) {
        return res.status(403).json({
          success: false,
          error: "Giảng viên không thuộc khoa của bạn"
        });
      }

      // Check if lecturer has reached max students
      if (lecturer.maxStudents && lecturer.maxStudents > 0) {
        const currentStudentCount = await SinhVien.countDocuments({ supervisor: lecturerAccount._id });
        if (currentStudentCount >= lecturer.maxStudents) {
          return res.status(400).json({
            success: false,
            error: `Giảng viên đã đạt giới hạn số sinh viên hướng dẫn (${lecturer.maxStudents})`
          });
        }
      }

      // Remove student from old supervisor's managedStudents if they had one
      if (student.supervisor) {
        await GiangVien.updateOne(
          { account: student.supervisor },
          { $pull: { managedStudents: studentAccount._id } }
        );
      }

      // Update student's supervisor and status
      student.supervisor = lecturerAccount._id;
      student.internshipStatus = 'duoc-huong-dan';
      
      // Add student to new supervisor's managedStudents
      await GiangVien.updateOne(
        { account: lecturerAccount._id },
        { $addToSet: { managedStudents: studentAccount._id } }
      );
    } else {
      // Remove student from supervisor's managedStudents if they have one
      if (student.supervisor) {
        await GiangVien.updateOne(
          { account: student.supervisor },
          { $pull: { managedStudents: studentAccount._id } }
        );
      }
      
      // Remove supervisor and update status
      student.supervisor = undefined;
      student.internshipStatus = 'chua-duoc-huong-dan';
    }

    await student.save();

    res.json({ 
      success: true, 
      message: supervisorId ? "Đã cập nhật giảng viên hướng dẫn" : "Đã xóa giảng viên hướng dẫn"
    });
  } catch (error) {
    console.error("Update student supervisor error:", error);
    res.status(500).json({ 
      success: false, 
      error: 'Lỗi server: ' + error.message
    });
  }
});

export default router;
