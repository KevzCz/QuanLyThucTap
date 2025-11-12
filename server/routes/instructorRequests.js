import express from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import InstructorRequest from "../models/InstructorRequest.js";
import SinhVien from "../models/SinhVien.js";
import GiangVien from "../models/GiangVien.js";
import Account from "../models/Account.js";
import notificationService from "../services/notificationService.js";

const router = express.Router();

// Create instructor request (Student only)
router.post("/", authenticate, authorize(["sinh-vien"]), async (req, res) => {
  try {
    const { instructorId, message } = req.body;

    if (!instructorId) {
      return res.status(400).json({ error: "Vui lòng chọn giảng viên" });
    }

    // Check if student already has a supervisor
    const studentProfile = await SinhVien.findOne({ account: req.account._id });
    if (studentProfile?.supervisor) {
      return res.status(400).json({ error: "Bạn đã có giảng viên hướng dẫn" });
    }

    // Check if there's already a pending request
    const existingRequest = await InstructorRequest.findOne({
      student: req.account._id,
      status: "pending"
    });

    if (existingRequest) {
      return res.status(400).json({ error: "Bạn đã có yêu cầu đang chờ xử lý" });
    }

    // Verify instructor exists and is a lecturer
    const instructorAccount = await Account.findById(instructorId);
    if (!instructorAccount || instructorAccount.role !== "giang-vien") {
      return res.status(404).json({ error: "Không tìm thấy giảng viên" });
    }

    const instructorProfile = await GiangVien.findOne({ account: instructorId });
    if (!instructorProfile) {
      return res.status(404).json({ error: "Không tìm thấy thông tin giảng viên" });
    }

    // Check if instructor is from the same khoa
    if (studentProfile && instructorProfile.khoa !== studentProfile.khoa) {
      return res.status(400).json({ error: "Giảng viên phải thuộc cùng khoa với bạn" });
    }

    // Check if instructor has reached max students
    const currentStudentCount = await SinhVien.countDocuments({ 
      supervisor: instructorId 
    });
    
    if (instructorProfile.maxStudents && currentStudentCount >= instructorProfile.maxStudents) {
      return res.status(400).json({ 
        error: "Giảng viên đã đạt số lượng sinh viên tối đa" 
      });
    }

    // Create request
    const request = await InstructorRequest.create({
      student: req.account._id,
      requestedInstructor: instructorId,
      message: message?.trim() || ""
    });

    // Populate request
    await request.populate([
      { path: "student", select: "id name email" },
      { path: "requestedInstructor", select: "id name email" }
    ]);

    // Send notification to instructor
    const io = req.app.get('io');
    await notificationService.createNotification({
      recipient: instructorId,
      sender: req.account._id,
      type: 'instructor-request',
      title: 'Yêu cầu hướng dẫn mới',
      message: `${req.account.name} (${req.account.id}) muốn đăng ký bạn làm giảng viên hướng dẫn`,
      link: `/gv/instructor-requests`,
      priority: 'high',
      metadata: {
        requestId: request._id.toString()
      }
    }, io);

    res.json({
      success: true,
      message: "Đã gửi yêu cầu thành công",
      request
    });
  } catch (error) {
    console.error("Create instructor request error:", error);
    res.status(500).json({ error: "Lỗi khi tạo yêu cầu" });
  }
});

// Get student's own requests
router.get("/my-requests", authenticate, authorize(["sinh-vien"]), async (req, res) => {
  try {
    const requests = await InstructorRequest.find({ student: req.account._id })
      .populate("requestedInstructor", "id name email")
      .sort({ createdAt: -1 });

    res.json({ success: true, requests });
  } catch (error) {
    console.error("Get student requests error:", error);
    res.status(500).json({ error: "Lỗi khi tải danh sách yêu cầu" });
  }
});

// Get requests for an instructor (GV only)
router.get("/for-instructor", authenticate, authorize(["giang-vien"]), async (req, res) => {
  try {
    const { status } = req.query;
    
    const query = { requestedInstructor: req.account._id };
    if (status && status !== "all") {
      query.status = status;
    }

    const requests = await InstructorRequest.find(query)
      .populate("student", "id name email")
      .sort({ createdAt: -1 });

    res.json({ success: true, requests });
  } catch (error) {
    console.error("Get instructor requests error:", error);
    res.status(500).json({ error: "Lỗi khi tải danh sách yêu cầu" });
  }
});

// Approve request (GV only)
router.put("/:id/approve", authenticate, authorize(["giang-vien"]), async (req, res) => {
  try {
    const { responseMessage } = req.body;

    const request = await InstructorRequest.findById(req.params.id)
      .populate("student", "id name email");

    if (!request) {
      return res.status(404).json({ error: "Không tìm thấy yêu cầu" });
    }

    if (request.requestedInstructor.toString() !== req.account._id.toString()) {
      return res.status(403).json({ error: "Bạn không có quyền xử lý yêu cầu này" });
    }

    if (request.status !== "pending") {
      return res.status(400).json({ error: "Yêu cầu đã được xử lý" });
    }

    // Check if instructor hasn't reached max students
    const instructorProfile = await GiangVien.findOne({ account: req.account._id });
    const currentStudentCount = await SinhVien.countDocuments({ 
      supervisor: req.account._id 
    });
    
    if (instructorProfile.maxStudents && currentStudentCount >= instructorProfile.maxStudents) {
      return res.status(400).json({ 
        error: "Bạn đã đạt số lượng sinh viên tối đa" 
      });
    }

    // Update student's supervisor
    const studentProfile = await SinhVien.findOne({ account: request.student._id });
    if (!studentProfile) {
      return res.status(404).json({ error: "Không tìm thấy thông tin sinh viên" });
    }

    if (studentProfile.supervisor) {
      return res.status(400).json({ error: "Sinh viên đã có giảng viên hướng dẫn" });
    }

    studentProfile.supervisor = req.account._id;
    await studentProfile.save();

    // Add student to instructor's managedStudents list
    if (!instructorProfile.managedStudents.includes(request.student._id)) {
      instructorProfile.managedStudents.push(request.student._id);
      await instructorProfile.save();
    }

    // Update request
    request.status = "approved";
    request.responseMessage = responseMessage?.trim() || "";
    request.respondedAt = new Date();
    await request.save();

    // Reject all other pending requests from this student
    await InstructorRequest.updateMany(
      {
        student: request.student._id,
        _id: { $ne: request._id },
        status: "pending"
      },
      {
        status: "rejected",
        responseMessage: "Sinh viên đã được chấp nhận bởi giảng viên khác",
        respondedAt: new Date()
      }
    );

    // Send notification to student
    const io = req.app.get('io');
    await notificationService.createNotification({
      recipient: request.student._id,
      sender: req.account._id,
      type: 'instructor-request-approved',
      title: 'Yêu cầu hướng dẫn được chấp nhận',
      message: `${req.account.name} đã chấp nhận làm giảng viên hướng dẫn của bạn`,
      link: `/my-internship`,
      priority: 'high'
    }, io);

    res.json({
      success: true,
      message: "Đã chấp nhận yêu cầu",
      request
    });
  } catch (error) {
    console.error("Approve request error:", error);
    res.status(500).json({ error: "Lỗi khi chấp nhận yêu cầu" });
  }
});

// Reject request (GV only)
router.put("/:id/reject", authenticate, authorize(["giang-vien"]), async (req, res) => {
  try {
    const { responseMessage } = req.body;

    const request = await InstructorRequest.findById(req.params.id)
      .populate("student", "id name email");

    if (!request) {
      return res.status(404).json({ error: "Không tìm thấy yêu cầu" });
    }

    if (request.requestedInstructor.toString() !== req.account._id.toString()) {
      return res.status(403).json({ error: "Bạn không có quyền xử lý yêu cầu này" });
    }

    if (request.status !== "pending") {
      return res.status(400).json({ error: "Yêu cầu đã được xử lý" });
    }

    // Update request
    request.status = "rejected";
    request.responseMessage = responseMessage?.trim() || "";
    request.respondedAt = new Date();
    await request.save();

    // Send notification to student
    const io = req.app.get('io');
    await notificationService.createNotification({
      recipient: request.student._id,
      sender: req.account._id,
      type: 'instructor-request-rejected',
      title: 'Yêu cầu hướng dẫn bị từ chối',
      message: `${req.account.name} đã từ chối yêu cầu hướng dẫn của bạn${responseMessage ? ': ' + responseMessage : ''}`,
      link: `/my-internship`,
      priority: 'normal'
    }, io);

    res.json({
      success: true,
      message: "Đã từ chối yêu cầu",
      request
    });
  } catch (error) {
    console.error("Reject request error:", error);
    res.status(500).json({ error: "Lỗi khi từ chối yêu cầu" });
  }
});

// Cancel request (Student only)
router.delete("/:id", authenticate, authorize(["sinh-vien"]), async (req, res) => {
  try {
    const request = await InstructorRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ error: "Không tìm thấy yêu cầu" });
    }

    if (request.student.toString() !== req.account._id.toString()) {
      return res.status(403).json({ error: "Bạn không có quyền hủy yêu cầu này" });
    }

    if (request.status !== "pending") {
      return res.status(400).json({ error: "Chỉ có thể hủy yêu cầu đang chờ xử lý" });
    }

    await request.deleteOne();

    res.json({
      success: true,
      message: "Đã hủy yêu cầu"
    });
  } catch (error) {
    console.error("Cancel request error:", error);
    res.status(500).json({ error: "Lỗi khi hủy yêu cầu" });
  }
});

export default router;
