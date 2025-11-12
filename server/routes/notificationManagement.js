import express from "express";
import { authenticate } from "../middleware/auth.js";
import notificationService from "../services/notificationService.js";
import Account from "../models/Account.js";
import BanChuNhiem from "../models/BanChuNhiem.js";
import GiangVien from "../models/GiangVien.js";
import SinhVien from "../models/SinhVien.js";

const router = express.Router();

// POST /api/notification-management/send - Send notification (role-based permissions)
router.post("/send", authenticate, async (req, res) => {
  try {
    const { title, message, recipientType, recipients, priority, link } = req.body;
    const sender = req.account;

    // Validate required fields
    if (!title || !message || !recipientType) {
      return res.status(400).json({ error: "Tiêu đề, nội dung và loại người nhận là bắt buộc" });
    }

    // Check permissions based on role
    const allowedRecipientTypes = {
      "phong-dao-tao": ["individual", "role", "khoa", "all"],
      "ban-chu-nhiem": ["individual", "giang-vien-khoa", "sinh-vien-khoa"],
      "giang-vien": ["individual", "sinh-vien-managed"],
      "sinh-vien": ["giang-vien-supervisor"],
    };

    if (!allowedRecipientTypes[sender.role]?.includes(recipientType)) {
      return res.status(403).json({ error: "Bạn không có quyền gửi thông báo kiểu này" });
    }

    const io = req.app.get('io');
    let recipientIds = [];
    let notificationCount = 0;

    // Determine recipients based on type
    switch (recipientType) {
      case "individual": {
        // PDT, BCN, and GV can send to specific individuals
        if (!["phong-dao-tao", "ban-chu-nhiem", "giang-vien"].includes(sender.role)) {
          return res.status(403).json({ error: "Bạn không có quyền gửi thông báo đến cá nhân cụ thể" });
        }
        if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
          return res.status(400).json({ error: "Vui lòng chọn ít nhất một người nhận" });
        }
        
        // BCN can only send to users in their khoa
        if (sender.role === "ban-chu-nhiem") {
          const bcn = await BanChuNhiem.findOne({ account: sender._id });
          if (!bcn) {
            return res.status(404).json({ error: "Không tìm thấy thông tin BCN" });
          }
          
          // Validate that all recipients are in BCN's khoa
          const validRecipients = [];
          for (const recipientId of recipients) {
            const recipientAccount = await Account.findById(recipientId);
            if (!recipientAccount) continue;
            
            if (recipientAccount.role === "giang-vien") {
              const gv = await GiangVien.findOne({ account: recipientId });
              if (gv && gv.khoa === bcn.khoa) {
                validRecipients.push(recipientId);
              }
            } else if (recipientAccount.role === "sinh-vien") {
              const sv = await SinhVien.findOne({ account: recipientId });
              if (sv && sv.khoa === bcn.khoa) {
                validRecipients.push(recipientId);
              }
            }
          }
          recipientIds = validRecipients;
        } 
        // GV can only send to their managed students
        else if (sender.role === "giang-vien") {
          const gv = await GiangVien.findOne({ account: sender._id });
          if (!gv) {
            return res.status(404).json({ error: "Không tìm thấy thông tin giảng viên" });
          }
          
          // Filter recipients to only include managed students
          const managedStudentIds = (gv.managedStudents || []).map(id => id.toString());
          recipientIds = recipients.filter(id => managedStudentIds.includes(id.toString()));
        } 
        // PDT can send to anyone
        else {
          recipientIds = recipients;
        }
        
        if (recipientIds.length === 0) {
          return res.status(400).json({ error: "Không tìm thấy người nhận phù hợp trong phạm vi của bạn" });
        }
        break;
      }

      case "role": {
        // PDT can send to all users of a specific role
        if (sender.role !== "phong-dao-tao") {
          return res.status(403).json({ error: "Chỉ PDT có thể gửi thông báo theo vai trò" });
        }
        if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
          return res.status(400).json({ error: "Vui lòng chọn ít nhất một vai trò" });
        }
        const accounts = await Account.find({ role: { $in: recipients } }).select("_id");
        recipientIds = accounts.map(acc => acc._id);
        break;
      }

      case "khoa": {
        // PDT can send to all users in specific khoa
        if (sender.role !== "phong-dao-tao") {
          return res.status(403).json({ error: "Chỉ PDT có thể gửi thông báo theo khoa" });
        }
        if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
          return res.status(400).json({ error: "Vui lòng chọn ít nhất một khoa" });
        }
        
        // Get BCN accounts
        const bcnList = await BanChuNhiem.find({ khoa: { $in: recipients } }).select("account");
        // Get GV accounts
        const gvList = await GiangVien.find({ khoa: { $in: recipients } }).select("account");
        // Get SV accounts
        const svList = await SinhVien.find({ khoa: { $in: recipients } }).select("account");
        
        recipientIds = [
          ...bcnList.map(bcn => bcn.account),
          ...gvList.map(gv => gv.account),
          ...svList.map(sv => sv.account),
        ];
        break;
      }

      case "all": {
        // PDT can send to all users
        if (sender.role !== "phong-dao-tao") {
          return res.status(403).json({ error: "Chỉ PDT có thể gửi thông báo đến tất cả" });
        }
        const accounts = await Account.find({}).select("_id");
        recipientIds = accounts.map(acc => acc._id);
        break;
      }

      case "giang-vien-khoa": {
        // BCN can send to all GV in their khoa
        if (sender.role !== "ban-chu-nhiem") {
          return res.status(403).json({ error: "Chỉ BCN có thể gửi thông báo đến giảng viên trong khoa" });
        }
        const bcn = await BanChuNhiem.findOne({ account: sender._id });
        if (!bcn) {
          return res.status(404).json({ error: "Không tìm thấy thông tin BCN" });
        }
        const gvList = await GiangVien.find({ khoa: bcn.khoa }).select("account");
        recipientIds = gvList.map(gv => gv.account);
        break;
      }

      case "sinh-vien-khoa": {
        // BCN can send to all SV in their khoa
        if (sender.role !== "ban-chu-nhiem") {
          return res.status(403).json({ error: "Chỉ BCN có thể gửi thông báo đến sinh viên trong khoa" });
        }
        const bcn = await BanChuNhiem.findOne({ account: sender._id });
        if (!bcn) {
          return res.status(404).json({ error: "Không tìm thấy thông tin BCN" });
        }
        const svList = await SinhVien.find({ khoa: bcn.khoa }).select("account");
        recipientIds = svList.map(sv => sv.account);
        break;
      }

      case "sinh-vien-managed": {
        // GV can send to their managed students
        if (sender.role !== "giang-vien") {
          return res.status(403).json({ error: "Chỉ giảng viên có thể gửi thông báo đến sinh viên được quản lý" });
        }
        const gv = await GiangVien.findOne({ account: sender._id });
        if (!gv) {
          return res.status(404).json({ error: "Không tìm thấy thông tin giảng viên" });
        }
        recipientIds = gv.managedStudents || [];
        break;
      }

      case "giang-vien-supervisor": {
        // SV can send to their supervisor
        if (sender.role !== "sinh-vien") {
          return res.status(403).json({ error: "Chỉ sinh viên có thể gửi thông báo đến giảng viên hướng dẫn" });
        }
        const sv = await SinhVien.findOne({ account: sender._id });
        if (!sv || !sv.supervisor) {
          return res.status(404).json({ error: "Bạn chưa có giảng viên hướng dẫn" });
        }
        recipientIds = [sv.supervisor];
        break;
      }

      default:
        return res.status(400).json({ error: "Loại người nhận không hợp lệ" });
    }

    // Remove duplicates
    recipientIds = [...new Set(recipientIds.map(id => id.toString()))];

    if (recipientIds.length === 0) {
      return res.status(400).json({ error: "Không tìm thấy người nhận phù hợp" });
    }

    // Send notifications to all recipients
    for (const recipientId of recipientIds) {
      try {
        await notificationService.createNotification({
          recipient: recipientId,
          sender: sender._id,
          type: 'other', // Use 'other' instead of 'announcement'
          title,
          message,
          link: link || undefined,
          priority: priority === 'medium' ? 'normal' : (priority || 'normal'), // Map 'medium' to 'normal'
          metadata: {
            recipientType,
            sentBy: sender.role,
          }
        }, io);
        notificationCount++;
      } catch (error) {
        console.error(`Failed to send notification to ${recipientId}:`, error);
      }
    }

    res.json({
      success: true,
      message: `Đã gửi thông báo đến ${notificationCount} người`,
      recipientCount: notificationCount,
    });
  } catch (error) {
    console.error("Error sending notifications:", error);
    res.status(500).json({ error: "Lỗi khi gửi thông báo" });
  }
});

// GET /api/notification-management/recipients - Get available recipients based on role
router.get("/recipients", authenticate, async (req, res) => {
  try {
    const { type } = req.query;
    const sender = req.account;
    const result = {};

    switch (type) {
      case "users": {
        // PDT can get list of all users
        if (sender.role === "phong-dao-tao") {
          const accounts = await Account.find({}).select("_id id name email role").lean();
          result.users = accounts;
        }
        // BCN can get list of GV and SV in their khoa
        else if (sender.role === "ban-chu-nhiem") {
          const bcn = await BanChuNhiem.findOne({ account: sender._id });
          if (!bcn) {
            return res.status(404).json({ error: "Không tìm thấy thông tin BCN" });
          }
          
          const gvList = await GiangVien.find({ khoa: bcn.khoa }).populate('account', '_id id name email role').lean();
          const svList = await SinhVien.find({ khoa: bcn.khoa }).populate('account', '_id id name email role').lean();
          
          result.users = [
            ...gvList.map(gv => gv.account),
            ...svList.map(sv => sv.account)
          ].filter(acc => acc); // Filter out any null accounts
        }
        // GV can get list of their managed students
        else if (sender.role === "giang-vien") {
          const gv = await GiangVien.findOne({ account: sender._id });
          if (!gv) {
            return res.status(404).json({ error: "Không tìm thấy thông tin giảng viên" });
          }
          
          const accounts = await Account.find({ _id: { $in: gv.managedStudents || [] } }).select("_id id name email role").lean();
          result.users = accounts;
        }
        else {
          return res.status(403).json({ error: "Không có quyền truy cập" });
        }
        break;
      }

      case "khoa": {
        // Get list of all khoa
        const khoaList = await BanChuNhiem.find().select("khoa").lean();
        result.khoa = [...new Set(khoaList.map(bcn => bcn.khoa))].sort();
        break;
      }

      case "roles": {
        // PDT can get list of roles
        if (sender.role !== "phong-dao-tao") {
          return res.status(403).json({ error: "Không có quyền truy cập" });
        }
        result.roles = [
          { value: "phong-dao-tao", label: "Phòng Đào Tạo" },
          { value: "ban-chu-nhiem", label: "Ban Chủ Nhiệm" },
          { value: "giang-vien", label: "Giảng viên" },
          { value: "sinh-vien", label: "Sinh viên" },
        ];
        break;
      }

      default:
        return res.status(400).json({ error: "Loại không hợp lệ" });
    }

    res.json(result);
  } catch (error) {
    console.error("Error getting recipients:", error);
    res.status(500).json({ error: "Lỗi khi tải danh sách người nhận" });
  }
});

export default router;
