import express from "express";
import { authenticate } from "../middleware/auth.js";
import Account from "../models/Account.js";
import SinhVien from "../models/SinhVien.js";
import GiangVien from "../models/GiangVien.js";
import HocKy from "../models/HocKy.js";

const router = express.Router();

// Get available lecturers for students to request
router.get('/available', authenticate, async (req, res) => {
  try {
    if (req.account.role !== 'sinh-vien') {
      return res.status(403).json({ error: 'Chỉ sinh viên mới có thể truy cập' });
    }

    // Get student's khoa
    const studentProfile = await SinhVien.findOne({ account: req.account._id })
      .lean();

    if (!studentProfile) {
      return res.status(404).json({ error: 'Không tìm thấy thông tin sinh viên' });
    }

    // Find all lecturers in the same khoa
    const lecturerProfiles = await GiangVien.find({ khoa: studentProfile.khoa })
      .populate('account', 'id name email')
      .lean();

    // Format lecturers with student count
    const lecturers = lecturerProfiles.map(profile => ({
      _id: profile.account._id.toString(),
      id: profile.account.id,
      name: profile.account.name,
      email: profile.account.email,
      khoa: profile.khoa,
      currentStudentCount: profile.managedStudents?.length || 0,
      maxStudents: profile.maxStudents || 10
    }));

    // Sort by availability (most available first)
    lecturers.sort((a, b) => {
      const availA = a.maxStudents - a.currentStudentCount;
      const availB = b.maxStudents - b.currentStudentCount;
      return availB - availA;
    });

    res.json({
      success: true,
      lecturers
    });
  } catch (error) {
    console.error('Error getting available lecturers:', error);
    res.status(500).json({ 
      success: false,
      error: 'Lỗi server khi tải danh sách giảng viên' 
    });
  }
});

// Get all lecturers by khoa (for BCN to select appeal reviewers)
router.get('/by-khoa/:khoa', authenticate, async (req, res) => {
  try {
    if (req.account.role !== 'ban-chu-nhiem') {
      return res.status(403).json({ error: 'Chỉ ban chủ nhiệm mới có thể truy cập' });
    }

    const { khoa } = req.params;

    // Find all lecturer profiles in this khoa
    const lecturerProfiles = await GiangVien.find({ khoa })
      .populate('account', 'id name email')
      .lean();

    const lecturers = lecturerProfiles.map(profile => ({
      _id: profile.account._id.toString(),
      id: profile.account.id,
      name: profile.account.name,
      email: profile.account.email,
      khoa: profile.khoa
    }));

    res.json({
      success: true,
      lecturers
    });
  } catch (error) {
    console.error('Error getting lecturers by khoa:', error);
    res.status(500).json({ 
      success: false,
      error: 'Lỗi server khi tải danh sách giảng viên' 
    });
  }
});

// Get lecturer's managed students (latest học kỳ only)
router.get('/managed-students', authenticate, async (req, res) => {
  try {
    if (req.account.role !== 'giang-vien') {
      return res.status(403).json({ error: 'Chỉ giảng viên mới có thể truy cập' });
    }

    // Find the lecturer profile with managedStudents populated
    const lecturerProfile = await GiangVien.findOne({ account: req.account._id })
      .populate('account', 'id name email')
      .populate('managedStudents')
      .lean();

    if (!lecturerProfile) {
      return res.json({
        success: true,
        lecturer: null,
        students: [],
        hocKy: null
      });
    }

    // Find the latest active học kỳ
    const latestHocKy = await HocKy.findOne({ isActive: true })
      .sort({ namHoc: -1, hocKyNumber: -1 })
      .lean();

    console.log('Latest học kỳ:', latestHocKy ? { id: latestHocKy._id, namHoc: latestHocKy.namHoc, studentCount: latestHocKy.sinhViens?.length } : null);
    console.log('Lecturer managed students:', lecturerProfile.managedStudents?.length || 0);

    if (!latestHocKy) {
      return res.json({
        success: true,
        lecturer: {
          id: lecturerProfile.account.id,
          name: lecturerProfile.account.name,
          khoa: lecturerProfile.khoa
        },
        students: [],
        hocKy: null
      });
    }

    // Find students supervised by this lecturer in the latest học kỳ
    // Use managedStudents from lecturer profile for better accuracy
    const students = await SinhVien.find({ 
      account: { $in: lecturerProfile.managedStudents || [] },
      _id: { $in: latestHocKy.sinhViens }
    })
      .populate('account', 'id name email')
      .lean();

    console.log('Found students:', students.length);

    // Format the response
    const formattedStudents = students.map(student => ({
      id: student.account.id,
      name: student.account.name,
      email: student.account.email,
      status: student.internshipStatus || 'chua-duoc-huong-dan',
      khoa: student.khoa,
      year: student.year || new Date().getFullYear()
    }));

    const lecturer = {
      id: lecturerProfile.account.id,
      name: lecturerProfile.account.name,
      khoa: lecturerProfile.khoa
    };

    res.json({
      success: true,
      lecturer,
      students: formattedStudents,
      hocKy: {
        id: latestHocKy._id,
        hocKyNumber: latestHocKy.hocKyNumber,
        namHoc: latestHocKy.namHoc,
        durationStart: latestHocKy.durationStart,
        durationEnd: latestHocKy.durationEnd
      }
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
