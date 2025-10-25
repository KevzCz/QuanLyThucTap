import express from "express";
import Account from "../models/Account.js";
import { authenticate, authPDT } from "../middleware/auth.js";
import notificationService from "../services/notificationService.js";

const router = express.Router();

// Get all accounts (PDT only)
// Get all accounts (PDT only)
router.get("/", ...authPDT, async (req, res) => {
  try {
    // Normalize numbers
    const pageNum = Math.max(1, Number(req.query.page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(req.query.limit) || 10));
    const { status, role, search } = req.query;

    // Build query
    const query = {};
    if (status && status !== "all") query.status = status;
    if (role && role !== "all") query.role = role;
    if (search) {
      query.$or = [
        { name: new RegExp(search, "i") },
        { id: new RegExp(search, "i") },
        { email: new RegExp(search, "i") },
      ];
    }

    // Exclude the requester (so totals & pages are correct)
    if (req.account?.id) {
      query.id = { ...(query.id || {}), $ne: req.account.id };
    }

    const [accounts, total] = await Promise.all([
      Account.find(query)
        .sort({ createdAt: -1 })
        .limit(limitNum)
        .skip((pageNum - 1) * limitNum),
      Account.countDocuments(query),
    ]);

    res.json({
      success: true,
      accounts,
      pagination: {
        page: pageNum,
        pages: Math.max(1, Math.ceil(total / limitNum)),
        total,
      },
    });
  } catch (error) {
    console.error("Get accounts error:", error);
    res.status(400).json({ error: error.message });
  }
});


// Create account (PDT only)
router.post("/", ...authPDT, async (req, res) => {
  try {
    const { name, email, password, role, status } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: "Tất cả các trường là bắt buộc" });
    }

    const existingAccount = await Account.findOne({ email });
    if (existingAccount) {
      return res.status(400).json({ error: "Email đã được sử dụng" });
    }

    const account = new Account({
      name,
      email,
      password,
      role,
      status: status || "open"
      // Don't include id - let the pre-save hook generate it
    });

    await account.save();

    // Notify the account user about their account creation
    try {
      const io = req.app.get('io');
      await notificationService.createNotification({
        recipient: account._id,
        sender: req.account._id,
        type: 'system',
        title: 'Tài khoản được tạo thành công',
        message: `Tài khoản của bạn đã được tạo với vai trò ${role === 'phong-dao-tao' ? 'Phòng Đào Tạo' : role === 'ban-chu-nhiem' ? 'Ban Chủ Nhiệm' : role === 'giang-vien' ? 'Giảng viên' : 'Sinh viên'}`,
        link: '/profile',
        priority: 'high',
        metadata: { accountId: account.id }
      }, io);
    } catch (notifError) {
      console.error('Error sending account creation notification:', notifError);
    }

    res.status(201).json({
      success: true,
      account: {
        id: account.id,
        name: account.name,
        email: account.email,
        role: account.role,
        status: account.status
      }
    });
  } catch (error) {
    console.error('Create account error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Update account (PDT only)
router.put("/:id", ...authPDT, async (req, res) => {
  try {
    const { name, email, role, status, password } = req.body;
    
    const account = await Account.findOne({ id: req.params.id });
    if (!account) {
      return res.status(404).json({ error: "Tài khoản không tồn tại" });
    }

    // Check for email conflicts if email is being changed
    if (email && email !== account.email) {
      const existingAccount = await Account.findOne({ email });
      if (existingAccount) {
        return res.status(400).json({ error: "Email đã được sử dụng" });
      }
    }

    // Update fields
    const originalStatus = account.status;
    const originalRole = account.role;
    
    if (name) account.name = name;
    if (email) account.email = email;
    if (role) account.role = role;
    if (status) account.status = status;
    if (password) account.password = password; // Will be hashed by pre-save hook

    await account.save();

    // Notify user about important account changes
    try {
      const io = req.app.get('io');
      
      // Notify about status change
      if (status && status !== originalStatus) {
        const statusText = status === 'locked' ? 'bị khóa' : 'được kích hoạt';
        await notificationService.createNotification({
          recipient: account._id,
          sender: req.account._id,
          type: 'system',
          title: 'Trạng thái tài khoản thay đổi',
          message: `Tài khoản của bạn đã ${statusText}`,
          link: '/profile',
          priority: status === 'locked' ? 'urgent' : 'high',
          metadata: { 
            accountId: account.id,
            oldStatus: originalStatus,
            newStatus: status
          }
        }, io);
      }
      
      // Notify about role change
      if (role && role !== originalRole) {
        const roleNames = {
          'phong-dao-tao': 'Phòng Đào Tạo',
          'ban-chu-nhiem': 'Ban Chủ Nhiệm', 
          'giang-vien': 'Giảng viên',
          'sinh-vien': 'Sinh viên'
        };
        await notificationService.createNotification({
          recipient: account._id,
          sender: req.account._id,
          type: 'system',
          title: 'Vai trò tài khoản thay đổi',
          message: `Vai trò của bạn đã được thay đổi thành ${roleNames[role] || role}`,
          link: '/profile',
          priority: 'high',
          metadata: { 
            accountId: account.id,
            oldRole: originalRole,
            newRole: role
          }
        }, io);
      }
    } catch (notifError) {
      console.error('Error sending account update notification:', notifError);
    }

    res.json({
      success: true,
      account: {
        id: account.id,
        name: account.name,
        email: account.email,
        role: account.role,
        status: account.status
      }
    });
  } catch (error) {
    console.error('Update account error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Delete account (PDT only)
router.delete("/:id", ...authPDT, async (req, res) => {
  try {
    const account = await Account.findOneAndDelete({ id: req.params.id });
    if (!account) {
      return res.status(404).json({ error: "Tài khoản không tồn tại" });
    }

    res.json({
      success: true,
      message: "Đã xóa tài khoản thành công"
    });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Search users based on role permissions (MUST be before /:id route)
router.get("/search", authenticate, async (req, res) => {
  try {
    const { q } = req.query;
    const currentUser = req.account;
    
    console.log("🔍 Search request:", { q, userRole: currentUser.role, userId: currentUser.id });

    if (!q || q.trim().length < 2) {
      return res.json({ success: true, users: [] });
    }

    const searchQuery = {
      $and: [
        {
          $or: [
            { name: new RegExp(q, "i") },
            { id: new RegExp(q, "i") },
            { email: new RegExp(q, "i") }
          ]
        },
        { id: { $ne: currentUser.id } }, // Exclude self
        { status: "open" } // Only active accounts
      ]
    };

    let users = [];

    // Role-based filtering
    if (currentUser.role === "phong-dao-tao") {
      // PDT can search all roles
      users = await Account.find(searchQuery)
        .select("id name email role")
        .limit(10)
        .lean();
    } else if (currentUser.role === "ban-chu-nhiem") {
      // BCN can search GV and SV in their subject
      const BanChuNhiem = (await import("../models/BanChuNhiem.js")).default;
      const bcn = await BanChuNhiem.findOne({ account: currentUser._id }).populate("internshipSubject");
      
      if (bcn && bcn.internshipSubject) {
        const subject = bcn.internshipSubject;
        
        // Get lecturer and student IDs from the subject
        const allowedIds = [
          ...subject.lecturers.map(id => id.toString()),
          ...subject.students.map(id => id.toString())
        ];

        // Find accounts matching search and in allowed list
        const allowedAccounts = await Account.find({ _id: { $in: allowedIds } });
        const allowedAccountIds = allowedAccounts.map(acc => acc.id);

        searchQuery.$and.push({ id: { $in: allowedAccountIds } });
        searchQuery.$and.push({ role: { $in: ["giang-vien", "sinh-vien"] } });

        users = await Account.find(searchQuery)
          .select("id name email role")
          .limit(10)
          .lean();
      }
    } else if (currentUser.role === "giang-vien") {
      // GV can search their managed students
      const GiangVien = (await import("../models/GiangVien.js")).default;
      const gv = await GiangVien.findOne({ account: currentUser._id });

      if (gv && gv.managedStudents && gv.managedStudents.length > 0) {
        // Get account IDs from managed students
        const studentAccounts = await Account.find({ _id: { $in: gv.managedStudents } });
        const studentIds = studentAccounts.map(acc => acc.id);

        searchQuery.$and.push({ id: { $in: studentIds } });
        searchQuery.$and.push({ role: "sinh-vien" });

        users = await Account.find(searchQuery)
          .select("id name email role")
          .limit(10)
          .lean();
      }
    } else if (currentUser.role === "sinh-vien") {
      // SV can only search their supervisor
      const SinhVien = (await import("../models/SinhVien.js")).default;
      const sv = await SinhVien.findOne({ account: currentUser._id });

      if (sv && sv.supervisor) {
        const supervisorAccount = await Account.findOne({ _id: sv.supervisor });
        
        if (supervisorAccount) {
          searchQuery.$and.push({ id: supervisorAccount.id });
          searchQuery.$and.push({ role: "giang-vien" });

          users = await Account.find(searchQuery)
            .select("id name email role")
            .limit(10)
            .lean();
        }
      }
    }

    res.json({ success: true, users });
  } catch (error) {
    console.error("Search users error:", error);
    res.status(500).json({ success: false, error: "Lỗi server" });
  }
});

// Get account by ID (authenticated users)
router.get("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const currentUser = req.account;

    // Find the account
    const account = await Account.findOne({ id }).select("-password");

    if (!account) {
      return res.status(404).json({ success: false, error: "Không tìm thấy tài khoản" });
    }

    // Check permissions based on role
    let hasPermission = false;

    if (currentUser.role === "phong-dao-tao") {
      // PDT can view any account
      hasPermission = true;
    } else if (currentUser.role === "ban-chu-nhiem") {
      // BCN can view GV and SV in their subject
      const BanChuNhiem = (await import("../models/BanChuNhiem.js")).default;
      const bcn = await BanChuNhiem.findOne({ account: currentUser._id }).populate("internshipSubject");

      if (bcn && bcn.internshipSubject) {
        const subject = bcn.internshipSubject;
        const canViewGV = subject.lecturers?.some(l => l.toString() === account._id.toString());
        const canViewSV = subject.students?.some(s => s.toString() === account._id.toString());
        hasPermission = canViewGV || canViewSV;
      }
    } else if (currentUser.role === "giang-vien") {
      // GV can view their students
      const GiangVien = (await import("../models/GiangVien.js")).default;
      const gv = await GiangVien.findOne({ account: currentUser._id });

      if (gv) {
        hasPermission = gv.managedStudents?.some(s => s.toString() === account._id.toString());
      }
    } else if (currentUser.role === "sinh-vien") {
      // SV can view their supervisor
      const SinhVien = (await import("../models/SinhVien.js")).default;
      const sv = await SinhVien.findOne({ account: currentUser._id });

      if (sv && sv.supervisor) {
        hasPermission = sv.supervisor.toString() === account._id.toString();
      }
    }

    // Can always view own account
    if (currentUser.id === id) {
      hasPermission = true;
    }

    if (!hasPermission) {
      return res.status(403).json({ success: false, error: "Không có quyền xem tài khoản này" });
    }

    // Fetch role-specific information
    let additionalInfo = {};

    if (account.role === "sinh-vien") {
      const SinhVien = (await import("../models/SinhVien.js")).default;
      const sv = await SinhVien.findOne({ account: account._id });
      if (sv) {
        additionalInfo = {
          studentClass: sv.class,
          year: sv.year,
          internshipStatus: sv.internshipStatus,
        };
      }
    } else if (account.role === "giang-vien") {
      const GiangVien = (await import("../models/GiangVien.js")).default;
      const gv = await GiangVien.findOne({ account: account._id });
      if (gv) {
        additionalInfo = {
          department: gv.department,
          maxStudents: gv.maxStudents,
        };
      }
    } else if (account.role === "ban-chu-nhiem") {
      const BanChuNhiem = (await import("../models/BanChuNhiem.js")).default;
      const bcn = await BanChuNhiem.findOne({ account: account._id });
      if (bcn) {
        additionalInfo = {
          department: bcn.department,
        };
      }
    }

    res.json({
      success: true,
      account: {
        ...account.toObject(),
        ...additionalInfo,
      },
    });
  } catch (error) {
    console.error("Get account error:", error);
    res.status(500).json({ success: false, error: "Lỗi server" });
  }
});

export default router;
