import jwt from "jsonwebtoken";
import Account from "../models/Account.js";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Generate JWT token
export const generateToken = (accountId) => {
  return jwt.sign({ accountId }, JWT_SECRET, { expiresIn: "7d" });
};

// Middleware to verify JWT token
export const authenticate = async (req, res, next) => {
  try {
    const token = req.cookies.auth_token;
    
    if (!token) {
      return res.status(401).json({ error: "Token không tồn tại" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const account = await Account.findById(decoded.accountId);
    
    if (!account || account.status !== "open") {
      return res.status(401).json({ error: "Tài khoản không hợp lệ" });
    }

    req.account = account;
    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(401).json({ error: "Token không hợp lệ" });
  }
};

// Role-based authorization middleware
export const authPDT = [
  authenticate,
  (req, res, next) => {
    if (req.account.role !== "phong-dao-tao") {
      return res.status(403).json({ error: "Không có quyền truy cập" });
    }
    next();
  }
];

export const authBCN = [
  authenticate,
  (req, res, next) => {
    if (req.account.role !== "ban-chu-nhiem") {
      return res.status(403).json({ error: "Không có quyền truy cập" });
    }
    next();
  }
];

export const authGV = [
  authenticate,
  (req, res, next) => {
    if (req.account.role !== "giang-vien") {
      return res.status(403).json({ error: "Không có quyền truy cập" });
    }
    next();
  }
];

export const authSV = [
  authenticate,
  (req, res, next) => {
    if (req.account.role !== "sinh-vien") {
      return res.status(403).json({ error: "Không có quyền truy cập" });
    }
    next();
  }
];

// Role-based authorization
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.account) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    if (!roles.includes(req.account.role)) {
      return res.status(403).json({ error: "Forbidden - Insufficient permissions" });
    }
    
    next();
  };
};

// Multiple roles
export const authPDTOrBCN = [authenticate, authorize("phong-dao-tao", "ban-chu-nhiem")];
export const authGVOrBCN = [authenticate, authorize("giang-vien", "ban-chu-nhiem")];
export const authAll = [authenticate, authorize("phong-dao-tao", "ban-chu-nhiem", "giang-vien", "sinh-vien")];
