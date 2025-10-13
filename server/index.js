import express from "express";
import mongoose from "mongoose";
import PageHeader from "../models/PageHeader.js";
import SubHeader from "../models/SubHeader.js";
import InternshipSubject from "../models/InternshipSubject.js";
import BanChuNhiem from "../models/BanChuNhiem.js";
import GiangVien from "../models/GiangVien.js";
import { authBCN, authenticate, authorize } from "../middleware/auth.js";
import Student from "../models/Student.js";
import studentRoutes from './routes/students.js';

const router = express.Router();

// Get page structure for a subject
router.get("/subjects/:subjectId", authenticate, async (req, res) => {
  try {
    const { subjectId } = req.params;
    const { audience } = req.query;

    // Find the subject
    const subject = await InternshipSubject.findOne({ id: subjectId });
    if (!subject) {
      return res.status(404).json({ error: "Không tìm thấy môn thực tập" });
    }

    // Check permissions
    const userRole = req.account.role;
    let canManage = false;
    
    if (userRole === "phong-dao-tao") {
      canManage = true;
    } else if (userRole === "ban-chu-nhiem") {
      const bcnProfile = await BanChuNhiem.findOne({ 
        account: req.account._id,
        internshipSubject: subject._id 
      });
      canManage = !!bcnProfile;
    }

    // Build audience filter
    const audienceFilter = { internshipSubject: subject._id, isActive: true };
    if (audience && audience !== "all") {
      audienceFilter.audience = { $in: [audience, "tat-ca"] };
    }

    // Get headers with their sub-headers
    const headers = await PageHeader.find(audienceFilter)
      .sort({ order: 1 })
      .lean();

    const headerIds = headers.map(h => h._id);
    const subHeaders = await SubHeader.find({ 
      pageHeader: { $in: headerIds }, 
      isActive: true 
    }).sort({ order: 1 }).lean();

    // Group sub-headers by header
    const headerMap = headers.map(header => ({
      ...header,
      subs: subHeaders.filter(sub => sub.pageHeader.toString() === header._id.toString())
    }));

    res.json({
      success: true,
      subject: {
        id: subject.id,
        title: subject.title,
        canManage
      },
      headers: headerMap
    });
  } catch (error) {
    console.error("Get page structure error:", error);
    res.status(400).json({ error: error.message });
  }
});

// Create page header (BCN only)
router.post("/subjects/:subjectId/headers", ...authBCN, async (req, res) => {
  try {
    const { subjectId } = req.params;
    const { title, order, audience } = req.body;

    if (!title) {
      return res.status(400).json({ error: "Tên header là bắt buộc" });
    }

    const subject = await InternshipSubject.findOne({ id: subjectId });
    if (!subject) {
      return res.status(404).json({ error: "Không tìm thấy môn thực tập" });
    }

    // Verify BCN manages this subject
    const bcnProfile = await BanChuNhiem.findOne({ 
      account: req.account._id,
      internshipSubject: subject._id 
    });
    if (!bcnProfile) {
      return res.status(403).json({ error: "Bạn không quản lý môn thực tập này" });
    }

    const header = new PageHeader({
      internshipSubject: subject._id,
      title,
      order: order || 1,
      audience: audience || "tat-ca"
    });

    await header.save();

    res.status(201).json({
      success: true,
      header
    });
  } catch (error) {
    console.error("Create header error:", error);
    res.status(400).json({ error: error.message });
  }
});

// Update page header (BCN only)
router.put("/headers/:headerId", ...authBCN, async (req, res) => {
  try {
    const { headerId } = req.params;
    const { title, order, audience } = req.body;

    const header = await PageHeader.findById(headerId)
      .populate('internshipSubject', 'id title');

    if (!header) {
      return res.status(404).json({ error: "Không tìm thấy header" });
    }

    // Verify BCN manages this subject
    const bcnProfile = await BanChuNhiem.findOne({ 
      account: req.account._id,
      internshipSubject: header.internshipSubject._id 
    });
    if (!bcnProfile) {
      return res.status(403).json({ error: "Bạn không quản lý môn thực tập này" });
    }

    // Update fields
    if (title) header.title = title;
    if (order !== undefined) header.order = order;
    if (audience) header.audience = audience;

    await header.save();

    res.json({
      success: true,
      header
    });
  } catch (error) {
    console.error("Update header error:", error);
    res.status(400).json({ error: error.message });
  }
});

// Delete page header (BCN only)
router.delete("/headers/:headerId", ...authBCN, async (req, res) => {
  try {
    const { headerId } = req.params;

    const header = await PageHeader.findById(headerId);
    if (!header) {
      return res.status(404).json({ error: "Không tìm thấy header" });
    }

    // Verify BCN manages this subject
    const bcnProfile = await BanChuNhiem.findOne({ 
      account: req.account._id,
      internshipSubject: header.internshipSubject 
    });
    if (!bcnProfile) {
      return res.status(403).json({ error: "Bạn không quản lý môn thực tập này" });
    }

    // Soft delete header and all its sub-headers
    header.isActive = false;
    await header.save();

    await SubHeader.updateMany(
      { pageHeader: header._id },
      { isActive: false }
    );

    res.json({
      success: true,
      message: "Đã xóa header thành công"
    });
  } catch (error) {
    console.error("Delete header error:", error);
    res.status(400).json({ error: error.message });
  }
});

// Create sub-header (BCN only)
router.post("/headers/:headerId/subs", ...authBCN, async (req, res) => {
  try {
    const { headerId } = req.params;
    const { title, content, order, kind, audience, startAt, endAt, fileUrl, fileName } = req.body;

    if (!title) {
      return res.status(400).json({ error: "Tên sub-header là bắt buộc" });
    }

    const header = await PageHeader.findById(headerId);
    if (!header) {
      return res.status(404).json({ error: "Không tìm thấy header" });
    }

    // Verify BCN manages this subject
    const bcnProfile = await BanChuNhiem.findOne({ 
      account: req.account._id,
      internshipSubject: header.internshipSubject 
    });
    if (!bcnProfile) {
      return res.status(403).json({ error: "Bạn không quản lý môn thực tập này" });
    }

    // Auto-adjust order if there's a conflict
    let finalOrder = order || 1;
    const existingWithOrder = await SubHeader.findOne({ 
      pageHeader: header._id, 
      order: finalOrder,
      isActive: true 
    });
    
    if (existingWithOrder) {
      // Find the highest order and increment
      const highestOrder = await SubHeader.findOne({ 
        pageHeader: header._id,
        isActive: true 
      }).sort({ order: -1 });
      
      finalOrder = highestOrder ? highestOrder.order + 1 : 1;
    }

    const subHeader = new SubHeader({
      pageHeader: header._id,
      title,
      content: content || "",
      order: finalOrder,
      kind: kind || "thuong",
      audience: audience || "tat-ca",
      startAt: startAt ? new Date(startAt) : null,
      endAt: endAt ? new Date(endAt) : null,
      fileUrl,
      fileName
    });

    await subHeader.save();

    res.status(201).json({
      success: true,
      subHeader
    });
  } catch (error) {
    console.error("Create sub-header error:", error);
    res.status(400).json({ error: error.message });
  }
});

// Update sub-header (BCN only)
router.put("/subs/:subId", ...authBCN, async (req, res) => {
  try {
    const { subId } = req.params;
    const { title, content, order, audience, startAt, endAt, fileUrl, fileName } = req.body;

    const subHeader = await SubHeader.findById(subId)
      .populate({
        path: 'pageHeader',
        populate: { path: 'internshipSubject', select: 'id title' }
      });

    if (!subHeader) {
      return res.status(404).json({ error: "Không tìm thấy sub-header" });
    }

    // Verify BCN manages this subject
    const bcnProfile = await BanChuNhiem.findOne({ 
      account: req.account._id,
      internshipSubject: subHeader.pageHeader.internshipSubject._id 
    });
    if (!bcnProfile) {
      return res.status(403).json({ error: "Bạn không quản lý môn thực tập này" });
    }

    // Update fields
    if (title) subHeader.title = title;
    if (content !== undefined) subHeader.content = content;
    if (order !== undefined) subHeader.order = order;
    if (audience) subHeader.audience = audience;
    if (startAt !== undefined) subHeader.startAt = startAt ? new Date(startAt) : null;
    if (endAt !== undefined) subHeader.endAt = endAt ? new Date(endAt) : null;
    if (fileUrl !== undefined) subHeader.fileUrl = fileUrl;
    if (fileName !== undefined) subHeader.fileName = fileName;

    await subHeader.save();

    res.json({
      success: true,
      subHeader
    });
  } catch (error) {
    console.error("Update sub-header error:", error);
    res.status(400).json({ error: error.message });
  }
});

// Delete sub-header (BCN only)
router.delete("/subs/:subId", ...authBCN, async (req, res) => {
  try {
    const { subId } = req.params;

    const subHeader = await SubHeader.findById(subId)
      .populate('pageHeader');

    if (!subHeader) {
      return res.status(404).json({ error: "Không tìm thấy sub-header" });
    }

    // Verify BCN manages this subject
    const bcnProfile = await BanChuNhiem.findOne({ 
      account: req.account._id,
      internshipSubject: subHeader.pageHeader.internshipSubject 
    });
    if (!bcnProfile) {
      return res.status(403).json({ error: "Bạn không quản lý môn thực tập này" });
    }

    // Soft delete
    subHeader.isActive = false;
    await subHeader.save();

    res.json({
      success: true,
      message: "Đã xóa sub-header thành công"
    });
  } catch (error) {
    console.error("Delete sub-header error:", error);
    res.status(400).json({ error: error.message });
  }
});

// Get single sub-header content (for editing)
router.get("/subs/:subId", authenticate, async (req, res) => {
  try {
    const { subId } = req.params;

    const subHeader = await SubHeader.findById(subId)
      .populate({
        path: 'pageHeader',
        populate: { path: 'internshipSubject', select: 'id title' }
      });

    if (!subHeader) {
      return res.status(404).json({ error: "Không tìm thấy sub-header" });
    }

    // Check permissions
    let canEdit = false;
    if (req.account.role === "phong-dao-tao") {
      canEdit = true;
    } else if (req.account.role === "ban-chu-nhiem") {
      const bcnProfile = await BanChuNhiem.findOne({ 
        account: req.account._id,
        internshipSubject: subHeader.pageHeader.internshipSubject._id 
      });
      canEdit = !!bcnProfile;
    }

    res.json({
      success: true,
      subHeader,
      canEdit,
      subject: {
        id: subHeader.pageHeader.internshipSubject.id,
        title: subHeader.pageHeader.internshipSubject.title
      }
    });
  } catch (error) {
    console.error("Get sub-header error:", error);
    res.status(400).json({ error: error.message });
  }
});

// Reorder headers (BCN only)
router.put("/subjects/:subjectId/headers/reorder", ...authBCN, async (req, res) => {
  try {
    const { subjectId } = req.params;
    const { headerIds } = req.body; // Array of header IDs in new order

    if (!Array.isArray(headerIds)) {
      return res.status(400).json({ error: "headerIds phải là một mảng" });
    }

    const subject = await InternshipSubject.findOne({ id: subjectId });
    if (!subject) {
      return res.status(404).json({ error: "Không tìm thấy môn thực tập" });
    }

    // Verify BCN manages this subject
    const bcnProfile = await BanChuNhiem.findOne({ 
      account: req.account._id,
      internshipSubject: subject._id 
    });
    if (!bcnProfile) {
      return res.status(403).json({ error: "Bạn không quản lý môn thực tập này" });
    }

    // Use a transaction to ensure atomicity
    const session = await mongoose.startSession();
    
    try {
      await session.withTransaction(async () => {
        // Use timestamp-based temporary orders to avoid conflicts
        const tempOrderBase = Date.now();
        
        // First, set all headers to unique temporary orders
        for (let i = 0; i < headerIds.length; i++) {
          await PageHeader.updateOne(
            { 
              _id: headerIds[i], 
              internshipSubject: subject._id 
            },
            { order: tempOrderBase + i },
            { session }
          );
        }

        // Then update to final positive orders
        for (let i = 0; i < headerIds.length; i++) {
          await PageHeader.updateOne(
            { 
              _id: headerIds[i], 
              internshipSubject: subject._id 
            },
            { order: i + 1 },
            { session }
          );
        }
      });

      res.json({
        success: true,
        message: "Đã cập nhật thứ tự header thành công"
      });
    } catch (transactionError) {
      throw transactionError;
    } finally {
      await session.endSession();
    }
  } catch (error) {
    console.error("Reorder headers error:", error);
    res.status(400).json({ error: "Không thể thay đổi thứ tự header: " + error.message });
  }
});

// Reorder sub-headers within a header (BCN only)
router.put("/headers/:headerId/subs/reorder", ...authBCN, async (req, res) => {
  try {
    const { headerId } = req.params;
    const { subHeaderIds } = req.body; // Array of sub-header IDs in new order

    if (!Array.isArray(subHeaderIds)) {
      return res.status(400).json({ error: "subHeaderIds phải là một mảng" });
    }

    const header = await PageHeader.findById(headerId);
    if (!header) {
      return res.status(404).json({ error: "Không tìm thấy header" });
    }

    // Verify BCN manages this subject
    const bcnProfile = await BanChuNhiem.findOne({ 
      account: req.account._id,
      internshipSubject: header.internshipSubject 
    });
    if (!bcnProfile) {
      return res.status(403).json({ error: "Bạn không quản lý môn thực tập này" });
    }

    // Use a transaction to ensure atomicity
    const session = await mongoose.startSession();
    
    try {
      await session.withTransaction(async () => {
        // Use timestamp-based temporary orders to avoid conflicts
        const tempOrderBase = Date.now();
        
        // First, set all sub-headers to unique temporary orders
        for (let i = 0; i < subHeaderIds.length; i++) {
          await SubHeader.updateOne(
            { _id: subHeaderIds[i], pageHeader: header._id },
            { order: tempOrderBase + i },
            { session }
          );
        }

        // Then update to final positive orders
        for (let i = 0; i < subHeaderIds.length; i++) {
          await SubHeader.updateOne(
            { _id: subHeaderIds[i], pageHeader: header._id },
            { order: i + 1 },
            { session }
          );
        }
      });

      res.json({
        success: true,
        message: "Đã cập nhật thứ tự sub-header thành công"
      });
    } catch (transactionError) {
      throw transactionError;
    } finally {
      await session.endSession();
    }
  } catch (error) {
    console.error("Reorder sub-headers error:", error);
    res.status(400).json({ error: "Không thể thay đổi thứ tự sub-header: " + error.message });
  }
});

// Students routes

// Get all students (for BCN)
router.get("/", ...authBCN, async (req, res) => {
  try {
    const students = await Student.find({ isActive: true }).sort({ name: 1 });
    res.json({ success: true, students });
  } catch (error) {
    console.error("Get students error:", error);
    res.status(400).json({ error: error.message });
  }
});

// Get student by ID (for BCN and GV)
router.get("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const student = await Student.findById(id)
      .populate("internshipSubject", "id title")
      .populate("supervisor", "id name");

    if (!student) {
      return res.status(404).json({ success: false, error: "Student not found" });
    }

    res.json({ success: true, student });
  } catch (error) {
    console.error("Get student error:", error);
    res.status(400).json({ error: error.message });
  }
});

// Create student (BCN only)
router.post("/", ...authBCN, async (req, res) => {
  try {
    const { name, email, password, internshipSubject, supervisor } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email, and password are required" });
    }

    const student = new Student({
      name,
      email,
      password,
      internshipSubject,
      supervisor,
      status: "duoc-huong-dan",
      createdAt: new Date()
    });

    await student.save();

    res.status(201).json({ success: true, student });
  } catch (error) {
    console.error("Create student error:", error);
    res.status(400).json({ error: error.message });
  }
});

// Update student (BCN only)
router.put("/:id", ...authBCN, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, internshipSubject, supervisor, status } = req.body;

    const student = await Student.findById(id);

    if (!student) {
      return res.status(404).json({ success: false, error: "Student not found" });
    }

    // Update fields
    if (name) student.name = name;
    if (email) student.email = email;
    if (password) student.password = password;
    if (internshipSubject) student.internshipSubject = internshipSubject;
    if (supervisor) student.supervisor = supervisor;
    if (status) student.status = status;

    await student.save();

    res.json({ success: true, student });
  } catch (error) {
    console.error("Update student error:", error);
    res.status(400).json({ error: error.message });
  }
});

// Delete student (BCN only)
router.delete("/:id", ...authBCN, async (req, res) => {
  try {
    const { id } = req.params;

    const student = await Student.findById(id);
    if (!student) {
      return res.status(404).json({ success: false, error: "Student not found" });
    }

    // Soft delete
    student.isActive = false;
    await student.save();

    res.json({ success: true, message: "Student deleted successfully" });
  } catch (error) {
    console.error("Delete student error:", error);
    res.status(400).json({ error: error.message });
  }
});

export default router;