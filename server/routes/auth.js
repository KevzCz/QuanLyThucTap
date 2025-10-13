import express from "express";
import Account from "../models/Account.js";
import { generateToken, authenticate, authorize } from "../middleware/auth.js";

const router = express.Router();

// PDT authorization middleware
const authPDT = [authenticate, authorize("phong-dao-tao")];

// Login
router.post("/login", async (req, res) => {
  try {
    console.log('Login attempt:', { email: req.body.email, hasPassword: !!req.body.password });
    
    const { email, password } = req.body;

    if (!email || !password) {
      console.log('Missing credentials');
      return res.status(400).json({ error: "Email và mật khẩu là bắt buộc" });
    }

    const account = await Account.findByCredentials(email, password);
    const token = generateToken(account._id);

    // Set HTTP-only cookie
    res.cookie("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    console.log('Login successful for:', account.email);

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
    console.error('Login error:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// Logout
router.post("/logout", (req, res) => {
  res.clearCookie("auth_token");
  res.json({ success: true, message: "Đã đăng xuất thành công" });
});

// Get current user
router.get("/me", authenticate, (req, res) => {
  res.json({
    success: true,
    account: {
      id: req.account.id,
      name: req.account.name,
      email: req.account.email,
      role: req.account.role,
      status: req.account.status
    }
  });
});

// Register new account (PDT only)
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

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
      status: "open"
    });

    await account.save();

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
    res.status(400).json({ error: error.message });
  }
});

// Get all accounts (PDT only)
router.get("/accounts", ...authPDT, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, role, search } = req.query;
    
    const query = {};
    if (status && status !== "all") query.status = status;
    if (role && role !== "all") query.role = role;
    if (search) {
      query.$or = [
        { name: new RegExp(search, "i") },
        { id: new RegExp(search, "i") },
        { email: new RegExp(search, "i") }
      ];
    }

    const accounts = await Account.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Account.countDocuments(query);

    res.json({
      success: true,
      accounts,
      pagination: {
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update account (PDT only)
router.put("/accounts/:id", ...authPDT, async (req, res) => {
  try {
    const { name, email, role, status, password } = req.body;
    
    const account = await Account.findOne({ id: req.params.id });
    if (!account) {
      return res.status(404).json({ error: "Tài khoản không tồn tại" });
    }

    // Update fields
    if (name) account.name = name;
    if (email) account.email = email;
    if (role) account.role = role;
    if (status) account.status = status;
    if (password) account.password = password; // Will be hashed by pre-save hook

    await account.save();

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
    res.status(400).json({ error: error.message });
  }
});

// Delete account (PDT only)
router.delete("/accounts/:id", ...authPDT, async (req, res) => {
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
    res.status(400).json({ error: error.message });
  }
});

// Temporary mock endpoint for student instructor (for development)
router.get("/student-instructor", authenticate, async (req, res) => {
  try {
    if (req.account.role === "sinh-vien") {
      // Try to find real instructor first
      const SinhVien = (await import("../models/SinhVien.js")).default;
      const studentProfile = await SinhVien.findOne({ account: req.account._id })
        .populate('supervisor', 'id name email')
        .populate('internshipSubject', 'id title');

      if (studentProfile?.supervisor && studentProfile?.internshipSubject) {
        res.json({
          success: true,
          instructor: {
            id: studentProfile.supervisor.id,
            name: studentProfile.supervisor.name,
            email: studentProfile.supervisor.email
          },
          subject: {
            id: studentProfile.internshipSubject.id,
            title: studentProfile.internshipSubject.title
          }
        });
      } else {
        // No instructor assigned
        res.json({
          success: true,
          instructor: null,
          subject: null
        });
      }
    } else {
      res.json({
        success: true,
        instructor: null,
        subject: null
      });
    }
  } catch (error) {
    console.error('Student instructor lookup error:', error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

export default router;

