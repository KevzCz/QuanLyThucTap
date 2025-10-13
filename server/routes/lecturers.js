import express from "express";
import { authenticate } from "../middleware/auth.js";
import Account from "../models/Account.js";
import SinhVien from "../models/SinhVien.js";
import GiangVien from "../models/GiangVien.js";

const router = express.Router();

// Get lecturer's managed students
router.get('/managed-students', authenticate, async (req, res) => {
  try {
    if (req.account.role !== 'giang-vien') {
      return res.status(403).json({ error: 'Chỉ giảng viên mới có thể truy cập' });
    }

    // Find the lecturer profile
    const lecturerProfile = await GiangVien.findOne({ account: req.account._id })
      .populate('account', 'id name email')
      .populate('internshipSubject', 'id title');

    if (!lecturerProfile) {
      // Return empty response instead of 404 - lecturer exists but not assigned
      return res.json({
        success: true,
        lecturer: null,
        students: []
      });
    }

    // Find all students supervised by this lecturer
    const students = await SinhVien.find({ supervisor: req.account._id })
      .populate('account', 'id name email')
      .populate('internshipSubject', 'id title')
      .lean();

    // Format the response to match frontend expectations
    const formattedStudents = students.map(student => ({
      id: student.account.id,
      name: student.account.name,
      email: student.account.email,
      status: student.internshipStatus || 'cho-xac-nhan',
      internshipSubject: student.internshipSubject ? {
        id: student.internshipSubject.id,
        title: student.internshipSubject.title
      } : undefined,
      studentClass: student.studentClass,
      year: student.year || new Date().getFullYear()
    }));

    const lecturer = {
      id: lecturerProfile.account.id,
      name: lecturerProfile.account.name,
      subjectId: lecturerProfile.internshipSubject?.id,
      subjectTitle: lecturerProfile.internshipSubject?.title
    };

    res.json({
      success: true,
      lecturer,
      students: formattedStudents
    });
  } catch (error) {
    console.error('Error getting managed students:', error);
    res.status(500).json({ 
      success: false,
      error: 'Lỗi server khi tải danh sách sinh viên' 
    });
  }
});

export default router;
