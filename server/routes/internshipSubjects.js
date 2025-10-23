import express from "express";
import InternshipSubject from "../models/InternshipSubject.js";
import Account from "../models/Account.js";
import BanChuNhiem from "../models/BanChuNhiem.js";
import GiangVien from "../models/GiangVien.js";
import SinhVien from "../models/SinhVien.js";
import { authenticate, authorize, authPDT, authBCN } from "../middleware/auth.js";
import notificationService from "../services/notificationService.js";

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

    // Send notification to BCN about new subject assignment
    try {
      const io = req.app.get('io');
      await notificationService.createNotification({
        recipient: manager._id,
        sender: req.account._id,
        type: 'subject-assigned',
        title: 'Được phân công quản lý môn thực tập',
        message: `Bạn đã được phân công quản lý môn thực tập "${subject.title}"`,
        link: `/bcn/internship-subject`,
        priority: 'high',
        metadata: { subjectId: subject.id }
      }, io);
    } catch (notifError) {
      console.error('Error sending subject assignment notification:', notifError);
    }

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
    const originalStatus = subject.status;
    
    if (title) subject.title = title;
    if (description !== undefined) subject.description = description;
    if (duration) subject.duration = duration;
    if (registrationStartDate) subject.registrationStartDate = new Date(registrationStartDate);
    if (registrationEndDate) subject.registrationEndDate = new Date(registrationEndDate);
    if (maxStudents) subject.maxStudents = maxStudents;
    if (status) subject.status = status;

    let newManager = null;
    let oldManager = null;

    // Update manager if changed
    if (managerId && managerId !== subject.manager.toString()) {
      newManager = await Account.findOne({ id: managerId, role: "ban-chu-nhiem" });
      if (!newManager) {
        return res.status(400).json({ error: "Không tìm thấy ban chủ nhiệm mới" });
      }

      oldManager = await Account.findById(subject.manager);

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

    // Send notifications for changes
    try {
      const io = req.app.get('io');
      
      // Notify about manager change
      if (newManager && oldManager) {
        // Notify old manager about removal
        await notificationService.createNotification({
          recipient: oldManager._id,
          sender: req.account._id,
          type: 'system',
          title: 'Không còn quản lý môn thực tập',
          message: `Bạn đã không còn quản lý môn thực tập "${subject.title}"`,
          link: `/bcn/internship-subject`,
          priority: 'normal',
          metadata: { subjectId: subject.id }
        }, io);

        // Notify new manager about assignment
        await notificationService.createNotification({
          recipient: newManager._id,
          sender: req.account._id,
          type: 'subject-assigned',
          title: 'Được phân công quản lý môn thực tập',
          message: `Bạn đã được phân công quản lý môn thực tập "${subject.title}"`,
          link: `/bcn/internship-subject`,
          priority: 'high',
          metadata: { subjectId: subject.id }
        }, io);
      }
      
      // Notify about status change
      if (status && status !== originalStatus) {
        const statusText = status === 'locked' ? 'đã đóng' : 'đã mở';
        
        // Notify all participants (BCN, lecturers, students)
        const participants = [subject.manager, ...subject.lecturers, ...subject.students];
        
        for (const participantId of participants) {
          await notificationService.createNotification({
            recipient: participantId,
            sender: req.account._id,
            type: 'system',
            title: 'Trạng thái môn thực tập thay đổi',
            message: `Môn thực tập "${subject.title}" ${statusText}`,
            link: `/internship-subjects/${subject.id}`,
            priority: 'normal',
            metadata: { 
              subjectId: subject.id,
              oldStatus: originalStatus,
              newStatus: status
            }
          }, io);
        }
      }
    } catch (notifError) {
      console.error('Error sending subject update notification:', notifError);
    }

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

    // Send notification to lecturer
    const io = req.app.get('io');
    await notificationService.createNotification({
      recipient: lecturer._id,
      sender: req.account._id,
      type: 'subject-assigned',
      title: 'Được phân công môn thực tập',
      message: `Bạn đã được phân công vào môn thực tập "${subject.title}"`,
      link: `/teacher-page`,
      priority: 'high',
      metadata: { subjectId: subject.id }
    }, io);

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

    // Send notification to lecturer about removal
    try {
      const io = req.app.get('io');
      await notificationService.createNotification({
        recipient: lecturer._id,
        sender: req.account._id,
        type: 'student-removed',
        title: 'Không còn tham gia môn thực tập',
        message: `Bạn đã không còn tham gia giảng dạy môn thực tập "${subject.title}"`,
        link: `/teacher-page`,
        priority: 'normal',
        metadata: { subjectId: subject.id }
      }, io);
    } catch (notifError) {
      console.error('Error sending lecturer removal notification:', notifError);
    }

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

    // Send notifications
    const io = req.app.get('io');
    
    // Notify student about joining subject
    await notificationService.createNotification({
      recipient: student._id,
      sender: req.account._id,
      type: 'subject-assigned',
      title: 'Đã tham gia môn thực tập',
      message: `Bạn đã được phân công vào môn thực tập "${subject.title}"`,
      link: `/my-internship`,
      priority: 'high',
      metadata: { subjectId: subject.id }
    }, io);

    // Notify supervisor if assigned
    if (supervisor) {
      await notificationService.createNotification({
        recipient: supervisor._id,
        sender: req.account._id,
        type: 'student-assigned',
        title: 'Sinh viên mới được phân công',
        message: `Sinh viên ${student.name} (${student.id}) đã được phân công cho bạn hướng dẫn`,
        link: `/teacher-students`,
        priority: 'high',
        metadata: { 
          subjectId: subject.id,
          studentId: student.id
        }
      }, io);
    }

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

    // Send notification to student about removal
    try {
      const io = req.app.get('io');
      await notificationService.createNotification({
        recipient: student._id,
        sender: req.account._id,
        type: 'student-removed',
        title: 'Không còn tham gia môn thực tập',
        message: `Bạn đã không còn tham gia môn thực tập "${subject.title}"`,
        link: `/my-internship`,
        priority: 'high',
        metadata: { subjectId: subject.id }
      }, io);
    } catch (notifError) {
      console.error('Error sending student removal notification:', notifError);
    }

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

    // Send notifications
    const io = req.app.get('io');
    
    if (supervisor) {
      // Notify new supervisor
      await notificationService.createNotification({
        recipient: supervisor._id,
        sender: req.account._id,
        type: 'student-assigned',
        title: 'Sinh viên mới được phân công',
        message: `Sinh viên ${student.name} (${student.id}) đã được phân công cho bạn hướng dẫn`,
        link: `/teacher-students`,
        priority: 'high',
        metadata: { 
          subjectId: subject.id,
          studentId: student.id
        }
      }, io);

      // Notify student about supervisor assignment
      await notificationService.createNotification({
        recipient: student._id,
        sender: req.account._id,
        type: 'student-assigned',
        title: 'Giảng viên hướng dẫn',
        message: `Bạn đã được phân công giảng viên hướng dẫn: ${supervisor.name}`,
        link: `/my-internship`,
        priority: 'high',
        metadata: { 
          subjectId: subject.id,
          supervisorId: supervisor.id
        }
      }, io);
    }

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

// Get student's assigned instructor and subject (Student only)
router.get("/student/assigned-instructor", authenticate, async (req, res) => {
  try {
    if (req.account.role !== 'sinh-vien') {
      return res.status(403).json({ error: 'Chỉ sinh viên mới có thể truy cập' });
    }

    // Find student profile with their assigned subject and supervisor
    const studentProfile = await SinhVien.findOne({ account: req.account._id })
      .populate('internshipSubject', 'id title')
      .populate('supervisor', 'id name email')
      .lean();

    if (!studentProfile) {
      return res.json({
        success: true,
        instructor: null,
        subject: null,
        message: "Chưa có thông tin sinh viên"
      });
    }

    // Prepare response
    const response = {
      success: true,
      instructor: studentProfile.supervisor ? {
        id: studentProfile.supervisor.id,
        name: studentProfile.supervisor.name,
        email: studentProfile.supervisor.email
      } : null,
      subject: studentProfile.internshipSubject ? {
        id: studentProfile.internshipSubject.id,
        title: studentProfile.internshipSubject.title
      } : null,
      message: studentProfile.supervisor ? "Đã có giảng viên hướng dẫn" : "Chưa được phân công giảng viên"
    };

    res.json(response);
  } catch (error) {
    console.error("Get student assigned instructor error:", error);
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

    // Send notifications
    try {
      const io = req.app.get('io');
      
      // Notify BCN about new student registration
      const bcnProfile = await BanChuNhiem.findOne({ 
        internshipSubject: subject._id 
      });
      
      if (bcnProfile) {
        await notificationService.createNotification({
          recipient: bcnProfile.account,
          sender: req.account._id,
          type: 'system',
          title: 'Sinh viên đăng ký môn thực tập',
          message: `Sinh viên ${req.account.name} (${req.account.id}) đã đăng ký môn thực tập "${subject.title}"`,
          link: `/bcn/internship-subject`,
          priority: 'normal',
          metadata: { 
            subjectId: subject.id,
            studentId: req.account.id
          }
        }, io);
      }
      
      // Notify student about successful registration
      await notificationService.createNotification({
        recipient: req.account._id,
        type: 'system',
        title: 'Đăng ký thành công',
        message: `Bạn đã đăng ký thành công môn thực tập "${subject.title}"`,
        link: `/my-internship`,
        priority: 'high',
        metadata: { subjectId: subject.id }
      }, io);
    } catch (notifError) {
      console.error('Error sending student registration notification:', notifError);
    }

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

// Get subjects for teacher registration (Teacher only)
router.get("/teacher/available", authenticate, async (req, res) => {
  try {
    if (req.account.role !== 'giang-vien') {
      return res.status(403).json({ error: 'Chỉ giảng viên mới có thể truy cập' });
    }

    // Check if teacher is already registered
    const teacherProfile = await GiangVien.findOne({ account: req.account._id })
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
      }
    }));

    res.json({
      success: true,
      subjects: transformedSubjects,
      teacherRegistration: teacherProfile?.internshipSubject ? {
        teacherId: req.account.id,
        subjectId: teacherProfile.internshipSubject.id,
        registeredAt: teacherProfile.createdAt
      } : null
    });
  } catch (error) {
    console.error("Get teacher subjects error:", error);
    res.status(400).json({ error: error.message });
  }
});

// Register teacher for subject (Teacher only)
router.post("/teacher/register", authenticate, async (req, res) => {
  try {
    if (req.account.role !== 'giang-vien') {
      return res.status(403).json({ error: 'Chỉ giảng viên mới có thể đăng ký' });
    }

    const { subjectId } = req.body;
    if (!subjectId) {
      return res.status(400).json({ error: 'Subject ID is required' });
    }

    // Check if teacher is already registered for any subject
    const existingRegistration = await GiangVien.findOne({ account: req.account._id });
    if (existingRegistration?.internshipSubject) {
      return res.status(400).json({ error: 'Bạn đã tham gia giảng dạy môn thực tập khác' });
    }

    // Find the subject
    const subject = await InternshipSubject.findOne({ id: subjectId });
    if (!subject) {
      return res.status(404).json({ error: 'Không tìm thấy môn thực tập' });
    }

    if (subject.status !== 'open') {
      return res.status(400).json({ error: 'Môn thực tập đã đóng đăng ký' });
    }

    // Check if teacher is already in this subject
    if (subject.lecturers.includes(req.account._id)) {
      return res.status(400).json({ error: 'Bạn đã tham gia giảng dạy môn này' });
    }

    // Add teacher to subject (doesn't affect student capacity)
    subject.lecturers.push(req.account._id);
    await subject.save();

    // Update or create teacher profile
    await GiangVien.findOneAndUpdate(
      { account: req.account._id },
      { 
        internshipSubject: subject._id,
        managedStudents: []
      },
      { upsert: true }
    );

    // Send notifications
    try {
      const io = req.app.get('io');
      
      // Notify BCN about new teacher registration
      const bcnProfile = await BanChuNhiem.findOne({ 
        internshipSubject: subject._id 
      });
      
      if (bcnProfile) {
        await notificationService.createNotification({
          recipient: bcnProfile.account,
          sender: req.account._id,
          type: 'system',
          title: 'Giảng viên đăng ký môn thực tập',
          message: `Giảng viên ${req.account.name} (${req.account.id}) đã đăng ký tham gia giảng dạy môn thực tập "${subject.title}"`,
          link: `/bcn/internship-subject`,
          priority: 'normal',
          metadata: { 
            subjectId: subject.id,
            teacherId: req.account.id
          }
        }, io);
      }
      
      // Notify teacher about successful registration
      await notificationService.createNotification({
        recipient: req.account._id,
        type: 'system',
        title: 'Đăng ký giảng dạy thành công',
        message: `Bạn đã đăng ký thành công tham gia giảng dạy môn thực tập "${subject.title}"`,
        link: `/teacher-page`,
        priority: 'high',
        metadata: { subjectId: subject.id }
      }, io);
    } catch (notifError) {
      console.error('Error sending teacher registration notification:', notifError);
    }

    const registration = {
      teacherId: req.account.id,
      subjectId: subject.id,
      registeredAt: new Date().toISOString()
    };

    res.json({
      success: true,
      registration,
      message: 'Đăng ký thành công'
    });
  } catch (error) {
    console.error("Teacher registration error:", error);
    res.status(400).json({ error: error.message });
  }
});

export default router;
