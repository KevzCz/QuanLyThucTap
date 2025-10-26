import express from "express";
import Report from "../models/Report.js";
import GiangVien from "../models/GiangVien.js";
import BanChuNhiem from "../models/BanChuNhiem.js";
import { authenticate, authGV, authBCN } from "../middleware/auth.js";
import notificationService from "../services/notificationService.js";

const router = express.Router();

// Get teacher's reports (GV only)
router.get("/teacher", ...authGV, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, reportType } = req.query;
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));

    // Validate inputs
    if (status && status !== "all" && !["draft", "submitted", "reviewed", "approved", "rejected"].includes(status)) {
      return res.status(400).json({ error: "Trạng thái không hợp lệ" });
    }

    const validTypes = ["tuan", "thang", "quy", "nam", "khac"];
    if (reportType && reportType !== "all" && !validTypes.includes(reportType)) {
      return res.status(400).json({ error: "Loại báo cáo không hợp lệ" });
    }

    // Find lecturer profile
    const lecturerProfile = await GiangVien.findOne({ account: req.account._id })
      .populate('internshipSubject', 'id title')
      .lean();

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
        .skip((pageNum - 1) * limitNum)
        .lean(),
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

    // Validate required fields
    if (!title || !content || !reportType) {
      return res.status(400).json({ error: "Tiêu đề, nội dung và loại báo cáo là bắt buộc" });
    }

    // Validate title length
    if (title.length < 5 || title.length > 200) {
      return res.status(400).json({ error: "Tiêu đề phải từ 5 đến 200 ký tự" });
    }

    // Validate content length
    if (content.length < 10 || content.length > 10000) {
      return res.status(400).json({ error: "Nội dung phải từ 10 đến 10000 ký tự" });
    }

    // Validate reportType
    const validTypes = ["tuan", "thang", "quy", "nam", "khac"];
    if (!validTypes.includes(reportType)) {
      return res.status(400).json({ error: "Loại báo cáo không hợp lệ" });
    }

    // Validate attachments
    if (attachments && (!Array.isArray(attachments) || attachments.length > 10)) {
      return res.status(400).json({ error: "Tối đa 10 tệp đính kèm" });
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

    // Validate title length if provided
    if (title && (title.length < 5 || title.length > 200)) {
      return res.status(400).json({ error: "Tiêu đề phải từ 5 đến 200 ký tự" });
    }

    // Validate content length if provided
    if (content && (content.length < 10 || content.length > 10000)) {
      return res.status(400).json({ error: "Nội dung phải từ 10 đến 10000 ký tự" });
    }

    // Validate reportType if provided
    if (reportType) {
      const validTypes = ["tuan", "thang", "quy", "nam", "khac"];
      if (!validTypes.includes(reportType)) {
        return res.status(400).json({ error: "Loại báo cáo không hợp lệ" });
      }
    }

    // Validate attachments if provided
    if (attachments && (!Array.isArray(attachments) || attachments.length > 10)) {
      return res.status(400).json({ error: "Tối đa 10 tệp đính kèm" });
    }

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

    // Notify BCN about new report submission
    try {
      const io = req.app.get('io');
      const lecturerProfile = await GiangVien.findOne({ account: req.account._id })
        .populate('internshipSubject');
      
      if (lecturerProfile && lecturerProfile.internshipSubject) {
        const bcnProfile = await BanChuNhiem.findOne({ 
          internshipSubject: lecturerProfile.internshipSubject._id 
        });
        
        if (bcnProfile) {
          await notificationService.createNotification({
            recipient: bcnProfile.account,
            sender: req.account._id,
            type: 'system',
            title: 'Báo cáo mới từ giảng viên',
            message: `${req.account.name} đã gửi báo cáo: ${report.title}`,
            link: `/bcn/report`,
            priority: 'normal',
            metadata: { reportId: report._id.toString() }
          }, io);
        }
      }
    } catch (notifError) {
      console.error('Error sending notification:', notifError);
    }

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

// Get reports for BCN (BCN only) - Simple list without pagination for dashboard
router.get("/bcn", ...authBCN, async (req, res) => {
  try {
    // Find BCN's managed subject
    const bcnProfile = await BanChuNhiem.findOne({ account: req.account._id })
      .populate('internshipSubject')
      .lean();

    if (!bcnProfile || !bcnProfile.internshipSubject) {
      return res.json({
        success: true,
        reports: []
      });
    }

    // Get all reports for the BCN's subject
    const reports = await Report.find({ 
      internshipSubject: bcnProfile.internshipSubject._id
    })
      .select('status reportType createdAt')
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      reports
    });
  } catch (error) {
    console.error("Get BCN reports error:", error);
    res.status(500).json({ error: "Lỗi server khi tải danh sách báo cáo" });
  }
});

// Get reports for BCN review (BCN only) - Updated endpoint name
router.get("/bcn/review", ...authBCN, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, reportType, search } = req.query;
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));

    // Validate inputs
    if (status && status !== "all" && !["draft", "submitted", "reviewed", "approved", "rejected"].includes(status)) {
      return res.status(400).json({ error: "Trạng thái không hợp lệ" });
    }

    const validTypes = ["tuan", "thang", "quy", "nam", "khac"];
    if (reportType && reportType !== "all" && !validTypes.includes(reportType)) {
      return res.status(400).json({ error: "Loại báo cáo không hợp lệ" });
    }

    // Find BCN's managed subject
    const bcnProfile = await BanChuNhiem.findOne({ account: req.account._id })
      .populate('internshipSubject')
      .lean();

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
    
    // Sanitize search input
    if (search && typeof search === "string" && search.trim()) {
      const sanitizedSearch = search.trim().slice(0, 100);
      query.$or = [
        { title: new RegExp(sanitizedSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "i") }
      ];
    }

    const [reports, total] = await Promise.all([
      Report.find(query)
        .populate('instructor', 'id name email')
        .populate('internshipSubject', 'id title')
        .populate('reviewedBy', 'id name email')
        .sort({ createdAt: -1 })
        .limit(limitNum)
        .skip((pageNum - 1) * limitNum)
        .lean(),
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
    res.status(500).json({ error: "Lỗi server khi tải danh sách báo cáo" });
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

    // Notify lecturer about report review
    try {
      const io = req.app.get('io');
      await notificationService.notifyReportReviewed(
        report.instructor._id,
        report._id.toString(),
        status,
        io
      );
    } catch (notifError) {
      console.error('Error sending notification:', notifError);
    }

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

// Get all reports with statistics for PDT (PDT only)
router.get("/pdt/statistics", authenticate, async (req, res) => {
  try {
    if (req.account.role !== "phong-dao-tao") {
      return res.status(403).json({ error: "Chỉ Phòng Đào Tạo mới có quyền truy cập" });
    }

    const { page = 1, limit = 20, status, reportType, subjectId, instructorId, startDate, endDate, search } = req.query;
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));

    // Validate status
    if (status && status !== "all" && !["draft", "submitted", "reviewed", "approved", "rejected"].includes(status)) {
      return res.status(400).json({ error: "Trạng thái không hợp lệ" });
    }

    // Validate reportType
    const validTypes = ["tuan", "thang", "quy", "nam", "khac"];
    if (reportType && reportType !== "all" && !validTypes.includes(reportType)) {
      return res.status(400).json({ error: "Loại báo cáo không hợp lệ" });
    }

    // Build query
    const query = {};
    if (status && status !== "all") query.status = status;
    if (reportType && reportType !== "all") query.reportType = reportType;
    if (subjectId) query.internshipSubject = subjectId;
    if (instructorId) query.instructor = instructorId;
    
    // Date range validation
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        if (isNaN(start.getTime())) {
          return res.status(400).json({ error: "Ngày bắt đầu không hợp lệ" });
        }
        query.createdAt.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        if (isNaN(end.getTime())) {
          return res.status(400).json({ error: "Ngày kết thúc không hợp lệ" });
        }
        query.createdAt.$lte = end;
      }
    }

    // Sanitize search input
    if (search && typeof search === "string" && search.trim()) {
      const sanitizedSearch = search.trim().slice(0, 100);
      query.$or = [
        { title: new RegExp(sanitizedSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "i") }
      ];
    }

    const [reports, total] = await Promise.all([
      Report.find(query)
        .populate('instructor', 'id name email')
        .populate('internshipSubject', 'id title')
        .populate('reviewedBy', 'id name email')
        .sort({ createdAt: -1 })
        .limit(limitNum)
        .skip((pageNum - 1) * limitNum)
        .lean(),
      Report.countDocuments(query)
    ]);

    // Get statistics efficiently
    const statistics = await Report.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalReports: { $sum: 1 },
          statusCounts: {
            $push: "$status"
          },
          typeCounts: {
            $push: "$reportType"
          }
        }
      }
    ]);

    const stats = statistics[0] || { totalReports: 0, statusCounts: [], typeCounts: [] };
    
    const statusCounts = stats.statusCounts.reduce((acc, status) => {
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    const typeCounts = stats.typeCounts.reduce((acc, type) => {
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    res.json({
      success: true,
      reports,
      pagination: {
        page: pageNum,
        pages: Math.max(1, Math.ceil(total / limitNum)),
        total
      },
      statistics: {
        total: stats.totalReports,
        byStatus: statusCounts,
        byType: typeCounts
      }
    });
  } catch (error) {
    console.error("Get PDT statistics error:", error);
    res.status(500).json({ error: "Lỗi server khi tải thống kê báo cáo" });
  }
});

export default router;
