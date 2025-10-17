import jwt from "jsonwebtoken";
import Account from "../models/Account.js";
import InternshipSubject from "../models/InternshipSubject.js";
import BanChuNhiem from "../models/BanChuNhiem.js";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Generate JWT token
export function generateToken(accountId) {
  return jwt.sign({ accountId }, JWT_SECRET, { expiresIn: "7d" });
}

// Authenticate middleware
export async function authenticate(req, res, next) {
  try {
    const token = req.cookies.auth_token;

    if (!token) {
      return res.status(401).json({ error: "Token không tồn tại" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const account = await Account.findById(decoded.accountId);

    if (!account) {
      return res.status(401).json({ error: "Tài khoản không tồn tại" });
    }

    if (account.status !== "open") {
      return res.status(401).json({ error: "Tài khoản đã bị khóa" });
    }

    req.account = account;
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    return res.status(401).json({ error: "Token không hợp lệ" });
  }
}

// Authorization middleware factory
export function authorize(roles) {
  return (req, res, next) => {
    if (!req.account) {
      return res.status(401).json({ error: "Chưa xác thực" });
    }

    if (!roles.includes(req.account.role)) {
      return res.status(403).json({ error: "Không có quyền truy cập" });
    }

    next();
  };
}

// Role-specific middleware
export const authPDT = [authenticate, authorize(["phong-dao-tao"])];
export const authBCN = [authenticate, authorize(["ban-chu-nhiem"])];
export const authGV = [authenticate, authorize(["giang-vien"])];
export const authSV = [authenticate, authorize(["sinh-vien"])];
export const authPDTOrBCN = [authenticate, authorize(["phong-dao-tao", "ban-chu-nhiem"])];
export const authAll = [authenticate, authorize(["phong-dao-tao", "ban-chu-nhiem", "giang-vien", "sinh-vien"])];

// Teacher-specific authorization
export const authTeacher = [
  authenticate,
  (req, res, next) => {
    if (req.account.role !== "giang-vien") {
      return res.status(403).json({ error: "Chỉ giảng viên mới có quyền truy cập" });
    }
    next();
  }
];

// BCN authorization with subject verification
export const authBCNForSubject = async (req, res, next) => {
  try {
    // First authenticate
    await new Promise((resolve, reject) => {
      authenticate(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    if (req.account.role !== "ban-chu-nhiem") {
      return res.status(403).json({ error: "Không có quyền truy cập" });
    }

    // Get subject from params or body
    const subjectId = req.params.subjectId || req.body.subjectId;
    if (subjectId) {
      const subject = await InternshipSubject.findOne({ id: subjectId });
      if (subject) {
        const bcnProfile = await BanChuNhiem.findOne({ 
          account: req.account._id,
          internshipSubject: subject._id 
        });
        if (!bcnProfile) {
          return res.status(403).json({ error: "Bạn không quản lý môn thực tập này" });
        }
      }
    }

    next();
  } catch (error) {
    console.error('BCN Subject Auth error:', error);
    res.status(401).json({ error: "Lỗi xác thực" });
  }
};
export default {
  generateToken,
  authenticate,
  authorize,
  authPDT,
  authBCN,
  authGV,
  authSV,
  authPDTOrBCN,
  authAll,
  authTeacher,
  authBCNForSubject
};