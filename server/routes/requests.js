import express from "express";
import Request from "../models/Request.js";
import Account from "../models/Account.js";
import GiangVien from "../models/GiangVien.js";
import BanChuNhiem from "../models/BanChuNhiem.js";
import InternshipSubject from "../models/InternshipSubject.js";
import SinhVien from "../models/SinhVien.js";
import { authenticate, authGV, authBCN } from "../middleware/auth.js";

const router = express.Router();

// Create request (GV only)
router.post("/", ...authGV, async (req, res) => {
  try {
    const { students, type, reviewNote } = req.body;

    if (!students || !Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ error: "Danh sách sinh viên là bắt buộc" });
    }

    if (!type || !["add-student", "remove-student"].includes(type)) {
      return res.status(400).json({ error: "Loại yêu cầu không hợp lệ" });
    }

    // Find lecturer profile
    const lecturerProfile = await GiangVien.findOne({ account: req.account._id })
      .populate('internshipSubject', 'id title');

    if (!lecturerProfile || !lecturerProfile.internshipSubject) {
      return res.status(400).json({ error: "Bạn chưa được phân công môn thực tập" });
    }

    // Validate students format
    for (const student of students) {
      if (!student.id || !student.name) {
        return res.status(400).json({ error: "Thông tin sinh viên không đầy đủ" });
      }
    }

    const request = new Request({
      name: req.account.name,
      idgv: req.account.id,
      students,
      type,
      internshipSubject: lecturerProfile.internshipSubject._id,
      reviewNote: reviewNote || ""
    });

    await request.save();

    await request.populate('internshipSubject', 'id title');

    res.status(201).json({
      success: true,
      request
    });
  } catch (error) {
    console.error("Create request error:", error);
    res.status(400).json({ error: error.message });
  }
});

// Get requests for teacher (GV only)
router.get("/my-requests", ...authGV, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, type } = req.query;
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));

    const query = { idgv: req.account.id };
    if (status && status !== "all") query.status = status;
    if (type && type !== "all") query.type = type;

    const [requests, total] = await Promise.all([
      Request.find(query)
        .populate('internshipSubject', 'id title')
        .populate('reviewedBy', 'id name email')
        .sort({ createdAt: -1 })
        .limit(limitNum)
        .skip((pageNum - 1) * limitNum),
      Request.countDocuments(query)
    ]);

    res.json({
      success: true,
      requests,
      pagination: {
        page: pageNum,
        pages: Math.max(1, Math.ceil(total / limitNum)),
        total
      }
    });
  } catch (error) {
    console.error("Get teacher requests error:", error);
    res.status(400).json({ error: error.message });
  }
});

// Get requests for BCN (BCN only)
router.get("/bcn/pending", ...authBCN, async (req, res) => {
  try {
    const { page = 1, limit = 10, type, search } = req.query;
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));

    // Find BCN's managed subject
    const bcnProfile = await BanChuNhiem.findOne({ account: req.account._id })
      .populate('internshipSubject');

    if (!bcnProfile || !bcnProfile.internshipSubject) {
      return res.json({
        success: true,
        requests: [],
        pagination: { page: 1, pages: 1, total: 0 }
      });
    }

    const query = { 
      internshipSubject: bcnProfile.internshipSubject._id,
      status: "pending"
    };
    
    if (type && type !== "all") query.type = type;
    if (search) {
      query.$or = [
        { name: new RegExp(search, "i") },
        { idgv: new RegExp(search, "i") }
      ];
    }

    const [requests, total] = await Promise.all([
      Request.find(query)
        .populate('internshipSubject', 'id title')
        .sort({ createdAt: -1 })
        .limit(limitNum)
        .skip((pageNum - 1) * limitNum),
      Request.countDocuments(query)
    ]);

    res.json({
      success: true,
      requests,
      pagination: {
        page: pageNum,
        pages: Math.max(1, Math.ceil(total / limitNum)),
        total
      }
    });
  } catch (error) {
    console.error("Get BCN requests error:", error);
    res.status(400).json({ error: error.message });
  }
});

// Get single request details
router.get("/:id", authenticate, async (req, res) => {
  try {
    const request = await Request.findById(req.params.id)
      .populate('internshipSubject', 'id title')
      .populate('reviewedBy', 'id name email');

    if (!request) {
      return res.status(404).json({ error: "Không tìm thấy yêu cầu" });
    }

    // Check permissions
    let canView = false;
    if (req.account.role === "phong-dao-tao") {
      canView = true;
    } else if (req.account.role === "giang-vien" && request.idgv === req.account.id) {
      canView = true;
    } else if (req.account.role === "ban-chu-nhiem") {
      const bcnProfile = await BanChuNhiem.findOne({ 
        account: req.account._id,
        internshipSubject: request.internshipSubject._id 
      });
      canView = !!bcnProfile;
    }

    if (!canView) {
      return res.status(403).json({ error: "Không có quyền xem yêu cầu này" });
    }

    res.json({
      success: true,
      request
    });
  } catch (error) {
    console.error("Get request error:", error);
    res.status(400).json({ error: error.message });
  }
});

// Accept request (BCN only)
router.put("/:id/accept", ...authBCN, async (req, res) => {
  try {
    const { reviewNote } = req.body;

    const request = await Request.findById(req.params.id)
      .populate('internshipSubject');

    if (!request) {
      return res.status(404).json({ error: "Không tìm thấy yêu cầu" });
    }

    if (request.status !== "pending") {
      return res.status(400).json({ error: "Yêu cầu đã được xử lý" });
    }

    // Verify BCN manages this subject
    const bcnProfile = await BanChuNhiem.findOne({ 
      account: req.account._id,
      internshipSubject: request.internshipSubject._id 
    });
    if (!bcnProfile) {
      return res.status(403).json({ error: "Bạn không quản lý môn thực tập này" });
    }

    // Find the lecturer account
    const lecturerAccount = await Account.findOne({ id: request.idgv, role: "giang-vien" });
    if (!lecturerAccount) {
      return res.status(400).json({ error: "Không tìm thấy tài khoản giảng viên" });
    }

    // Process the request based on type
    if (request.type === "add-student") {
      // Add students to subject and assign supervisor
      for (const studentData of request.students) {
        const studentAccount = await Account.findOne({ id: studentData.id, role: "sinh-vien" });
        if (studentAccount) {
          // Add to subject if not already there
          const subject = await InternshipSubject.findById(request.internshipSubject._id);
          if (!subject.students.includes(studentAccount._id)) {
            subject.students.push(studentAccount._id);
            await subject.save();
          }

          // Update or create student profile
          await SinhVien.findOneAndUpdate(
            { account: studentAccount._id },
            { 
              internshipSubject: request.internshipSubject._id,
              supervisor: lecturerAccount._id,
              internshipStatus: "duoc-huong-dan"
            },
            { upsert: true }
          );

          // Add to lecturer's managed students
          await GiangVien.findOneAndUpdate(
            { account: lecturerAccount._id },
            { $addToSet: { managedStudents: studentAccount._id } }
          );
        }
      }
    } else if (request.type === "remove-student") {
      // Remove students from lecturer's supervision
      for (const studentData of request.students) {
        const studentAccount = await Account.findOne({ id: studentData.id, role: "sinh-vien" });
        if (studentAccount) {
          // Update student profile
          await SinhVien.findOneAndUpdate(
            { account: studentAccount._id },
            { 
              supervisor: null,
              internshipStatus: "chua-duoc-huong-dan"
            }
          );

          // Remove from lecturer's managed students
          await GiangVien.findOneAndUpdate(
            { account: lecturerAccount._id },
            { $pull: { managedStudents: studentAccount._id } }
          );
        }
      }
    }

    // Update request status
    request.status = "accepted";
    request.reviewNote = reviewNote || "";
    request.reviewedBy = req.account._id;
    request.reviewedAt = new Date();
    await request.save();

    await request.populate('reviewedBy', 'id name email');

    res.json({
      success: true,
      request,
      message: "Đã chấp nhận yêu cầu thành công"
    });
  } catch (error) {
    console.error("Accept request error:", error);
    res.status(400).json({ error: error.message });
  }
});

// Reject request (BCN only)
router.put("/:id/reject", ...authBCN, async (req, res) => {
  try {
    const { reviewNote } = req.body;

    const request = await Request.findById(req.params.id)
      .populate('internshipSubject');

    if (!request) {
      return res.status(404).json({ error: "Không tìm thấy yêu cầu" });
    }

    if (request.status !== "pending") {
      return res.status(400).json({ error: "Yêu cầu đã được xử lý" });
    }

    // Verify BCN manages this subject
    const bcnProfile = await BanChuNhiem.findOne({ 
      account: req.account._id,
      internshipSubject: request.internshipSubject._id 
    });
    if (!bcnProfile) {
      return res.status(403).json({ error: "Bạn không quản lý môn thực tập này" });
    }

    // Update request status
    request.status = "rejected";
    request.reviewNote = reviewNote || "";
    request.reviewedBy = req.account._id;
    request.reviewedAt = new Date();
    await request.save();

    await request.populate('reviewedBy', 'id name email');

    res.json({
      success: true,
      request,
      message: "Đã từ chối yêu cầu"
    });
  } catch (error) {
    console.error("Reject request error:", error);
    res.status(400).json({ error: error.message });
  }
});

// Delete request (GV can delete their own pending requests)
router.delete("/:id", ...authGV, async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ error: "Không tìm thấy yêu cầu" });
    }

    // Check if request belongs to current teacher
    if (request.idgv !== req.account.id) {
      return res.status(403).json({ error: "Bạn không có quyền xóa yêu cầu này" });
    }

    // Only allow deletion of pending requests
    if (request.status !== "pending") {
      return res.status(400).json({ error: "Chỉ có thể xóa yêu cầu đang chờ xử lý" });
    }

    await Request.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Đã xóa yêu cầu thành công"
    });
  } catch (error) {
    console.error("Delete request error:", error);
    res.status(400).json({ error: error.message });
  }
});

export default router;
