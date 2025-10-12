import express from "express";
import InternshipSubject from "../models/InternshipSubject.js";
import Account from "../models/Account.js";
import BanChuNhiem from "../models/BanChuNhiem.js";
import GiangVien from "../models/GiangVien.js";
import SinhVien from "../models/SinhVien.js";
import { authPDT, authBCN, authPDTOrBCN, authenticate } from "../middleware/auth.js";

const router = express.Router();

// Get all internship subjects
router.get("/", authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));

    const query = {};
    if (status && status !== "all") query.status = status;
    if (search) {
      query.$or = [
        { title: new RegExp(search, "i") },
        { id: new RegExp(search, "i") }
      ];
    }

    const [subjects, total] = await Promise.all([
      InternshipSubject.find(query)
        .populate('manager', 'id name email')
        .populate('lecturers', 'id name email')
        .populate('students', 'id name email')
        .sort({ createdAt: -1 })
        .limit(limitNum)
        .skip((pageNum - 1) * limitNum),
      InternshipSubject.countDocuments(query)
    ]);

    res.json({
      success: true,
      subjects,
      pagination: {
        page: pageNum,
        pages: Math.max(1, Math.ceil(total / limitNum)),
        total
      }
    });
  } catch (error) {
    console.error("Get internship subjects error:", error);
    res.status(400).json({ error: error.message });
  }
});

// Get available managers (ban-chu-nhiem not managing any subject)
router.get("/available-managers", ...authPDT, async (req, res) => {
  try {
    // Get all ban-chu-nhiem accounts
    const managers = await Account.find({ 
      role: "ban-chu-nhiem", 
      status: "open" 
    }).select('id name email');

    // Get managers already assigned to active subjects
    const assignedSubjects = await InternshipSubject.find({ 
      status: "open" 
    }).populate('manager', 'id');

    const assignedManagerIds = assignedSubjects.map(s => s.manager.id);
    
    // Filter out assigned managers
    const available = managers.filter(m => !assignedManagerIds.includes(m.id));

    res.json({
      success: true,
      managers: available
    });
  } catch (error) {
    console.error("Get available managers error:", error);
    res.status(400).json({ error: error.message });
  }
});

// Create internship subject (PDT only)
router.post("/", ...authPDT, async (req, res) => {
  try {
    const { 
      title, 
      description, 
      duration, 
      registrationStartDate, 
      registrationEndDate, 
      maxStudents, 
      managerId 
    } = req.body;

    if (!title || !maxStudents || !managerId) {
      return res.status(400).json({ error: "Tên môn, số lượng sinh viên và ban chủ nhiệm là bắt buộc" });
    }

    // Find manager account
    const manager = await Account.findOne({ id: managerId, role: "ban-chu-nhiem" });
    if (!manager) {
      return res.status(400).json({ error: "Không tìm thấy ban chủ nhiệm" });
    }

    const subjectData = {
      title,
      maxStudents,
      manager: manager._id
    };

    // Add optional fields if provided
    if (description) subjectData.description = description;
    if (duration) subjectData.duration = duration;
    if (registrationStartDate) subjectData.registrationStartDate = new Date(registrationStartDate);
    if (registrationEndDate) subjectData.registrationEndDate = new Date(registrationEndDate);

    const subject = new InternshipSubject(subjectData);

    await subject.save();
    await subject.populate('manager', 'id name email');

    // Update or create BanChuNhiem profile
    await BanChuNhiem.findOneAndUpdate(
      { account: manager._id },
      { internshipSubject: subject._id },
      { upsert: true }
    );

    res.status(201).json({
      success: true,
      subject
    });
  } catch (error) {
    console.error("Create internship subject error:", error);
    res.status(400).json({ error: error.message });
  }
});

// Update internship subject
router.put("/:id", ...authPDT, async (req, res) => {
  try {
    const { 
      title, 
      description, 
      duration, 
      registrationStartDate, 
      registrationEndDate, 
      maxStudents, 
      managerId, 
      status 
    } = req.body;

    const subject = await InternshipSubject.findOne({ id: req.params.id });
    if (!subject) {
      return res.status(404).json({ error: "Không tìm thấy môn thực tập" });
    }

    // Update basic fields
    if (title) subject.title = title;
    if (description !== undefined) subject.description = description;
    if (duration) subject.duration = duration;
    if (registrationStartDate) subject.registrationStartDate = new Date(registrationStartDate);
    if (registrationEndDate) subject.registrationEndDate = new Date(registrationEndDate);
    if (maxStudents) subject.maxStudents = maxStudents;
    if (status) subject.status = status;

    // Update manager if changed
    if (managerId && managerId !== subject.manager.toString()) {
      const newManager = await Account.findOne({ id: managerId, role: "ban-chu-nhiem" });
      if (!newManager) {
        return res.status(400).json({ error: "Không tìm thấy ban chủ nhiệm mới" });
      }

      // Update old manager
      await BanChuNhiem.findOneAndUpdate(
        { account: subject.manager },
        { internshipSubject: null }
      );

      // Update new manager
      subject.manager = newManager._id;
      await BanChuNhiem.findOneAndUpdate(
        { account: newManager._id },
        { internshipSubject: subject._id },
        { upsert: true }
      );
    }

    await subject.save();
    await subject.populate('manager', 'id name email');

    res.json({
      success: true,
      subject
    });
  } catch (error) {
    console.error("Update internship subject error:", error);
    res.status(400).json({ error: error.message });
  }
});

// Delete internship subject
router.delete("/:id", ...authPDT, async (req, res) => {
  try {
    const subject = await InternshipSubject.findOneAndDelete({ id: req.params.id });
    if (!subject) {
      return res.status(404).json({ error: "Không tìm thấy môn thực tập" });
    }

    // Clean up related profiles
    await BanChuNhiem.findOneAndUpdate(
      { account: subject.manager },
      { internshipSubject: null }
    );

    await GiangVien.updateMany(
      { internshipSubject: subject._id },
      { internshipSubject: null, managedStudents: [] }
    );

    await SinhVien.updateMany(
      { internshipSubject: subject._id },
      { internshipSubject: null, supervisor: null }
    );

    res.json({
      success: true,
      message: "Đã xóa môn thực tập thành công"
    });
  } catch (error) {
    console.error("Delete internship subject error:", error);
    res.status(400).json({ error: error.message });
  }
});

// Get single internship subject with participants
router.get("/:id", authenticate, async (req, res) => {
  try {
    const subject = await InternshipSubject.findOne({ id: req.params.id })
      .populate('manager', 'id name email')
      .populate('lecturers', 'id name email')
      .populate('students', 'id name email');

    if (!subject) {
      return res.status(404).json({ error: "Không tìm thấy môn thực tập" });
    }

    // Get detailed lecturer info with their students
    const lecturerDetails = await Promise.all(
      subject.lecturers.map(async (lecturer) => {
        const gvProfile = await GiangVien.findOne({ account: lecturer._id })
          .populate('managedStudents', 'id name email');
        
        return {
          ...lecturer.toObject(),
          managedStudents: gvProfile?.managedStudents || []
        };
      })
    );

    res.json({
      success: true,
      subject: {
        ...subject.toObject(),
        lecturers: lecturerDetails
      }
    });
  } catch (error) {
    console.error("Get internship subject error:", error);
    res.status(400).json({ error: error.message });
  }
});

// Get BCN's managed subject (BCN only)
router.get("/bcn/managed", ...authBCN, async (req, res) => {
  try {
    const bcnProfile = await BanChuNhiem.findOne({ account: req.account._id })
      .populate('internshipSubject');

    if (!bcnProfile || !bcnProfile.internshipSubject) {
      return res.json({ success: true, subject: null });
    }

    const subject = await InternshipSubject.findById(bcnProfile.internshipSubject)
      .populate('manager', 'id name email')
      .populate('lecturers', 'id name email')
      .populate('students', 'id name email');

    if (!subject) {
      return res.json({ success: true, subject: null });
    }

    const lecturerDetails = await Promise.all(
      subject.lecturers.map(async (lecturer) => {
        const gvProfile = await GiangVien.findOne({ account: lecturer._id })
          .populate('managedStudents', 'id name email');
        return {
          ...lecturer.toObject(),
          managedStudents: gvProfile?.managedStudents || []
        };
      })
    );

    res.json({
      success: true,
      subject: {
        ...subject.toObject(),
        lecturers: lecturerDetails
      }
    });
  } catch (error) {
    console.error("Get BCN managed subject error:", error);
    res.status(400).json({ error: error.message });
  }
});


// Add lecturer to subject (BCN only)
router.post("/:id/lecturers", ...authBCN, async (req, res) => {
  try {
    const { lecturerId } = req.body;

    if (!lecturerId) {
      return res.status(400).json({ error: "Lecturer ID is required" });
    }

    const subject = await InternshipSubject.findOne({ id: req.params.id });
    if (!subject) {
      return res.status(404).json({ error: "Không tìm thấy môn thực tập" });
    }

    // Verify BCN manages this subject
    const bcnProfile = await BanChuNhiem.findOne({ 
      account: req.account._id,
      internshipSubject: subject._id 
    });
    if (!bcnProfile) {
      return res.status(403).json({ error: "Bạn không quản lý môn thực tập này" });
    }

    // Find lecturer account
    const lecturer = await Account.findOne({ id: lecturerId, role: "giang-vien" });
    if (!lecturer) {
      return res.status(400).json({ error: "Không tìm thấy giảng viên" });
    }

    // Check if lecturer already in subject
    if (subject.lecturers.includes(lecturer._id)) {
      return res.status(400).json({ error: "Giảng viên đã tham gia môn thực tập này" });
    }

    // Add lecturer to subject
    subject.lecturers.push(lecturer._id);
    await subject.save();

    // Update lecturer profile
    await GiangVien.findOneAndUpdate(
      { account: lecturer._id },
      { internshipSubject: subject._id },
      { upsert: true }
    );

    await subject.populate('manager', 'id name email');
    await subject.populate('lecturers', 'id name email');
    await subject.populate('students', 'id name email');

    res.json({ success: true, subject });
  } catch (error) {
    console.error("Add lecturer error:", error);
    res.status(400).json({ error: error.message });
  }
});

// Remove lecturer from subject (BCN only)
router.delete("/:id/lecturers/:lecturerId", ...authBCN, async (req, res) => {
  try {
    const subject = await InternshipSubject.findOne({ id: req.params.id });
    if (!subject) {
      return res.status(404).json({ error: "Không tìm thấy môn thực tập" });
    }

    // Verify BCN manages this subject
    const bcnProfile = await BanChuNhiem.findOne({ 
      account: req.account._id,
      internshipSubject: subject._id 
    });
    if (!bcnProfile) {
      return res.status(403).json({ error: "Bạn không quản lý môn thực tập này" });
    }

    const lecturer = await Account.findOne({ id: req.params.lecturerId });
    if (!lecturer) {
      return res.status(404).json({ error: "Không tìm thấy giảng viên" });
    }

    // Remove lecturer from subject
    subject.lecturers = subject.lecturers.filter(
      lecId => lecId.toString() !== lecturer._id.toString()
    );
    await subject.save();

    // Update lecturer profile
    await GiangVien.findOneAndUpdate(
      { account: lecturer._id },
      { internshipSubject: null, managedStudents: [] }
    );

    // Remove students managed by this lecturer
    await SinhVien.updateMany(
      { supervisor: lecturer._id },
      { supervisor: null }
    );

    res.json({ success: true, message: "Đã xóa giảng viên khỏi môn thực tập" });
  } catch (error) {
    console.error("Remove lecturer error:", error);
    res.status(400).json({ error: error.message });
  }
});

// Add student to subject (BCN only)
router.post("/:id/students", ...authBCN, async (req, res) => {
  try {
    const { studentId, supervisorId } = req.body;

    if (!studentId) {
      return res.status(400).json({ error: "Student ID is required" });
    }

    const subject = await InternshipSubject.findOne({ id: req.params.id });
    if (!subject) {
      return res.status(404).json({ error: "Không tìm thấy môn thực tập" });
    }

    // Verify BCN manages this subject
    const bcnProfile = await BanChuNhiem.findOne({ 
      account: req.account._id,
      internshipSubject: subject._id 
    });
    if (!bcnProfile) {
      return res.status(403).json({ error: "Bạn không quản lý môn thực tập này" });
    }

    // Check capacity
    if (subject.students.length >= subject.maxStudents) {
      return res.status(400).json({ error: "Môn thực tập đã đầy" });
    }

    // Find student account
    const student = await Account.findOne({ id: studentId, role: "sinh-vien" });
    if (!student) {
      return res.status(400).json({ error: "Không tìm thấy sinh viên" });
    }

    // Check if student already in subject
    if (subject.students.includes(student._id)) {
      return res.status(400).json({ error: "Sinh viên đã tham gia môn thực tập này" });
    }

    let supervisor = null;
    if (supervisorId) {
      supervisor = await Account.findOne({ id: supervisorId, role: "giang-vien" });
      if (!supervisor) {
        return res.status(400).json({ error: "Không tìm thấy giảng viên hướng dẫn" });
      }
      
      // Verify supervisor is in this subject
      if (!subject.lecturers.includes(supervisor._id)) {
        return res.status(400).json({ error: "Giảng viên hướng dẫn chưa tham gia môn thực tập này" });
      }
    }

    // Add student to subject
    subject.students.push(student._id);
    await subject.save();

    // Update student profile
    await SinhVien.findOneAndUpdate(
      { account: student._id },
      { 
        internshipSubject: subject._id,
        supervisor: supervisor?._id || null,
        internshipStatus: supervisor ? "duoc-huong-dan" : "chua-duoc-huong-dan"
      },
      { upsert: true }
    );

    // Update supervisor's managed students if supervisor is assigned
    if (supervisor) {
      await GiangVien.findOneAndUpdate(
        { account: supervisor._id },
        { $addToSet: { managedStudents: student._id } }
      );
    }

    await subject.populate('manager', 'id name email');
    await subject.populate('lecturers', 'id name email'); 
    await subject.populate('students', 'id name email');

    res.json({ success: true, subject });
  } catch (error) {
    console.error("Add student error:", error);
    res.status(400).json({ error: error.message });
  }
});

// Remove student from subject (BCN only)
router.delete("/:id/students/:studentId", ...authBCN, async (req, res) => {
  try {
    const subject = await InternshipSubject.findOne({ id: req.params.id });
    if (!subject) {
      return res.status(404).json({ error: "Không tìm thấy môn thực tập" });
    }

    // Verify BCN manages this subject
    const bcnProfile = await BanChuNhiem.findOne({ 
      account: req.account._id,
      internshipSubject: subject._id 
    });
    if (!bcnProfile) {
      return res.status(403).json({ error: "Bạn không quản lý môn thực tập này" });
    }

    const student = await Account.findOne({ id: req.params.studentId });
    if (!student) {
      return res.status(404).json({ error: "Không tìm thấy sinh viên" });
    }

    // Remove student from subject
    subject.students = subject.students.filter(
      stuId => stuId.toString() !== student._id.toString()
    );
    await subject.save();

    // Update student profile
    await SinhVien.findOneAndUpdate(
      { account: student._id },
      { internshipSubject: null, supervisor: null }
    );

    // Remove from any lecturer's managed students
    await GiangVien.updateMany(
      { managedStudents: student._id },
      { $pull: { managedStudents: student._id } }
    );

    res.json({ success: true, message: "Đã xóa sinh viên khỏi môn thực tập" });
  } catch (error) {
    console.error("Remove student error:", error);
    res.status(400).json({ error: error.message });
  }
});

// Update student supervisor (BCN only)
router.put("/:id/students/:studentId/supervisor", ...authBCN, async (req, res) => {
  try {
    const { supervisorId } = req.body;

    const subject = await InternshipSubject.findOne({ id: req.params.id });
    if (!subject) {
      return res.status(404).json({ error: "Không tìm thấy môn thực tập" });
    }

    // Verify BCN manages this subject
    const bcnProfile = await BanChuNhiem.findOne({ 
      account: req.account._id,
      internshipSubject: subject._id 
    });
    if (!bcnProfile) {
      return res.status(403).json({ error: "Bạn không quản lý môn thực tập này" });
    }

    const student = await Account.findOne({ id: req.params.studentId });
    if (!student) {
      return res.status(404).json({ error: "Không tìm thấy sinh viên" });
    }

    // Verify student is in this subject
    if (!subject.students.includes(student._id)) {
      return res.status(400).json({ error: "Sinh viên không tham gia môn thực tập này" });
    }

    let supervisor = null;
    if (supervisorId) {
      supervisor = await Account.findOne({ id: supervisorId, role: "giang-vien" });
      if (!supervisor) {
        return res.status(400).json({ error: "Không tìm thấy giảng viên hướng dẫn" });
      }
      
      // Verify supervisor is in this subject
      if (!subject.lecturers.includes(supervisor._id)) {
        return res.status(400).json({ error: "Giảng viên hướng dẫn chưa tham gia môn thực tập này" });
      }
    }

    // Get current supervisor to remove student from their list
    const studentProfile = await SinhVien.findOne({ account: student._id });
    if (studentProfile?.supervisor) {
      await GiangVien.findOneAndUpdate(
        { account: studentProfile.supervisor },
        { $pull: { managedStudents: student._id } }
      );
    }

    // Update student profile
    await SinhVien.findOneAndUpdate(
      { account: student._id },
      { 
        supervisor: supervisor?._id || null,
        internshipStatus: supervisor ? "duoc-huong-dan" : "chua-duoc-huong-dan"
      }
    );

    // Add to new supervisor's managed students if supervisor is assigned
    if (supervisor) {
      await GiangVien.findOneAndUpdate(
        { account: supervisor._id },
        { $addToSet: { managedStudents: student._id } }
      );
    }

    await subject.populate('manager', 'id name email');
    await subject.populate('lecturers', 'id name email');
    await subject.populate('students', 'id name email');

    // Get updated lecturer details
    const lecturerDetails = await Promise.all(
      subject.lecturers.map(async (lecturer) => {
        const gvProfile = await GiangVien.findOne({ account: lecturer._id })
          .populate('managedStudents', 'id name email');
        
        return {
          ...lecturer.toObject(),
          managedStudents: gvProfile?.managedStudents || []
        };
      })
    );

    res.json({
      success: true,
      subject: {
        ...subject.toObject(),
        lecturers: lecturerDetails
      }
    });
  } catch (error) {
    console.error("Update student supervisor error:", error);
    res.status(400).json({ error: error.message });
  }
});

// Get available lecturers for subject (BCN only)
router.get("/:id/available-lecturers", ...authBCN, async (req, res) => {
  try {
    const subject = await InternshipSubject.findOne({ id: req.params.id });
    if (!subject) {
      return res.status(404).json({ error: "Không tìm thấy môn thực tập" });
    }

    // Get all active lecturers not already in this subject
    const lecturers = await Account.find({ 
      role: "giang-vien", 
      status: "open",
      _id: { $nin: subject.lecturers }
    }).select('id name email');

    res.json({ success: true, lecturers });
  } catch (error) {
    console.error("Get available lecturers error:", error);
    res.status(400).json({ error: error.message });
  }
});

// Get available students for subject (BCN only)
router.get("/:id/available-students", ...authBCN, async (req, res) => {
  try {
    const subject = await InternshipSubject.findOne({ id: req.params.id });
    if (!subject) {
      return res.status(404).json({ error: "Không tìm thấy môn thực tập" });
    }

    // Get all active students not already in this subject
    const students = await Account.find({ 
      role: "sinh-vien", 
      status: "open",
      _id: { $nin: subject.students }
    }).select('id name email');

    res.json({ success: true, students });
  } catch (error) {
    console.error("Get available students error:", error);
    res.status(400).json({ error: error.message });
  }
});

// Get subjects for student registration (Student only)
router.get("/student/available", authenticate, async (req, res) => {
  try {
    if (req.account.role !== 'sinh-vien') {
      return res.status(403).json({ error: 'Chỉ sinh viên mới có thể truy cập' });
    }

    // Check if student is already registered
    const studentProfile = await SinhVien.findOne({ account: req.account._id })
      .populate('internshipSubject', 'id title');

    const subjects = await InternshipSubject.find({ status: 'open' })
      .populate('manager', 'id name email')
      .populate('lecturers', 'id name email')
      .populate('students', 'id name email')
      .sort({ registrationStartDate: 1 });

    // Transform data for frontend compatibility
    const transformedSubjects = subjects.map(subject => ({
      ...subject.toObject(),
      name: subject.title, // Legacy compatibility
      code: subject.id,    // Legacy compatibility
      bcnManager: {        // Legacy compatibility
        id: subject.manager.id,
        name: subject.manager.name
      },
      instructors: subject.lecturers.map(lecturer => ({ // Legacy compatibility
        id: lecturer.id,
        name: lecturer.name,
        studentCount: 0, // Will be calculated if needed
        maxStudents: 10  // Default value
      }))
    }));

    res.json({
      success: true,
      subjects: transformedSubjects,
      studentRegistration: studentProfile?.internshipSubject ? {
        studentId: req.account.id,
        subjectId: studentProfile.internshipSubject.id,
        registeredAt: studentProfile.createdAt
      } : null
    });
  } catch (error) {
    console.error("Get student subjects error:", error);
    res.status(400).json({ error: error.message });
  }
});

// Register student for subject (Student only)
router.post("/student/register", authenticate, async (req, res) => {
  try {
    if (req.account.role !== 'sinh-vien') {
      return res.status(403).json({ error: 'Chỉ sinh viên mới có thể đăng ký' });
    }

    const { subjectId } = req.body;
    if (!subjectId) {
      return res.status(400).json({ error: 'Subject ID is required' });
    }

    // Check if student is already registered for any subject
    const existingRegistration = await SinhVien.findOne({ account: req.account._id });
    if (existingRegistration?.internshipSubject) {
      return res.status(400).json({ error: 'Bạn đã đăng ký môn thực tập khác' });
    }

    // Find the subject
    const subject = await InternshipSubject.findOne({ id: subjectId });
    if (!subject) {
      return res.status(404).json({ error: 'Không tìm thấy môn thực tập' });
    }

    // Check registration status
    const now = new Date();
    if (now < new Date(subject.registrationStartDate)) {
      return res.status(400).json({ error: 'Chưa đến thời gian đăng ký' });
    }
    if (now > new Date(subject.registrationEndDate)) {
      return res.status(400).json({ error: 'Đã hết thời gian đăng ký' });
    }
    if (subject.currentStudents >= subject.maxStudents) {
      return res.status(400).json({ error: 'Môn thực tập đã đầy' });
    }

    // Register student
    subject.students.push(req.account._id);
    await subject.save();

    // Update or create student profile
    await SinhVien.findOneAndUpdate(
      { account: req.account._id },
      { 
        internshipSubject: subject._id,
        internshipStatus: "chua-duoc-huong-dan"
      },
      { upsert: true }
    );

    const registration = {
      studentId: req.account.id,
      subjectId: subject.id,
      registeredAt: new Date().toISOString()
    };

    res.json({
      success: true,
      registration,
      message: 'Đăng ký thành công'
    });
  } catch (error) {
    console.error("Student registration error:", error);
    res.status(400).json({ error: error.message });
  }
});

export default router;
