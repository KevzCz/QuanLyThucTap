import express from "express";
import Report from "../models/Report.js";
import GiangVien from "../models/GiangVien.js";
import BanChuNhiem from "../models/BanChuNhiem.js";
import { authenticate, authGV, authBCN } from "../middleware/auth.js";

const router = express.Router();

// Get teacher's reports (GV only)
router.get("/teacher", ...authGV, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, reportType } = req.query;
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));

    // Find lecturer profile
    const lecturerProfile = await GiangVien.findOne({ account: req.account._id })
      .populate('internshipSubject', 'id title');

    if (!lecturerProfile || !lecturerProfile.internshipSubject) {
      return res.json({
        success: true,
        reports: [],
        pagination: { page: 1, pages: 1, total: 0 }
      });
    }

    const query = { 
      instructor: req.account._id,
      internshipSubject: lecturerProfile.internshipSubject._id
    };
    
    if (status && status !== "all") query.status = status;
    if (reportType && reportType !== "all") query.reportType = reportType;

    const [reports, total] = await Promise.all([
      Report.find(query)
        .populate('instructor', 'id name email')
        .populate('internshipSubject', 'id title')
        .populate('reviewedBy', 'id name email')
        .sort({ createdAt: -1 })
        .limit(limitNum)
        .skip((pageNum - 1) * limitNum),
      Report.countDocuments(query)
    ]);

    res.json({
      success: true,
      reports,
      pagination: {
        page: pageNum,
        pages: Math.max(1, Math.ceil(total / limitNum)),
        total
      }
    });
  } catch (error) {
    console.error("Get teacher reports error:", error);
    res.status(400).json({ error: error.message });
  }
});

// Create teacher report (GV only)
router.post("/teacher", ...authGV, async (req, res) => {
  try {
    const { title, content, reportType, attachments } = req.body;

    if (!title || !content || !reportType) {
      return res.status(400).json({ error: "Tiêu đề, nội dung và loại báo cáo là bắt buộc" });
    }

    // Find lecturer profile
    const lecturerProfile = await GiangVien.findOne({ account: req.account._id })
      .populate('internshipSubject', 'id title');

    if (!lecturerProfile || !lecturerProfile.internshipSubject) {
      return res.status(400).json({ error: "Bạn chưa được phân công môn thực tập" });
    }

    const report = new Report({
      title,
      content,
      reportType,
      instructor: req.account._id,
      internshipSubject: lecturerProfile.internshipSubject._id,
      attachments: attachments || []
    });

    await report.save();
    await report.populate('instructor', 'id name email');
    await report.populate('internshipSubject', 'id title');

    res.status(201).json({
      success: true,
      report
    });
  } catch (error) {
    console.error("Create report error:", error);
    res.status(400).json({ error: error.message });
  }
});

// Update teacher report (GV only)
router.put("/teacher/:id", ...authGV, async (req, res) => {
  try {
    const { title, content, reportType, attachments } = req.body;

    const report = await Report.findOne({ 
      _id: req.params.id,
      instructor: req.account._id 
    });

    if (!report) {
      return res.status(404).json({ error: "Không tìm thấy báo cáo" });
    }

    // Only allow editing draft and rejected reports
    if (report.status !== "draft" && report.status !== "rejected") {
      return res.status(400).json({ error: "Chỉ có thể chỉnh sửa báo cáo bản nháp hoặc bị từ chối" });
    }

    // Update fields
    if (title) report.title = title;
    if (content) report.content = content;
    if (reportType) report.reportType = reportType;
    if (attachments !== undefined) report.attachments = attachments;

    // Reset status to draft if it was rejected
    if (report.status === "rejected") {
      report.status = "draft";
      report.reviewNote = "";
      report.reviewedBy = null;
      report.reviewedAt = null;
    }

    await report.save();
    await report.populate('instructor', 'id name email');
    await report.populate('internshipSubject', 'id title');

    res.json({
      success: true,
      report
    });
  } catch (error) {
    console.error("Update report error:", error);
    res.status(400).json({ error: error.message });
  }
});

// Submit teacher report (GV only)
// Submit teacher report (GV only)
const submitHandler = async (req, res) => {
  try {
    const report = await Report.findOne({
      _id: req.params.id,
      instructor: req.account._id,
    });

    if (!report) {
      return res.status(404).json({ error: "Không tìm thấy báo cáo" });
    }
    if (report.status !== "draft") {
      return res.status(400).json({ error: "Chỉ có thể gửi báo cáo bản nháp" });
    }

    report.status = "submitted";
    report.submittedAt = new Date();
    await report.save();

    // (Optional but recommended) return full populated doc so the UI can update confidently
    await report.populate("instructor", "id name email");
    await report.populate("internshipSubject", "id title");

    res.json({
      success: true,
      report, // now includes updatedAt and other fields
    });
  } catch (error) {
    console.error("Submit report error:", error);
    res.status(400).json({ error: error.message });
  }
};

router.post("/teacher/:id/submit", ...authGV, submitHandler);
router.put("/teacher/:id/submit", ...authGV, submitHandler); // allow PUT too

// Delete teacher report (GV only)
router.delete("/teacher/:id", ...authGV, async (req, res) => {
  try {
    const report = await Report.findOne({ 
      _id: req.params.id,
      instructor: req.account._id 
    });

    if (!report) {
      return res.status(404).json({ error: "Không tìm thấy báo cáo" });
    }

    // Only allow deletion of draft reports
    if (report.status !== "draft") {
      return res.status(400).json({ error: "Chỉ có thể xóa báo cáo bản nháp" });
    }

    await Report.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Đã xóa báo cáo thành công"
    });
  } catch (error) {
    console.error("Delete report error:", error);
    res.status(400).json({ error: error.message });
  }
});

// Get reports for BCN review (BCN only) - Updated endpoint name
router.get("/bcn/review", ...authBCN, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, reportType, search } = req.query;
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));

    // Find BCN's managed subject
    const bcnProfile = await BanChuNhiem.findOne({ account: req.account._id })
      .populate('internshipSubject');

    if (!bcnProfile || !bcnProfile.internshipSubject) {
      return res.json({
        success: true,
        reports: [],
        pagination: { page: 1, pages: 1, total: 0 }
      });
    }

    const query = { 
      internshipSubject: bcnProfile.internshipSubject._id
    };
    
    if (status && status !== "all") query.status = status;
    if (reportType && reportType !== "all") query.reportType = reportType;
    if (search) {
      query.$or = [
        { title: new RegExp(search, "i") },
        { content: new RegExp(search, "i") }
      ];
    }

    const [reports, total] = await Promise.all([
      Report.find(query)
        .populate('instructor', 'id name email')
        .populate('internshipSubject', 'id title')
        .populate('reviewedBy', 'id name email')
        .sort({ createdAt: -1 })
        .limit(limitNum)
        .skip((pageNum - 1) * limitNum),
      Report.countDocuments(query)
    ]);

    res.json({
      success: true,
      reports,
      pagination: {
        page: pageNum,
        pages: Math.max(1, Math.ceil(total / limitNum)),
        total
      }
    });
  } catch (error) {
    console.error("Get BCN reports error:", error);
    res.status(400).json({ error: error.message });
  }
});

// Review report (BCN only)
router.put("/bcn/:id/review", ...authBCN, async (req, res) => {
  try {
    const { status, reviewNote } = req.body;

    if (!status || !["reviewed", "approved", "rejected"].includes(status)) {
      return res.status(400).json({ error: "Trạng thái xem xét không hợp lệ" });
    }

    const report = await Report.findById(req.params.id)
      .populate('internshipSubject');

    if (!report) {
      return res.status(404).json({ error: "Không tìm thấy báo cáo" });
    }

    // Verify BCN manages this subject
    const bcnProfile = await BanChuNhiem.findOne({ 
      account: req.account._id,
      internshipSubject: report.internshipSubject._id 
    });
    if (!bcnProfile) {
      return res.status(403).json({ error: "Bạn không quản lý môn thực tập này" });
    }

    if (report.status !== "submitted" && report.status !== "reviewed") {
      return res.status(400).json({ error: "Chỉ có thể xem xét báo cáo đã gửi" });
    }

    report.status = status;
    report.reviewNote = reviewNote || "";
    report.reviewedBy = req.account._id;
    report.reviewedAt = new Date();

    await report.save();
    await report.populate('instructor', 'id name email');
    await report.populate('reviewedBy', 'id name email');

    res.json({
      success: true,
      report
    });
  } catch (error) {
    console.error("Review report error:", error);
    res.status(400).json({ error: error.message });
  }
});

// Get single report details
router.get("/:id", authenticate, async (req, res) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate('instructor', 'id name email')
      .populate('internshipSubject', 'id title')
      .populate('reviewedBy', 'id name email');

    if (!report) {
      return res.status(404).json({ error: "Không tìm thấy báo cáo" });
    }

    // Check permissions
    let canView = false;
    if (req.account.role === "phong-dao-tao") {
      canView = true;
    } else if (req.account.role === "giang-vien" && report.instructor._id.toString() === req.account._id.toString()) {
      canView = true;
    } else if (req.account.role === "ban-chu-nhiem") {
      const bcnProfile = await BanChuNhiem.findOne({ 
        account: req.account._id,
        internshipSubject: report.internshipSubject._id 
      });
      canView = !!bcnProfile;
    }

    if (!canView) {
      return res.status(403).json({ error: "Không có quyền xem báo cáo này" });
    }

    res.json({
      success: true,
      report
    });
  } catch (error) {
    console.error("Get report error:", error);
    res.status(400).json({ error: error.message });
  }
});

export default router;
