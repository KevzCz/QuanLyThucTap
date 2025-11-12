import express from "express";
import { authenticate, authBCN, authSV } from "../middleware/auth.js";
import GradeAppeal from "../models/GradeAppeal.js";
import InternshipGrade from "../models/InternshipGrade.js";
import SinhVien from "../models/SinhVien.js";
import BanChuNhiem from "../models/BanChuNhiem.js";
import GiangVien from "../models/GiangVien.js";
import Account from "../models/Account.js";
import notificationService from "../services/notificationService.js";

const router = express.Router();

// Create grade appeal (Student only)
router.post("/", ...authSV, async (req, res) => {
  try {
    const { gradeId, appealReason } = req.body;

    if (!gradeId || !appealReason?.trim()) {
      return res.status(400).json({ error: "Vui lòng cung cấp đầy đủ thông tin" });
    }

    // Find the grade
    const grade = await InternshipGrade.findById(gradeId)
      .populate('student', 'id name email')
      .populate('supervisor', 'id name email');

    if (!grade) {
      return res.status(404).json({ error: "Không tìm thấy điểm" });
    }

    // Verify this is the student's grade
    if (grade.student._id.toString() !== req.account._id.toString()) {
      return res.status(403).json({ error: "Bạn không có quyền phúc khảo điểm này" });
    }

    // Check if grade is approved
    if (grade.status !== 'approved') {
      return res.status(400).json({ error: "Chỉ có thể phúc khảo điểm đã được duyệt" });
    }

    // Check if there's already a pending/reviewing appeal
    if (['pending', 'reviewing'].includes(grade.appealStatus)) {
      return res.status(400).json({ error: "Đã có yêu cầu phúc khảo đang chờ xử lý" });
    }

    // Get student's khoa
    const student = await SinhVien.findOne({ account: req.account._id });
    if (!student) {
      return res.status(404).json({ error: "Không tìm thấy thông tin sinh viên" });
    }

    // Create appeal
    const appeal = await GradeAppeal.create({
      student: req.account._id,
      internshipGrade: gradeId,
      originalSupervisor: grade.supervisor._id,
      appealReason: appealReason.trim(),
      khoa: student.khoa,
      status: 'pending'
    });

    // Update grade appeal status
    grade.appealStatus = 'pending';
    await grade.save();

    // Notify BCN
    const bcn = await BanChuNhiem.findOne({ khoa: student.khoa });
    if (bcn) {
      const io = req.app.get('io');
      await notificationService.createNotification({
        recipient: bcn.account,
        sender: req.account._id,
        type: 'grade-appeal-submitted',
        title: 'Yêu cầu phúc khảo điểm mới',
        message: `${grade.student.name} (${grade.student.id}) đã gửi yêu cầu phúc khảo điểm`,
        link: `/bcn/request-management`,
        priority: 'high',
        metadata: {
          appealId: appeal._id.toString(),
          gradeId: grade._id.toString(),
          studentId: grade.student.id
        }
      }, io);
    }

    res.json({
      success: true,
      message: "Đã gửi yêu cầu phúc khảo thành công",
      appeal: await appeal.populate([
        { path: 'student', select: 'id name email' },
        { path: 'originalSupervisor', select: 'id name email' }
      ])
    });
  } catch (error) {
    console.error("Error creating grade appeal:", error);
    res.status(500).json({ error: "Lỗi khi tạo yêu cầu phúc khảo" });
  }
});

// Get student's appeals (Student only)
router.get("/my-appeals", ...authSV, async (req, res) => {
  try {
    const appeals = await GradeAppeal.find({ student: req.account._id })
      .populate('internshipGrade')
      .populate('originalSupervisor', 'id name email')
      .populate('newSupervisor', 'id name email')
      .populate('reviewedBy', 'id name email')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ appeals });
  } catch (error) {
    console.error("Error fetching student appeals:", error);
    res.status(500).json({ error: "Lỗi khi tải danh sách phúc khảo" });
  }
});

// Get appeals for BCN (BCN only)
router.get("/bcn", ...authBCN, async (req, res) => {
  try {
    const { status } = req.query;

    // Get BCN's khoa
    const bcn = await BanChuNhiem.findOne({ account: req.account._id });
    if (!bcn) {
      return res.status(404).json({ error: "Không tìm thấy thông tin BCN" });
    }

    // Build query
    const query = { khoa: bcn.khoa };
    if (status) {
      query.status = status;
    }

    const appeals = await GradeAppeal.find(query)
      .populate('student', 'id name email')
      .populate('internshipGrade')
      .populate('originalSupervisor', 'id name email')
      .populate('newSupervisor', 'id name email')
      .populate('reviewedBy', 'id name email')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ appeals });
  } catch (error) {
    console.error("Error fetching BCN appeals:", error);
    res.status(500).json({ error: "Lỗi khi tải danh sách phúc khảo" });
  }
});

// Accept appeal and assign new supervisor (BCN only)
router.put("/:id/accept", ...authBCN, async (req, res) => {
  try {
    const { newSupervisorId, reviewNote } = req.body;

    if (!newSupervisorId) {
      return res.status(400).json({ error: "Vui lòng chọn giảng viên phúc khảo" });
    }

    // Get BCN's khoa
    const bcn = await BanChuNhiem.findOne({ account: req.account._id });
    if (!bcn) {
      return res.status(404).json({ error: "Không tìm thấy thông tin BCN" });
    }

    // Find appeal
    const appeal = await GradeAppeal.findById(req.params.id)
      .populate('student', 'id name email')
      .populate('internshipGrade')
      .populate('originalSupervisor', 'id name email');

    if (!appeal) {
      return res.status(404).json({ error: "Không tìm thấy yêu cầu phúc khảo" });
    }

    // Verify BCN manages this khoa
    if (appeal.khoa !== bcn.khoa) {
      return res.status(403).json({ error: "Bạn không có quyền xử lý yêu cầu này" });
    }

    // Verify appeal is pending
    if (appeal.status !== 'pending') {
      return res.status(400).json({ error: "Yêu cầu phúc khảo đã được xử lý" });
    }

    // Verify new supervisor exists and is in the same khoa
    const newSupervisor = await GiangVien.findOne({ account: newSupervisorId });
    if (!newSupervisor) {
      return res.status(404).json({ error: "Không tìm thấy giảng viên" });
    }

    if (newSupervisor.khoa !== bcn.khoa) {
      return res.status(400).json({ error: "Giảng viên phải thuộc cùng khoa" });
    }

    // Verify new supervisor is different from original
    if (newSupervisorId === appeal.originalSupervisor._id.toString()) {
      return res.status(400).json({ error: "Vui lòng chọn giảng viên khác với giảng viên hướng dẫn ban đầu" });
    }

    // Update appeal
    appeal.status = 'reviewing';
    appeal.newSupervisor = newSupervisorId;
    appeal.reviewedBy = req.account._id;
    appeal.reviewedAt = new Date();
    appeal.reviewNote = reviewNote || '';
    appeal.assignedAt = new Date();
    await appeal.save();

    // Update grade
    const grade = await InternshipGrade.findById(appeal.internshipGrade._id);
    grade.appealStatus = 'reviewing';
    grade.appealReviewer = newSupervisorId;
    await grade.save();

    const io = req.app.get('io');

    // Notify student
    await notificationService.createNotification({
      recipient: appeal.student._id,
      sender: req.account._id,
      type: 'grade-appeal-accepted',
      title: 'Yêu cầu phúc khảo được chấp nhận',
      message: `Yêu cầu phúc khảo điểm của bạn đã được chấp nhận và đang chờ giảng viên phúc khảo`,
      link: `/student-grades`,
      priority: 'high'
    }, io);

    // Notify new supervisor
    await notificationService.createNotification({
      recipient: newSupervisorId,
      sender: req.account._id,
      type: 'student-assigned',
      title: 'Được phân công phúc khảo điểm',
      message: `Bạn được phân công phúc khảo điểm cho sinh viên ${appeal.student.name} (${appeal.student.id})`,
      link: `/teacher-grade-management`,
      priority: 'high',
      metadata: {
        appealId: appeal._id.toString(),
        gradeId: appeal.internshipGrade.toString(),
        studentId: appeal.student.id
      }
    }, io);

    res.json({
      success: true,
      message: "Đã chấp nhận yêu cầu phúc khảo và phân công giảng viên",
      appeal: await appeal.populate('newSupervisor', 'id name email')
    });
  } catch (error) {
    console.error("Error accepting appeal:", error);
    res.status(500).json({ error: "Lỗi khi chấp nhận yêu cầu phúc khảo" });
  }
});

// Reject appeal (BCN only)
router.put("/:id/reject", ...authBCN, async (req, res) => {
  try {
    const { reviewNote } = req.body;

    // Get BCN's khoa
    const bcn = await BanChuNhiem.findOne({ account: req.account._id });
    if (!bcn) {
      return res.status(404).json({ error: "Không tìm thấy thông tin BCN" });
    }

    // Find appeal
    const appeal = await GradeAppeal.findById(req.params.id)
      .populate('student', 'id name email')
      .populate('internshipGrade');

    if (!appeal) {
      return res.status(404).json({ error: "Không tìm thấy yêu cầu phúc khảo" });
    }

    // Verify BCN manages this khoa
    if (appeal.khoa !== bcn.khoa) {
      return res.status(403).json({ error: "Bạn không có quyền xử lý yêu cầu này" });
    }

    // Verify appeal is pending
    if (appeal.status !== 'pending') {
      return res.status(400).json({ error: "Yêu cầu phúc khảo đã được xử lý" });
    }

    // Update appeal
    appeal.status = 'rejected';
    appeal.reviewedBy = req.account._id;
    appeal.reviewedAt = new Date();
    appeal.reviewNote = reviewNote || '';
    await appeal.save();

    // Update grade
    const grade = await InternshipGrade.findById(appeal.internshipGrade._id);
    grade.appealStatus = 'rejected';
    await grade.save();

    const io = req.app.get('io');

    // Notify student
    await notificationService.createNotification({
      recipient: appeal.student._id,
      sender: req.account._id,
      type: 'grade-appeal-rejected',
      title: 'Yêu cầu phúc khảo bị từ chối',
      message: `Yêu cầu phúc khảo điểm của bạn đã bị từ chối${reviewNote ? ': ' + reviewNote : ''}`,
      link: `/student-grades`,
      priority: 'high'
    }, io);

    res.json({
      success: true,
      message: "Đã từ chối yêu cầu phúc khảo",
      appeal
    });
  } catch (error) {
    console.error("Error rejecting appeal:", error);
    res.status(500).json({ error: "Lỗi khi từ chối yêu cầu phúc khảo" });
  }
});

// Get single appeal details
router.get("/:id", authenticate, async (req, res) => {
  try {
    const appeal = await GradeAppeal.findById(req.params.id)
      .populate('student', 'id name email')
      .populate('internshipGrade')
      .populate('originalSupervisor', 'id name email')
      .populate('newSupervisor', 'id name email')
      .populate('reviewedBy', 'id name email')
      .lean();

    if (!appeal) {
      return res.status(404).json({ error: "Không tìm thấy yêu cầu phúc khảo" });
    }

    // Check permissions
    const isStudent = appeal.student._id.toString() === req.account._id.toString();
    const isOriginalSupervisor = appeal.originalSupervisor._id.toString() === req.account._id.toString();
    const isNewSupervisor = appeal.newSupervisor?._id.toString() === req.account._id.toString();
    
    // Check if BCN of the khoa
    let isBCN = false;
    if (req.account.role === 'ban-chu-nhiem') {
      const bcn = await BanChuNhiem.findOne({ account: req.account._id });
      isBCN = bcn && bcn.khoa === appeal.khoa;
    }

    if (!isStudent && !isOriginalSupervisor && !isNewSupervisor && !isBCN && req.account.role !== 'phong-dao-tao') {
      return res.status(403).json({ error: "Bạn không có quyền xem yêu cầu này" });
    }

    res.json({ appeal });
  } catch (error) {
    console.error("Error fetching appeal details:", error);
    res.status(500).json({ error: "Lỗi khi tải thông tin phúc khảo" });
  }
});

export default router;
