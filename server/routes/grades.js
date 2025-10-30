import express from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import InternshipGrade from "../models/InternshipGrade.js";
import SinhVien from "../models/SinhVien.js";
import GiangVien from "../models/GiangVien.js";
import BanChuNhiem from "../models/BanChuNhiem.js";
import Account from "../models/Account.js";
import InternshipSubject from "../models/InternshipSubject.js";
import notificationService from "../services/notificationService.js";

const router = express.Router();

// Get all grades managed by a supervisor (GV only)
router.get("/supervisor/students", authenticate, authorize(["giang-vien"]), async (req, res) => {
  try {
    const { status } = req.query;
    
    // Validate status
    if (status && status !== 'all' && !['not_started', 'in_progress', 'draft_completed', 'submitted', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, error: "Trạng thái không hợp lệ" });
    }
    
    // Get supervisor's managed students
    const students = await SinhVien.find({ supervisor: req.account._id })
      .populate('account', 'id name email')
      .populate('internshipSubject', 'id title')
      .lean();

    if (!students.length) {
      return res.json({
        success: true,
        grades: [],
        message: "Bạn chưa được phân công hướng dẫn sinh viên nào"
      });
    }

    // Get existing grade records using account ObjectIds
    const studentAccountIds = students.map(s => s.account._id);
    let query = { student: { $in: studentAccountIds } };
    if (status && status !== 'all') {
      query.status = status;
    }

    const grades = await InternshipGrade.find(query)
      .populate('student', 'id name email')
      .populate('internshipSubject', 'id title')
      .sort({ updatedAt: -1 })
      .lean();

    // Create grade records for students who don't have them yet
    const existingStudentAccountIds = grades.map(g => g.student._id.toString());
    const studentsWithoutGrades = students.filter(s => 
      !existingStudentAccountIds.includes(s.account._id.toString())
    );

    for (const student of studentsWithoutGrades) {
      const workType = student.workType || 'thuc_tap';
      
      const newGrade = new InternshipGrade({
        student: student.account._id,
        supervisor: req.account._id,
        internshipSubject: student.internshipSubject._id,
        workType: workType,
        startDate: new Date(),
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        milestones: InternshipGrade.createDefaultMilestones(
          workType,
          new Date(),
          new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
        ),
        gradeComponents: InternshipGrade.createDefaultGradeComponents(workType)
      });
      
      await newGrade.save();
      const populatedGrade = await InternshipGrade.findById(newGrade._id)
        .populate('student', 'id name email')
        .populate('internshipSubject', 'id title')
        .lean();
      grades.push(populatedGrade);
    }

    res.json({
      success: true,
      grades: grades.map(grade => ({
        id: grade._id,
        student: grade.student ? {
          id: grade.student.id,
          name: grade.student.name,
          email: grade.student.email
        } : null,
        subject: grade.internshipSubject ? {
          id: grade.internshipSubject.id,
          title: grade.internshipSubject.title
        } : null,
  workType: grade.workType,
  company: grade.company,
  projectTopic: grade.projectTopic,
  status: grade.status,
        finalGrade: grade.finalGrade,
        letterGrade: grade.letterGrade,
        progressPercentage: grade.progressPercentage || grade.getProgressPercentage?.() || 0,
        submittedToBCN: grade.submittedToBCN,
        startDate: grade.startDate,
        endDate: grade.endDate,
        updatedAt: grade.updatedAt
      }))
    });
  } catch (error) {
    console.error("Get supervisor grades error:", error);
    res.status(500).json({ success: false, error: "Lỗi server" });
  }
});

// Get detailed grade information for a specific student
router.get("/students/:studentId", authenticate, authorize(["giang-vien", "ban-chu-nhiem"]), async (req, res) => {
  try {
    const { studentId } = req.params;

    // First find the student account by their ID (e.g., "SV0001")
    const studentAccount = await Account.findOne({ id: studentId });
    if (!studentAccount) {
      return res.status(404).json({ success: false, error: "Không tìm thấy sinh viên" });
    }

    let grade = await InternshipGrade.findOne({ student: studentAccount._id })
      .populate('student', 'id name email')
      .populate('supervisor', 'id name email')
      .populate('internshipSubject', 'id title');

    // If no grade record exists, create one for GV
    if (!grade && req.account.role === "giang-vien") {
      // Check if this student is assigned to this supervisor
      const student = await SinhVien.findOne({ 
        account: studentAccount._id,
        supervisor: req.account._id 
      }).populate('internshipSubject', 'id title');

      if (!student) {
        return res.status(403).json({ success: false, error: "Bạn không được phân công hướng dẫn sinh viên này" });
      }

      // Create new grade record
      const newGrade = new InternshipGrade({
        student: studentAccount._id,
        supervisor: req.account._id,
        internshipSubject: student.internshipSubject._id,
        startDate: new Date(),
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
        milestones: InternshipGrade.createDefaultMilestones(
          new Date(),
          new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
        ),
        gradeComponents: InternshipGrade.createDefaultGradeComponents()
      });
      
      await newGrade.save();
      
      grade = await InternshipGrade.findById(newGrade._id)
        .populate('student', 'id name email')
        .populate('supervisor', 'id name email')
        .populate('internshipSubject', 'id title');
    }

    if (!grade) {
      return res.status(404).json({ success: false, error: "Không tìm thấy thông tin điểm" });
    }

    // Check permissions
    if (req.account.role === "giang-vien" && grade.supervisor._id.toString() !== req.account._id.toString()) {
      return res.status(403).json({ success: false, error: "Bạn không có quyền xem điểm sinh viên này" });
    }

    if (req.account.role === "ban-chu-nhiem") {
      // BCN can only view grades from their managed subject
      const bcnProfile = await BanChuNhiem.findOne({ 
        account: req.account._id,
        internshipSubject: grade.internshipSubject._id 
      });
      if (!bcnProfile) {
        return res.status(403).json({ success: false, error: "Bạn không quản lý môn thực tập này" });
      }
    }

    res.json({
      success: true,
      grade: {
        id: grade._id,
        student: grade.student,
        supervisor: grade.supervisor,
        subject: grade.internshipSubject,
        status: grade.status,
        workType: grade.workType,
        company: grade.company,
        projectTopic: grade.projectTopic,
        startDate: grade.startDate,
        endDate: grade.endDate,
        milestones: grade.milestones,
        gradeComponents: grade.gradeComponents,
        finalGrade: grade.finalGrade,
        letterGrade: grade.letterGrade,
        progressPercentage: grade.getProgressPercentage(),
        submittedToBCN: grade.submittedToBCN,
        submittedAt: grade.submittedAt,
        supervisorFinalComment: grade.supervisorFinalComment,
        gradingNotes: grade.gradingNotes,
        gradingFiles: grade.gradingFiles,
        bcnComment: grade.bcnComment,
        createdAt: grade.createdAt,
        updatedAt: grade.updatedAt
      }
    });
  } catch (error) {
    console.error("Get student grade error:", error);
    res.status(500).json({ success: false, error: "Lỗi server" });
  }
});

// Update milestone status
router.put("/students/:studentId/milestones/:milestoneId", authenticate, authorize(["giang-vien"]), async (req, res) => {
  try {
    const { studentId, milestoneId } = req.params;
    const { status, supervisorNotes, submittedDocuments } = req.body;

    // Validate status if provided
    if (status && !['pending', 'in_progress', 'completed', 'overdue'].includes(status)) {
      return res.status(400).json({ success: false, error: "Trạng thái milestone không hợp lệ" });
    }

    // Validate supervisorNotes length if provided
    if (supervisorNotes && supervisorNotes.length > 1000) {
      return res.status(400).json({ success: false, error: "Ghi chú không được vượt quá 1000 ký tự" });
    }

    // Validate submittedDocuments if provided
    if (submittedDocuments && (!Array.isArray(submittedDocuments) || submittedDocuments.length > 10)) {
      return res.status(400).json({ success: false, error: "Tối đa 10 tài liệu đính kèm" });
    }

    // Find the student account by their ID (e.g., "SV0001")
    const studentAccount = await Account.findOne({ id: studentId });
    if (!studentAccount) {
      return res.status(404).json({ success: false, error: "Không tìm thấy sinh viên" });
    }

    const grade = await InternshipGrade.findOne({ student: studentAccount._id });
    if (!grade) {
      return res.status(404).json({ success: false, error: "Không tìm thấy thông tin điểm" });
    }

    // Check if supervisor owns this grade record
    if (grade.supervisor.toString() !== req.account._id.toString()) {
      return res.status(403).json({ success: false, error: "Bạn không có quyền cập nhật điểm sinh viên này" });
    }

    const milestone = grade.milestones.id(milestoneId);
    if (!milestone) {
      return res.status(404).json({ success: false, error: "Không tìm thấy milestone" });
    }

    if (status) milestone.status = status;
    if (supervisorNotes !== undefined) milestone.supervisorNotes = supervisorNotes;
    if (submittedDocuments) milestone.submittedDocuments = submittedDocuments;
    
    if (status === 'completed' && !milestone.completedAt) {
      milestone.completedAt = new Date();
    }

    // Update overall grade status based on milestone progress
    if (milestone.type === 'start' && status === 'completed' && grade.status === 'not_started') {
      grade.status = 'in_progress';
    }

    await grade.save();

    // Send notification to student about milestone update
    const io = req.app.get('io');
    await notificationService.createNotification({
      recipient: grade.student,
      sender: req.account._id,
      type: 'milestone-updated',
      title: 'Cập nhật tiến độ thực tập',
      message: `Giảng viên ${req.account.name} đã cập nhật milestone "${milestone.title}": ${status === 'completed' ? 'Hoàn thành' : status === 'in_progress' ? 'Đang thực hiện' : 'Chờ xử lý'}`,
      link: `/my-internship`,
      priority: 'normal',
      metadata: { 
        gradeId: grade._id.toString(),
        milestoneId: milestoneId,
        milestoneType: milestone.type
      }
    }, io);

    res.json({
      success: true,
      milestone: milestone,
      progressPercentage: grade.getProgressPercentage(),
      gradeStatus: grade.status
    });
  } catch (error) {
    console.error("Update milestone error:", error);
    res.status(500).json({ success: false, error: "Lỗi server" });
  }
});

// Upload files to milestone (SV can upload their own, GV can view)
router.post("/students/:studentId/milestones/:milestoneId/files", authenticate, authorize(["sinh-vien", "giang-vien"]), async (req, res) => {
  try {
    const { studentId, milestoneId } = req.params;
    const { files } = req.body; // Array of {id, fileName, fileUrl}

    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ success: false, error: "Vui lòng cung cấp danh sách file" });
    }

    if (files.length > 10) {
      return res.status(400).json({ success: false, error: "Tối đa 10 file cho mỗi milestone" });
    }

    // Find the student account
    const studentAccount = await Account.findOne({ id: studentId });
    if (!studentAccount) {
      return res.status(404).json({ success: false, error: "Không tìm thấy sinh viên" });
    }

    // If user is a student, verify they're uploading to their own grade
    if (req.account.role === "sinh-vien" && req.account._id.toString() !== studentAccount._id.toString()) {
      return res.status(403).json({ success: false, error: "Bạn chỉ có thể tải file cho mốc của mình" });
    }

    const grade = await InternshipGrade.findOne({ student: studentAccount._id });
    if (!grade) {
      return res.status(404).json({ success: false, error: "Không tìm thấy thông tin điểm" });
    }

    // If user is GV, verify they own this grade
    if (req.account.role === "giang-vien" && grade.supervisor.toString() !== req.account._id.toString()) {
      return res.status(403).json({ success: false, error: "Bạn không có quyền truy cập điểm sinh viên này" });
    }

    const milestone = grade.milestones.id(milestoneId);
    if (!milestone) {
      return res.status(404).json({ success: false, error: "Không tìm thấy milestone" });
    }

    // Initialize fileSubmissions if not exists
    if (!milestone.fileSubmissions) {
      milestone.fileSubmissions = [];
    }

    // Add new files with uploadedBy info
    const uploadedBy = req.account.role === "sinh-vien" ? "student" : "supervisor";
    const newFiles = files.map(file => ({
      ...file,
      uploadedAt: new Date(),
      uploadedBy
    }));

    milestone.fileSubmissions.push(...newFiles);

    // Check total file count
    if (milestone.fileSubmissions.length > 10) {
      return res.status(400).json({ success: false, error: "Tối đa 10 file cho mỗi milestone" });
    }

    await grade.save();

    // Send notification if student uploaded
    if (req.account.role === "sinh-vien") {
      const io = req.app.get('io');
      await notificationService.createNotification({
        recipient: grade.supervisor,
        sender: req.account._id,
        type: 'milestone-file-uploaded',
        title: 'Sinh viên nộp tài liệu',
        message: `Sinh viên ${req.account.name} đã nộp ${files.length} file cho milestone "${milestone.title}"`,
        link: `/gv/grade-management/${studentId}`,
        priority: 'normal',
        metadata: { 
          gradeId: grade._id.toString(),
          milestoneId: milestoneId,
          fileCount: files.length
        }
      }, io);
    }

    res.json({
      success: true,
      message: "Tải file thành công",
      fileSubmissions: milestone.fileSubmissions
    });
  } catch (error) {
    console.error("Upload milestone file error:", error);
    res.status(500).json({ success: false, error: "Lỗi server" });
  }
});

// Delete file from milestone
router.delete("/students/:studentId/milestones/:milestoneId/files/:fileId", authenticate, authorize(["sinh-vien", "giang-vien"]), async (req, res) => {
  try {
    const { studentId, milestoneId, fileId } = req.params;

    // Find the student account
    const studentAccount = await Account.findOne({ id: studentId });
    if (!studentAccount) {
      return res.status(404).json({ success: false, error: "Không tìm thấy sinh viên" });
    }

    // If user is a student, verify they're deleting from their own grade
    if (req.account.role === "sinh-vien" && req.account._id.toString() !== studentAccount._id.toString()) {
      return res.status(403).json({ success: false, error: "Bạn chỉ có thể xóa file của mình" });
    }

    const grade = await InternshipGrade.findOne({ student: studentAccount._id });
    if (!grade) {
      return res.status(404).json({ success: false, error: "Không tìm thấy thông tin điểm" });
    }

    // If user is GV, verify they own this grade
    if (req.account.role === "giang-vien" && grade.supervisor.toString() !== req.account._id.toString()) {
      return res.status(403).json({ success: false, error: "Bạn không có quyền truy cập điểm sinh viên này" });
    }

    const milestone = grade.milestones.id(milestoneId);
    if (!milestone) {
      return res.status(404).json({ success: false, error: "Không tìm thấy milestone" });
    }

    if (!milestone.fileSubmissions) {
      return res.status(404).json({ success: false, error: "Không có file nào" });
    }

    // Find and remove the file
    const fileIndex = milestone.fileSubmissions.findIndex(f => f.id === fileId);
    if (fileIndex === -1) {
      return res.status(404).json({ success: false, error: "Không tìm thấy file" });
    }

    // Only allow users to delete their own uploaded files, or GV can delete any
    const file = milestone.fileSubmissions[fileIndex];
    if (req.account.role === "sinh-vien" && file.uploadedBy !== "student") {
      return res.status(403).json({ success: false, error: "Bạn chỉ có thể xóa file do mình tải lên" });
    }

    milestone.fileSubmissions.splice(fileIndex, 1);
    await grade.save();

    res.json({
      success: true,
      message: "Xóa file thành công",
      fileSubmissions: milestone.fileSubmissions
    });
  } catch (error) {
    console.error("Delete milestone file error:", error);
    res.status(500).json({ success: false, error: "Lỗi server" });
  }
});

// Update grade components
router.put("/students/:studentId/grades", authenticate, authorize(["giang-vien"]), async (req, res) => {
  try {
    const { studentId } = req.params;
    const { gradeComponents, supervisorFinalComment, gradingNotes, gradingFiles } = req.body;

    // Validate gradeComponents if provided
    if (gradeComponents) {
      if (!Array.isArray(gradeComponents)) {
        return res.status(400).json({ success: false, error: "Thành phần điểm phải là mảng" });
      }
      for (const component of gradeComponents) {
        if (component.score !== undefined && (component.score < 0 || component.score > 10)) {
          return res.status(400).json({ success: false, error: "Điểm phải từ 0 đến 10" });
        }
        if (component.weight !== undefined && (component.weight < 0 || component.weight > 100)) {
          return res.status(400).json({ success: false, error: "Trọng số phải từ 0 đến 100" });
        }
      }
    }

    // Validate supervisorFinalComment length if provided
    if (supervisorFinalComment && supervisorFinalComment.length > 2000) {
      return res.status(400).json({ success: false, error: "Nhận xét không được vượt quá 2000 ký tự" });
    }

    // Validate gradingNotes length if provided
    if (gradingNotes && gradingNotes.length > 2000) {
      return res.status(400).json({ success: false, error: "Ghi chú không được vượt quá 2000 ký tự" });
    }

    // Validate gradingFiles if provided
    if (gradingFiles && (!Array.isArray(gradingFiles) || gradingFiles.length > 10)) {
      return res.status(400).json({ success: false, error: "Tối đa 10 tệp đính kèm" });
    }

    // Find the student account by their ID (e.g., "SV0001")
    const studentAccount = await Account.findOne({ id: studentId });
    if (!studentAccount) {
      return res.status(404).json({ success: false, error: "Không tìm thấy sinh viên" });
    }

    const grade = await InternshipGrade.findOne({ student: studentAccount._id });
    if (!grade) {
      return res.status(404).json({ success: false, error: "Không tìm thấy thông tin điểm" });
    }

    // Check if supervisor owns this grade record
    if (grade.supervisor.toString() !== req.account._id.toString()) {
      return res.status(403).json({ success: false, error: "Bạn không có quyền cập nhật điểm sinh viên này" });
    }

    if (gradeComponents) {
      grade.gradeComponents = gradeComponents;
      grade.calculateFinalGrade();
    }
    
    if (supervisorFinalComment !== undefined) {
      grade.supervisorFinalComment = supervisorFinalComment;
    }
    
    if (gradingNotes !== undefined) {
      grade.gradingNotes = gradingNotes;
    }
    
    if (gradingFiles) {
      grade.gradingFiles = gradingFiles;
    }

    // Update status to draft_completed if all components have scores
    const allComponentsGraded = grade.gradeComponents.every(component => component.score > 0);
    if (allComponentsGraded && grade.status === 'in_progress') {
      grade.status = 'draft_completed';
    }

    await grade.save();

    // Send notification to student about grade update
    const io = req.app.get('io');
    await notificationService.createNotification({
      recipient: grade.student,
      sender: req.account._id,
      type: 'grade-updated',
      title: 'Cập nhật điểm thực tập',
      message: `Giảng viên ${req.account.name} đã cập nhật điểm thực tập của bạn${grade.finalGrade ? ` (Điểm: ${grade.finalGrade.toFixed(1)})` : ''}`,
      link: `/my-internship`,
      priority: 'normal',
      metadata: { 
        gradeId: grade._id.toString(),
        finalGrade: grade.finalGrade
      }
    }, io);

    res.json({
      success: true,
      grade: {
        gradeComponents: grade.gradeComponents,
        finalGrade: grade.finalGrade,
        letterGrade: grade.letterGrade,
        status: grade.status,
        supervisorFinalComment: grade.supervisorFinalComment,
        gradingNotes: grade.gradingNotes,
        gradingFiles: grade.gradingFiles
      }
    });
  } catch (error) {
    console.error("Update grades error:", error);
    res.status(500).json({ success: false, error: "Lỗi server" });
  }
});

// Submit grades to BCN
router.post("/students/:studentId/submit", authenticate, authorize(["giang-vien"]), async (req, res) => {
  try {
    const { studentId } = req.params;

    // First find the student account by their ID (e.g., "SV0001")
    const studentAccount = await Account.findOne({ id: studentId });
    if (!studentAccount) {
      return res.status(404).json({ success: false, error: "Không tìm thấy sinh viên" });
    }

    const grade = await InternshipGrade.findOne({ student: studentAccount._id })
      .populate('student', 'id name email')
      .populate('internshipSubject', 'id title');

    if (!grade) {
      return res.status(404).json({ success: false, error: "Không tìm thấy thông tin điểm" });
    }

    // Check if supervisor owns this grade record
    if (grade.supervisor.toString() !== req.account._id.toString()) {
      return res.status(403).json({ success: false, error: "Bạn không có quyền submit điểm sinh viên này" });
    }

    // Validate that all required components are completed
    const allComponentsGraded = grade.gradeComponents.every(component => component.score > 0);
    if (!allComponentsGraded) {
      return res.status(400).json({ success: false, error: "Vui lòng hoàn thành chấm điểm tất cả các thành phần" });
    }

    if (!grade.supervisorFinalComment || grade.supervisorFinalComment.trim() === '') {
      return res.status(400).json({ success: false, error: "Vui lòng nhập nhận xét cuối cùng" });
    }

    grade.status = 'submitted';
    grade.submittedToBCN = true;
    grade.submittedAt = new Date();
    await grade.save();

    // Find BCN of this subject to send notification
    const bcnProfile = await BanChuNhiem.findOne({ 
      internshipSubject: grade.internshipSubject._id 
    });

    if (bcnProfile) {
      const io = req.app.get('io');
      await notificationService.createNotification({
        recipient: bcnProfile.account,
        sender: req.account._id,
        type: 'grade-submitted',
        title: 'Điểm thực tập cần duyệt',
        message: `Giảng viên ${req.account.name} đã nộp điểm thực tập cho sinh viên ${grade.student.name} (Điểm: ${grade.finalGrade.toFixed(1)})`,
        link: `/grade-review`,
        priority: 'high',
        metadata: { 
          gradeId: grade._id.toString(),
          studentId: grade.student.id,
          subjectId: grade.internshipSubject.id
        }
      }, io);
    }

    // Also notify student
    const io = req.app.get('io');
    await notificationService.createNotification({
      recipient: grade.student._id,
      sender: req.account._id,
      type: 'grade-submitted',
      title: 'Điểm thực tập đã được nộp',
      message: `Giảng viên ${req.account.name} đã nộp điểm thực tập của bạn lên khoa để duyệt (Điểm: ${grade.finalGrade.toFixed(1)})`,
      link: `/my-internship`,
      priority: 'normal',
      metadata: { 
        gradeId: grade._id.toString(),
        finalGrade: grade.finalGrade
      }
    }, io);

    res.json({
      success: true,
      message: "Đã nộp điểm thành công",
      grade: {
        status: grade.status,
        submittedToBCN: grade.submittedToBCN,
        submittedAt: grade.submittedAt
      }
    });
  } catch (error) {
    console.error("Submit grades error:", error);
    res.status(500).json({ success: false, error: "Lỗi server" });
  }
});

// Add custom milestone
router.post("/students/:studentId/milestones", authenticate, authorize(["giang-vien"]), async (req, res) => {
  try {
    const { studentId } = req.params;
    const { title, description, dueDate } = req.body;

    // Find student by Account.id
    const studentAccount = await Account.findOne({ id: studentId });
    if (!studentAccount) {
      return res.status(404).json({ success: false, error: "Không tìm thấy sinh viên" });
    }

    const grade = await InternshipGrade.findOne({ student: studentAccount._id });
    if (!grade) {
      return res.status(404).json({ success: false, error: "Không tìm thấy thông tin điểm" });
    }

    // Add custom milestone
    const newMilestone = {
      type: 'custom',
      title,
      description: description || '',
      dueDate: new Date(dueDate),
      status: 'pending',
      isCustom: true
    };

    grade.milestones.push(newMilestone);
    await grade.save();

    const io = req.app.get('io');
    await notificationService.createNotification({
      recipient: grade.student,
      sender: req.account._id,
      type: 'milestone-added',
      title: 'Thêm mốc thời gian mới',
      message: `Giảng viên ${req.account.name} đã thêm mốc thời gian mới: ${title}`,
      link: `/my-internship`,
      priority: 'normal',
      metadata: { 
        gradeId: grade._id.toString(),
        milestoneTitle: title
      }
    }, io);

    res.json({
      success: true,
      message: "Đã thêm mốc thời gian thành công",
      milestone: newMilestone
    });
  } catch (error) {
    console.error("Add milestone error:", error);
    res.status(500).json({ success: false, error: "Lỗi server" });
  }
});

// Edit milestone details (title, description, dueDate)
router.put("/students/:studentId/milestones/:milestoneId/details", authenticate, authorize(["giang-vien"]), async (req, res) => {
  try {
    const { studentId, milestoneId } = req.params;
    const { title, description, dueDate } = req.body;

    // Find student by Account.id
    const studentAccount = await Account.findOne({ id: studentId });
    if (!studentAccount) {
      return res.status(404).json({ success: false, error: "Không tìm thấy sinh viên" });
    }

    const grade = await InternshipGrade.findOne({ student: studentAccount._id });
    if (!grade) {
      return res.status(404).json({ success: false, error: "Không tìm thấy thông tin điểm" });
    }

    // Check if supervisor owns this grade record
    if (grade.supervisor.toString() !== req.account._id.toString()) {
      return res.status(403).json({ success: false, error: "Bạn không có quyền cập nhật milestone này" });
    }

    const milestone = grade.milestones.id(milestoneId);
    if (!milestone) {
      return res.status(404).json({ success: false, error: "Không tìm thấy milestone" });
    }

    // Only allow editing custom milestones or certain fields of default milestones
    if (title !== undefined) milestone.title = title;
    if (description !== undefined) milestone.description = description;
    if (dueDate !== undefined) milestone.dueDate = new Date(dueDate);

    await grade.save();

    const io = req.app.get('io');
    await notificationService.createNotification({
      recipient: grade.student,
      sender: req.account._id,
      type: 'milestone-updated',
      title: 'Cập nhật mốc thời gian',
      message: `Giảng viên ${req.account.name} đã cập nhật mốc thời gian: ${milestone.title}`,
      link: `/my-internship`,
      priority: 'normal',
      metadata: { 
        gradeId: grade._id.toString(),
        milestoneTitle: milestone.title
      }
    }, io);

    res.json({
      success: true,
      message: "Đã cập nhật mốc thời gian thành công",
      milestone: milestone
    });
  } catch (error) {
    console.error("Edit milestone error:", error);
    res.status(500).json({ success: false, error: "Lỗi server" });
  }
});

// Delete milestone (only custom milestones)
router.delete("/students/:studentId/milestones/:milestoneId", authenticate, authorize(["giang-vien"]), async (req, res) => {
  try {
    const { studentId, milestoneId } = req.params;

    // Find student by Account.id
    const studentAccount = await Account.findOne({ id: studentId });
    if (!studentAccount) {
      return res.status(404).json({ success: false, error: "Không tìm thấy sinh viên" });
    }

    const grade = await InternshipGrade.findOne({ student: studentAccount._id });
    if (!grade) {
      return res.status(404).json({ success: false, error: "Không tìm thấy thông tin điểm" });
    }

    // Check if supervisor owns this grade record
    if (grade.supervisor.toString() !== req.account._id.toString()) {
      return res.status(403).json({ success: false, error: "Bạn không có quyền xóa milestone này" });
    }

    const milestone = grade.milestones.id(milestoneId);
    if (!milestone) {
      return res.status(404).json({ success: false, error: "Không tìm thấy milestone" });
    }

    // Only allow deleting custom milestones
    if (!milestone.isCustom) {
      return res.status(400).json({ success: false, error: "Không thể xóa mốc thời gian mặc định" });
    }

    // Remove the milestone
    grade.milestones.pull(milestoneId);
    await grade.save();

    const io = req.app.get('io');
    await notificationService.createNotification({
      recipient: grade.student,
      sender: req.account._id,
      type: 'milestone-updated',
      title: 'Xóa mốc thời gian',
      message: `Giảng viên ${req.account.name} đã xóa mốc thời gian: ${milestone.title}`,
      link: `/my-internship`,
      priority: 'normal',
      metadata: { 
        gradeId: grade._id.toString(),
        milestoneTitle: milestone.title
      }
    }, io);

    res.json({
      success: true,
      message: "Đã xóa mốc thời gian thành công"
    });
  } catch (error) {
    console.error("Delete milestone error:", error);
    res.status(500).json({ success: false, error: "Lỗi server" });
  }
});

// BCN routes for grade review

// Get all submitted grades for BCN review (including approved/rejected)
router.get("/bcn/submitted-grades", authenticate, authorize(["ban-chu-nhiem"]), async (req, res) => {
  try {
    // Find BCN's managed subject
    const bcnProfile = await BanChuNhiem.findOne({ account: req.account._id })
      .populate('internshipSubject', 'id title');

    if (!bcnProfile) {
      return res.json({
        success: true,
        grades: [],
        message: "Bạn chưa được phân công quản lý môn thực tập nào"
      });
    }

    const grades = await InternshipGrade.find({
      internshipSubject: bcnProfile.internshipSubject._id,
      status: { $in: ['submitted', 'approved', 'rejected'] }
    })
      .populate('student', 'id name email')
      .populate('supervisor', 'id name email')
      .populate('internshipSubject', 'id title')
      .sort({ submittedAt: -1 });

    res.json({
      success: true,
      grades: grades.map(grade => ({
        ...grade.toJSON(),
        id: grade._id,
        subject: grade.internshipSubject
      }))
    });
  } catch (error) {
    console.error("Get BCN submitted grades error:", error);
    res.status(500).json({ success: false, error: "Lỗi server" });
  }
});

// Get all pending grades for BCN review (only submitted status)
router.get("/bcn/pending-grades", authenticate, authorize(["ban-chu-nhiem"]), async (req, res) => {
  try {
    // Find BCN's managed subject
    const bcnProfile = await BanChuNhiem.findOne({ account: req.account._id })
      .populate('internshipSubject', 'id title');

    if (!bcnProfile) {
      return res.json({
        success: true,
        grades: [],
        message: "Bạn chưa được phân công quản lý môn thực tập nào"
      });
    }

    const grades = await InternshipGrade.find({
      internshipSubject: bcnProfile.internshipSubject._id,
      status: 'submitted'
    })
      .populate('student', 'id name email')
      .populate('supervisor', 'id name email')
      .sort({ submittedAt: -1 });

    res.json({
      success: true,
      subject: {
        id: bcnProfile.internshipSubject.id,
        title: bcnProfile.internshipSubject.title
      },
      grades: grades.map(grade => ({
        id: grade._id,
        student: grade.student,
        supervisor: grade.supervisor,
        finalGrade: grade.finalGrade,
        letterGrade: grade.letterGrade,
        submittedAt: grade.submittedAt,
        supervisorFinalComment: grade.supervisorFinalComment
      }))
    });
  } catch (error) {
    console.error("Get BCN pending grades error:", error);
    res.status(500).json({ success: false, error: "Lỗi server" });
  }
});

// Get grade details for BCN review
router.get("/bcn/grades/:gradeId", authenticate, authorize(["ban-chu-nhiem"]), async (req, res) => {
  try {
    const { gradeId } = req.params;

    const grade = await InternshipGrade.findById(gradeId)
      .populate('student', 'id name email')
      .populate('supervisor', 'id name email')
      .populate('internshipSubject', 'id title');

    if (!grade) {
      return res.status(404).json({ success: false, error: "Không tìm thấy thông tin điểm" });
    }

    // Check if BCN manages this subject
    const bcnProfile = await BanChuNhiem.findOne({ 
      account: req.account._id,
      internshipSubject: grade.internshipSubject._id 
    });

    if (!bcnProfile) {
      return res.status(403).json({ success: false, error: "Bạn không có quyền xem điểm này" });
    }

    res.json({
      success: true,
      grade: {
        ...grade.toJSON(),
        id: grade._id,
        subject: grade.internshipSubject
      }
    });
  } catch (error) {
    console.error("Get grade details for review error:", error);
    res.status(500).json({ success: false, error: "Lỗi server" });
  }
});

// Approve or reject grade by BCN
router.post("/bcn/grades/:gradeId/review", authenticate, authorize(["ban-chu-nhiem"]), async (req, res) => {
  try {
    const { gradeId } = req.params;
    const { action, bcnComment } = req.body; // action: 'approve' or 'reject'

    const grade = await InternshipGrade.findById(gradeId)
      .populate('student', 'id name email')
      .populate('supervisor', 'id name email')
      .populate('internshipSubject', 'id title');

    if (!grade) {
      return res.status(404).json({ success: false, error: "Không tìm thấy thông tin điểm" });
    }

    // Check if BCN manages this subject
    const bcnProfile = await BanChuNhiem.findOne({ 
      account: req.account._id,
      internshipSubject: grade.internshipSubject._id 
    });
    if (!bcnProfile) {
      return res.status(403).json({ success: false, error: "Bạn không quản lý môn thực tập này" });
    }

    if (grade.status !== 'submitted') {
      return res.status(400).json({ success: false, error: "Điểm này không ở trạng thái chờ duyệt" });
    }

    grade.status = action === 'approve' ? 'approved' : 'rejected';
    grade.bcnComment = bcnComment || '';
    grade.approvedBy = req.account._id;
    grade.approvedAt = new Date();

    await grade.save();

    const io = req.app.get('io');

    // Notify supervisor
    await notificationService.createNotification({
      recipient: grade.supervisor._id,
      sender: req.account._id,
      type: action === 'approve' ? 'grade-approved' : 'grade-rejected',
      title: action === 'approve' ? 'Điểm thực tập đã được duyệt' : 'Điểm thực tập bị từ chối',
      message: `BCN ${req.account.name} đã ${action === 'approve' ? 'duyệt' : 'từ chối'} điểm thực tập cho sinh viên ${grade.student.name}${bcnComment ? `: ${bcnComment}` : ''}`,
      link: `/grade-management`,
      priority: 'normal',
      metadata: { 
        gradeId: grade._id.toString(),
        studentId: grade.student.id,
        action: action
      }
    }, io);

    // Notify student
    await notificationService.createNotification({
      recipient: grade.student._id,
      sender: req.account._id,
      type: action === 'approve' ? 'grade-approved' : 'grade-rejected',
      title: action === 'approve' ? 'Điểm thực tập đã được phê duyệt' : 'Điểm thực tập cần xem xét lại',
      message: action === 'approve' 
        ? `Điểm thực tập của bạn đã được BCN phê duyệt (Điểm: ${grade.finalGrade.toFixed(1)})`
        : `Điểm thực tập của bạn cần được xem xét lại${bcnComment ? `: ${bcnComment}` : ''}`,
      link: `/my-internship`,
      priority: action === 'approve' ? 'normal' : 'high',
      metadata: { 
        gradeId: grade._id.toString(),
        finalGrade: grade.finalGrade,
        action: action
      }
    }, io);

    res.json({
      success: true,
      message: action === 'approve' ? "Đã duyệt điểm thành công" : "Đã từ chối điểm",
      grade: {
        status: grade.status,
        bcnComment: grade.bcnComment,
        approvedAt: grade.approvedAt
      }
    });
  } catch (error) {
    console.error("Review grade error:", error);
    res.status(500).json({ success: false, error: "Lỗi server" });
  }
});

// Student route to view their own progress
router.get("/student/my-progress", authenticate, authorize(["sinh-vien"]), async (req, res) => {
  try {
    const grade = await InternshipGrade.findOne({ student: req.account._id })
      .populate('supervisor', 'id name email')
      .populate('internshipSubject', 'id title');

    if (!grade) {
      return res.json({
        success: true,
        grade: null,
        message: "Chưa có thông tin điểm thực tập"
      });
    }

    res.json({
      success: true,
      grade: {
        id: grade._id,
        supervisor: grade.supervisor,
        subject: grade.internshipSubject,
        workType: grade.workType,
        company: grade.company,
        projectTopic: grade.projectTopic,
        status: grade.status,
        startDate: grade.startDate,
        endDate: grade.endDate,
        milestones: grade.milestones.map(m => ({
          id: m._id,
          type: m.type,
          title: m.title,
          dueDate: m.dueDate,
          status: m.status,
          completedAt: m.completedAt,
          supervisorNotes: m.supervisorNotes
        })),
        progressPercentage: grade.getProgressPercentage(),
        finalGrade: grade.status === 'approved' ? grade.finalGrade : null,
        letterGrade: grade.status === 'approved' ? grade.letterGrade : null,
        supervisorFinalComment: grade.status === 'submitted' || grade.status === 'approved' ? grade.supervisorFinalComment : null,
        submittedToBCN: grade.submittedToBCN
      }
    });
  } catch (error) {
    console.error("Get student progress error:", error);
    res.status(500).json({ success: false, error: "Lỗi server" });
  }
});

// Get grade statistics for PDT (PDT only)
router.get("/pdt/statistics", authenticate, async (req, res) => {
  try {
    if (req.account.role !== "phong-dao-tao") {
      return res.status(403).json({ error: "Chỉ Phòng Đào Tạo mới có quyền truy cập" });
    }

    const { page = 1, limit = 20, status, workType, subjectId, supervisorId, search } = req.query;
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));

    // Build query
    const query = {};
    if (status && status !== "all") query.status = status;
    if (workType && workType !== "all") query.workType = workType;
    if (subjectId) query.internshipSubject = subjectId;
    if (supervisorId) query.supervisor = supervisorId;

    // Handle text search
    let grades;
    if (search) {
      grades = await InternshipGrade.find(query)
        .populate('student', 'id name email')
        .populate('supervisor', 'id name email')
        .populate('internshipSubject', 'id title')
        .sort({ updatedAt: -1 });
      
      const searchLower = search.toLowerCase();
      grades = grades.filter(grade => 
        grade.student?.name.toLowerCase().includes(searchLower) ||
        grade.supervisor?.name.toLowerCase().includes(searchLower) ||
        grade.internshipSubject?.title.toLowerCase().includes(searchLower)
      );
      
      const total = grades.length;
      grades = grades.slice((pageNum - 1) * limitNum, pageNum * limitNum);
      
      const statistics = await InternshipGrade.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            totalGrades: { $sum: 1 },
            byStatus: { $push: "$status" },
            byWorkType: { $push: "$workType" },
            finalGrades: { $push: "$finalGrade" },
            letterGrades: { $push: "$letterGrade" },
            submittedCount: {
              $sum: { $cond: [{ $eq: ["$submittedToBCN", true] }, 1, 0] }
            },
            approvedCount: {
              $sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] }
            }
          }
        }
      ]);

      const stats = statistics[0] || { 
        totalGrades: 0, 
        byStatus: [], 
        byWorkType: [], 
        finalGrades: [],
        letterGrades: [],
        submittedCount: 0,
        approvedCount: 0
      };
      
      const statusCounts = stats.byStatus.reduce((acc, status) => {
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});

      const workTypeCounts = stats.byWorkType.reduce((acc, type) => {
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {});

      const letterGradeCounts = stats.letterGrades.filter(g => g).reduce((acc, grade) => {
        acc[grade] = (acc[grade] || 0) + 1;
        return acc;
      }, {});

      const validGrades = stats.finalGrades.filter(g => g !== null && g !== undefined);
      const averageGrade = validGrades.length > 0 
        ? (validGrades.reduce((sum, g) => sum + g, 0) / validGrades.length).toFixed(2)
        : 0;

      const passCount = validGrades.filter(g => g >= 5.0).length;
      const passRate = validGrades.length > 0 
        ? ((passCount / validGrades.length) * 100).toFixed(1)
        : 0;

      return res.json({
        success: true,
        grades: grades.map(grade => ({
          id: grade._id,
          student: grade.student ? {
            id: grade.student.id,
            name: grade.student.name,
            email: grade.student.email
          } : null,
          supervisor: grade.supervisor ? {
            id: grade.supervisor.id,
            name: grade.supervisor.name
          } : null,
          subject: grade.internshipSubject ? {
            id: grade.internshipSubject.id,
            title: grade.internshipSubject.title
          } : null,
          workType: grade.workType,
          company: grade.company,
          projectTopic: grade.projectTopic,
          status: grade.status,
          finalGrade: grade.finalGrade,
          letterGrade: grade.letterGrade,
          progressPercentage: grade.progressPercentage || 0,
          submittedToBCN: grade.submittedToBCN,
          startDate: grade.startDate,
          endDate: grade.endDate,
          updatedAt: grade.updatedAt
        })),
        pagination: {
          page: pageNum,
          pages: Math.max(1, Math.ceil(total / limitNum)),
          total
        },
        statistics: {
          total: stats.totalGrades,
          byStatus: statusCounts,
          byWorkType: workTypeCounts,
          byLetterGrade: letterGradeCounts,
          averageGrade: Number(averageGrade),
          passRate: Number(passRate),
          submittedCount: stats.submittedCount,
          approvedCount: stats.approvedCount,
          totalFinalized: validGrades.length
        }
      });
    }

    const [gradesResult, total, statistics] = await Promise.all([
      InternshipGrade.find(query)
        .populate('student', 'id name email')
        .populate('supervisor', 'id name email')
        .populate('internshipSubject', 'id title')
        .sort({ updatedAt: -1 })
        .limit(limitNum)
        .skip((pageNum - 1) * limitNum),
      InternshipGrade.countDocuments(query),
      InternshipGrade.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            totalGrades: { $sum: 1 },
            byStatus: { $push: "$status" },
            byWorkType: { $push: "$workType" },
            finalGrades: { $push: "$finalGrade" },
            letterGrades: { $push: "$letterGrade" },
            submittedCount: {
              $sum: { $cond: [{ $eq: ["$submittedToBCN", true] }, 1, 0] }
            },
            approvedCount: {
              $sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] }
            }
          }
        }
      ])
    ]);

    grades = gradesResult;

    // Calculate statistics
    const stats = statistics[0] || { 
      totalGrades: 0, 
      byStatus: [], 
      byWorkType: [], 
      finalGrades: [],
      letterGrades: [],
      submittedCount: 0,
      approvedCount: 0
    };
    
    const statusCounts = stats.byStatus.reduce((acc, status) => {
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    const workTypeCounts = stats.byWorkType.reduce((acc, type) => {
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    const letterGradeCounts = stats.letterGrades.filter(g => g).reduce((acc, grade) => {
      acc[grade] = (acc[grade] || 0) + 1;
      return acc;
    }, {});

    // Calculate average grade (only from finalized grades)
    const validGrades = stats.finalGrades.filter(g => g !== null && g !== undefined);
    const averageGrade = validGrades.length > 0 
      ? (validGrades.reduce((sum, g) => sum + g, 0) / validGrades.length).toFixed(2)
      : 0;

    // Calculate pass rate (grades >= 5.0)
    const passCount = validGrades.filter(g => g >= 5.0).length;
    const passRate = validGrades.length > 0 
      ? ((passCount / validGrades.length) * 100).toFixed(1)
      : 0;

    res.json({
      success: true,
      grades: grades.map(grade => ({
        id: grade._id,
        student: grade.student ? {
          id: grade.student.id,
          name: grade.student.name,
          email: grade.student.email
        } : null,
        supervisor: grade.supervisor ? {
          id: grade.supervisor.id,
          name: grade.supervisor.name
        } : null,
        subject: grade.internshipSubject ? {
          id: grade.internshipSubject.id,
          title: grade.internshipSubject.title
        } : null,
          workType: grade.workType,
          company: grade.company,
          projectTopic: grade.projectTopic,
          status: grade.status,
        finalGrade: grade.finalGrade,
        letterGrade: grade.letterGrade,
        progressPercentage: grade.getProgressPercentage(),
        submittedToBCN: grade.submittedToBCN,
        startDate: grade.startDate,
        endDate: grade.endDate,
        updatedAt: grade.updatedAt
      })),
      pagination: {
        page: pageNum,
        pages: Math.max(1, Math.ceil(total / limitNum)),
        total
      },
      statistics: {
        total: stats.totalGrades,
        byStatus: statusCounts,
        byWorkType: workTypeCounts,
        byLetterGrade: letterGradeCounts,
        averageGrade: parseFloat(averageGrade),
        passRate: parseFloat(passRate),
        submittedCount: stats.submittedCount,
        approvedCount: stats.approvedCount,
        totalFinalized: validGrades.length
      }
    });
  } catch (error) {
    console.error("Get PDT grade statistics error:", error);
    res.status(500).json({ success: false, error: "Lỗi server" });
  }
});

// Update work type and company information for a grade
router.put("/students/:studentId/work-info", authenticate, authorize(["giang-vien"]), async (req, res) => {
  try {
    const { studentId } = req.params;
    const { workType, company, projectTopic } = req.body;

    // Find the student account
    const studentAccount = await Account.findOne({ id: studentId });
    if (!studentAccount) {
      return res.status(404).json({ success: false, error: "Không tìm thấy sinh viên" });
    }

    // Find the grade record
    let grade = await InternshipGrade.findOne({ student: studentAccount._id })
      .populate('student', 'id name email')
      .populate('supervisor', 'id name email')
      .populate('internshipSubject', 'id title');

    if (!grade) {
      return res.status(404).json({ success: false, error: "Không tìm thấy thông tin điểm" });
    }

    // Check if the requesting user is the supervisor
    if (grade.supervisor._id.toString() !== req.account._id.toString()) {
      return res.status(403).json({ success: false, error: "Bạn không có quyền cập nhật thông tin này" });
    }

    // Validate workType
    if (!['thuc_tap', 'do_an'].includes(workType)) {
      return res.status(400).json({ success: false, error: "Loại công việc không hợp lệ" });
    }

    // Update work information
    grade.workType = workType;

    if (workType === 'thuc_tap' && company) {
      // Validate company information
      if (!company.name || !company.supervisorName || !company.address) {
        return res.status(400).json({ 
          success: false, 
          error: "Thông tin doanh nghiệp không đầy đủ" 
        });
      }
      grade.company = {
        name: company.name,
        supervisorName: company.supervisorName,
        supervisorEmail: company.supervisorEmail || '',
        supervisorPhone: company.supervisorPhone || '',
        address: company.address
      };
    } else if (workType === 'do_an') {
      // Clear company info for thesis projects
      grade.company = undefined;
      if (projectTopic) {
        grade.projectTopic = projectTopic;
      }
    }

    // Update project topic if provided
    if (projectTopic) {
      grade.projectTopic = projectTopic;
    }

    await grade.save();

    res.json({
      success: true,
      message: "Đã cập nhật thông tin thành công",
      grade: {
        workType: grade.workType,
        company: grade.company,
        projectTopic: grade.projectTopic,
        gradeComponents: grade.gradeComponents,
        milestones: grade.milestones
      }
    });
  } catch (error) {
    console.error("Update work info error:", error);
    res.status(500).json({ success: false, error: "Lỗi server" });
  }
});

export default router;