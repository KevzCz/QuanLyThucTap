import express from "express";
import mongoose from "mongoose";
import Account from "../models/Account.js";
import PageHeader from "../models/PageHeader.js";
import SubHeader from "../models/SubHeader.js";
import InternshipSubject from "../models/InternshipSubject.js";
import BanChuNhiem from "../models/BanChuNhiem.js";
import GiangVien from "../models/GiangVien.js";
import FileSubmission from "../models/FileSubmission.js";
import SinhVien from "../models/SinhVien.js";
import { authBCN, authenticate, authorize } from "../middleware/auth.js";
import notificationService from "../services/notificationService.js";

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
    const audienceFilter = { 
      internshipSubject: subject._id, 
      isActive: true,
      pageType: 'khoa' // Only show department pages, not teacher pages
    };
    if (audience && audience !== "all") {
      audienceFilter.audience = { $in: [audience, "tat-ca"] };
    }

    // Get headers with their sub-headers
    const headers = await PageHeader.find(audienceFilter)
      .sort({ order: 1 })
      .lean();

    const headerIds = headers.map(h => h._id);
    
    // Build sub-header filter with audience
    const subHeaderFilter = { 
      pageHeader: { $in: headerIds }, 
      isActive: true 
    };
    // Apply same audience filter to sub-headers
    if (audience && audience !== "all") {
      subHeaderFilter.audience = { $in: [audience, "tat-ca"] };
    }
    
    const subHeaders = await SubHeader.find(subHeaderFilter)
      .sort({ order: 1 })
      .lean();

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

    // Send notifications to students if it's thông báo or nộp-file type
    if (kind === 'thong-bao' || kind === 'nop-file') {
      const io = req.app.get('io');
      const subject = await InternshipSubject.findById(header.internshipSubject);
      
      if (subject && subject.students && subject.students.length > 0) {
        const notificationType = kind === 'thong-bao' ? 'Thông báo mới' : 'Yêu cầu nộp file mới';
        const notificationMessage = kind === 'thong-bao' 
          ? `Thông báo mới từ khoa: ${title}`
          : `Yêu cầu nộp file mới: ${title}${endAt ? ` (Hạn: ${new Date(endAt).toLocaleDateString('vi-VN')})` : ''}`;
        
        // Send to all students in the subject
        for (const studentId of subject.students) {
          await notificationService.createNotification({
            recipient: studentId,
            sender: req.account._id,
            type: kind === 'thong-bao' ? 'system' : 'file-submitted',
            title: notificationType,
            message: notificationMessage,
            link: `/docs-dept/sub/${subHeader._id}`,
            priority: kind === 'nop-file' ? 'high' : 'normal',
            metadata: { 
              subjectId: subject.id,
              subHeaderId: subHeader._id.toString()
            }
          }, io);
        }
      }
    }

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
    if (title !== undefined) subHeader.title = title;
    if (content !== undefined) subHeader.content = content;
    if (order !== undefined) subHeader.order = order;
    if (audience) subHeader.audience = audience;
    if (startAt !== undefined) subHeader.startAt = startAt ? new Date(startAt) : null;
    if (endAt !== undefined) subHeader.endAt = endAt ? new Date(endAt) : null;
    if (fileUrl !== undefined) subHeader.fileUrl = fileUrl;
    if (fileName !== undefined) subHeader.fileName = fileName;

    await subHeader.save();

    console.log('SubHeader updated:', {
      id: subHeader._id,
      title: subHeader.title,
      content: subHeader.content?.substring(0, 50) + '...',
      kind: subHeader.kind
    });

    res.json({
      success: true,
      subHeader: {
        _id: subHeader._id,
        id: subHeader.id,
        title: subHeader.title,
        content: subHeader.content,
        order: subHeader.order,
        kind: subHeader.kind,
        audience: subHeader.audience,
        startAt: subHeader.startAt,
        endAt: subHeader.endAt,
        fileUrl: subHeader.fileUrl,
        fileName: subHeader.fileName
      }
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
    } else if (req.account.role === "giang-vien") {
      // Check if teacher owns this sub-header (for teacher pages)
      if (subHeader.pageHeader.pageType === "teacher") {
        const lecturerProfile = await GiangVien.findOne({ 
          account: req.account._id,
          _id: subHeader.pageHeader.instructor
        });
        canEdit = !!lecturerProfile;
      }
    }

    // Return the sub-header with all its content
    res.json({
      success: true,
      subHeader: {
        _id: subHeader._id,
        id: subHeader.id,
        title: subHeader.title,
        content: subHeader.content || "",
        order: subHeader.order,
        kind: subHeader.kind,
        audience: subHeader.audience,
        startAt: subHeader.startAt,
        endAt: subHeader.endAt,
        fileUrl: subHeader.fileUrl,
        fileName: subHeader.fileName,
        isActive: subHeader.isActive
      },
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

// Teacher-specific routes

// Get teacher's managed page structure
router.get("/teacher/managed", authenticate, authorize(["giang-vien"]), async (req, res) => {
  try {
    // Get lecturer's profile and managed subject
    const lecturerProfile = await GiangVien.findOne({ account: req.account._id })
      .populate('internshipSubject', 'id title');

    if (!lecturerProfile || !lecturerProfile.internshipSubject) {
      return res.json({
        success: true,
        instructor: null,
        subject: null,
        headers: []
      });
    }

    // Get headers created by this instructor
    const headers = await PageHeader.find({
      internshipSubject: lecturerProfile.internshipSubject._id,
      instructor: lecturerProfile._id,
      pageType: "teacher",
      isActive: true
    }).sort({ order: 1 }).lean();

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
      instructor: {
        id: req.account.id,
        name: req.account.name,
        email: req.account.email
      },
      subject: {
        id: lecturerProfile.internshipSubject.id,
        title: lecturerProfile.internshipSubject.title,
        canManage: true
      },
      headers: headerMap
    });
  } catch (error) {
    console.error("Get teacher page structure error:", error);
    res.status(400).json({ error: error.message });
  }
});

// Create teacher page header
router.post("/teacher/subjects/:subjectId/headers", authenticate, authorize(["giang-vien"]), async (req, res) => {
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

    // Verify lecturer manages this subject
    const lecturerProfile = await GiangVien.findOne({ 
      account: req.account._id,
      internshipSubject: subject._id 
    });
    if (!lecturerProfile) {
      return res.status(403).json({ error: "Bạn không được phân công hướng dẫn môn thực tập này" });
    }

    // Auto-adjust order if there's a conflict
    let finalOrder = order || 1;
    const existingWithOrder = await PageHeader.findOne({ 
      internshipSubject: subject._id, 
      order: finalOrder
    });
    
    if (existingWithOrder) {
      // Find the highest order for this subject and increment
      const highestOrder = await PageHeader.findOne({ 
        internshipSubject: subject._id
      }).sort({ order: -1 });
      
      finalOrder = highestOrder ? highestOrder.order + 1 : 1;
    }

    const header = new PageHeader({
      internshipSubject: subject._id,
      instructor: lecturerProfile._id,
      title,
      order: finalOrder,
      audience: audience || "sinh-vien",
      pageType: "teacher"
    });

    await header.save();

    res.status(201).json({
      success: true,
      header
    });
  } catch (error) {
    console.error("Create teacher header error:", error);
    res.status(400).json({ error: error.message });
  }
});

// Update teacher page header
router.put("/teacher/headers/:headerId", authenticate, authorize(["giang-vien"]), async (req, res) => {
  try {
    const { headerId } = req.params;
    const { title, order, audience } = req.body;

    const header = await PageHeader.findById(headerId)
      .populate('instructor', '_id')
      .populate('internshipSubject', 'id title');

    if (!header) {
      return res.status(404).json({ error: "Không tìm thấy header" });
    }

    // Verify this is a teacher page and belongs to the current lecturer
    if (header.pageType !== "teacher") {
      return res.status(403).json({ error: "Không thể chỉnh sửa header của trang khoa" });
    }

    const lecturerProfile = await GiangVien.findOne({ 
      account: req.account._id,
      _id: header.instructor._id
    });
    if (!lecturerProfile) {
      return res.status(403).json({ error: "Bạn không có quyền chỉnh sửa header này" });
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
    console.error("Update teacher header error:", error);
    res.status(400).json({ error: error.message });
  }
});

// Delete teacher page header
router.delete("/teacher/headers/:headerId", authenticate, authorize(["giang-vien"]), async (req, res) => {
  try {
    const { headerId } = req.params;

    const header = await PageHeader.findById(headerId)
      .populate('instructor', '_id');

    if (!header) {
      return res.status(404).json({ error: "Không tìm thấy header" });
    }

    // Verify this is a teacher page and belongs to the current lecturer
    if (header.pageType !== "teacher") {
      return res.status(403).json({ error: "Không thể xóa header của trang khoa" });
    }

    const lecturerProfile = await GiangVien.findOne({ 
      account: req.account._id,
      _id: header.instructor._id
    });
    if (!lecturerProfile) {
      return res.status(403).json({ error: "Bạn không có quyền xóa header này" });
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
    console.error("Delete teacher header error:", error);
    res.status(400).json({ error: error.message });
  }
});

// Create teacher sub-header
router.post("/teacher/headers/:headerId/subs", authenticate, authorize(["giang-vien"]), async (req, res) => {
  try {
    const { headerId } = req.params;
    const { title, content, order, kind, audience, startAt, endAt, fileUrl, fileName } = req.body;

    if (!title) {
      return res.status(400).json({ error: "Tên sub-header là bắt buộc" });
    }

    const header = await PageHeader.findById(headerId)
      .populate('instructor', '_id');

    if (!header) {
      return res.status(404).json({ error: "Không tìm thấy header" });
    }

    // Verify this is a teacher page and belongs to the current lecturer
    if (header.pageType !== "teacher") {
      return res.status(403).json({ error: "Không thể thêm sub-header vào trang khoa" });
    }

    const lecturerProfile = await GiangVien.findOne({ 
      account: req.account._id,
      _id: header.instructor._id
    });
    if (!lecturerProfile) {
      return res.status(403).json({ error: "Bạn không có quyền thêm sub-header vào header này" });
    }

    // Auto-adjust order if there's a conflict
    let finalOrder = order || 1;
    const existingWithOrder = await SubHeader.findOne({ 
      pageHeader: header._id, 
      order: finalOrder,
      isActive: true 
    });
    
    if (existingWithOrder) {
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
      audience: audience || "sinh-vien",
      startAt: startAt ? new Date(startAt) : null,
      endAt: endAt ? new Date(endAt) : null,
      fileUrl,
      fileName
    });

    await subHeader.save();

    // Send notifications to students managed by this teacher for thông báo or nộp-file
    if ((kind === 'thong-bao' || kind === 'nop-file') && audience === 'sinh-vien') {
      const io = req.app.get('io');
      
      // Get all students supervised by this teacher
      const students = await SinhVien.find({ 
        supervisor: lecturerProfile._id,
        isActive: true 
      }).select('account');

      for (const student of students) {
        let notificationMessage = `${lecturerProfile.fullName} đã đăng ${kind === 'thong-bao' ? 'thông báo' : 'yêu cầu nộp file'}: ${title}`;
        
        if (kind === 'nop-file' && endAt) {
          const deadline = new Date(endAt);
          notificationMessage += ` - Hạn: ${deadline.toLocaleDateString('vi-VN')}`;
        }

        await notificationService.createNotification({
          recipient: student.account,
          sender: req.account._id,
          type: kind === 'thong-bao' ? 'system' : 'file-submitted',
          title: kind === 'thong-bao' ? 'Thông báo mới từ giảng viên' : 'Yêu cầu nộp file mới',
          message: notificationMessage,
          link: `/teacher-page/${lecturerProfile._id}`,
          priority: kind === 'nop-file' ? 'high' : 'normal',
          metadata: {
            subHeaderId: subHeader._id.toString(),
            pageHeaderId: header._id.toString(),
            instructorId: lecturerProfile._id.toString(),
            kind,
            deadline: endAt || undefined
          }
        }, io);
      }
    }

    res.status(201).json({
      success: true,
      subHeader
    });
  } catch (error) {
    console.error("Create teacher sub-header error:", error);
    res.status(400).json({ error: error.message });
  }
});

// Get teacher-specific page structure for viewing (public access for students)
router.get('/teacher/:instructorId/view', authenticate, async (req, res) => {
  try {
    const { instructorId } = req.params;
    const { subjectId } = req.query;

    console.log('Teacher page view request:', { instructorId, subjectId });

    // Validate instructorId format - check if it's a valid ObjectId or custom ID
    let instructor;
    
    if (mongoose.Types.ObjectId.isValid(instructorId) && instructorId.length === 24) {
      // It's a MongoDB ObjectId
      instructor = await Account.findById(instructorId);
    } else {
      // It's a custom ID like "GV0001"
      instructor = await Account.findOne({ id: instructorId, role: 'giang-vien' });
    }

    console.log('Found instructor:', instructor ? instructor.id : 'not found');

    if (!instructor || instructor.role !== 'giang-vien') {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy giảng viên'
      });
    }

    // Find the lecturer profile
    const lecturerProfile = await GiangVien.findOne({ account: instructor._id })
      .populate('internshipSubject', 'id title');

    console.log('Lecturer profile:', lecturerProfile ? 'found' : 'not found');

    if (!lecturerProfile?.internshipSubject) {
      return res.json({
        success: true,
        instructor: {
          id: instructor.id,
          name: instructor.name,
          email: instructor.email
        },
        subject: null,
        headers: []
      });
    }

    // If subjectId is provided, verify it matches
    if (subjectId && lecturerProfile.internshipSubject.id !== subjectId) {
      return res.status(400).json({
        success: false,
        error: 'Subject ID không khớp với môn học của giảng viên'
      });
    }

    // Get page structure for this teacher's subject
    const headers = await PageHeader.find({
      internshipSubject: lecturerProfile.internshipSubject._id,
      instructor: lecturerProfile._id,
      pageType: 'teacher',
      isActive: true
    }).sort({ order: 1 }).lean();

    console.log('Found headers:', headers.length);

    const headerIds = headers.map(h => h._id);
    const subHeaders = await SubHeader.find({ 
      pageHeader: { $in: headerIds }, 
      isActive: true 
    }).sort({ order: 1 }).lean();

    console.log('Found sub-headers:', subHeaders.length);

    // Group sub-headers by header
    const headersWithSubs = headers.map(header => ({
      ...header,
      subs: subHeaders.filter(sub => sub.pageHeader.toString() === header._id.toString())
    }));

    res.json({
      success: true,
      instructor: {
        id: instructor.id,
        name: instructor.name,
        email: instructor.email
      },
      subject: {
        id: lecturerProfile.internshipSubject.id,
        title: lecturerProfile.internshipSubject.title,
        canManage: false // Read-only access
      },
      headers: headersWithSubs
    });
  } catch (error) {
    console.error('Get teacher page structure for viewing error:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi tải cấu trúc trang: ' + error.message
    });
  }
});

// Reorder teacher headers
router.put("/teacher/subjects/:subjectId/headers/reorder", authenticate, authorize(["giang-vien"]), async (req, res) => {
  try {
    const { subjectId } = req.params;
    const { headerIds } = req.body;

    if (!Array.isArray(headerIds)) {
      return res.status(400).json({ error: "headerIds phải là một mảng" });
    }

    const subject = await InternshipSubject.findOne({ id: subjectId });
    if (!subject) {
      return res.status(404).json({ error: "Không tìm thấy môn thực tập" });
    }

    // Verify lecturer manages this subject
    const lecturerProfile = await GiangVien.findOne({ 
      account: req.account._id,
      internshipSubject: subject._id 
    });
    if (!lecturerProfile) {
      return res.status(403).json({ error: "Bạn không được phân công hướng dẫn môn thực tập này" });
    }

    const session = await mongoose.startSession();
    
    try {
      await session.withTransaction(async () => {
        // Use timestamp-based temporary orders to avoid conflicts
        const tempOrderBase = Date.now();
        
        // First, set all teacher's headers to unique temporary orders
        for (let i = 0; i < headerIds.length; i++) {
          await PageHeader.updateOne(
            { 
              _id: headerIds[i], 
              instructor: lecturerProfile._id,
              pageType: "teacher"
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
              instructor: lecturerProfile._id,
              pageType: "teacher"
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
    console.error("Reorder teacher headers error:", error);
    res.status(400).json({ error: "Không thể thay đổi thứ tự header: " + error.message });
  }
});

// Reorder teacher sub-headers within a header
router.put("/teacher/headers/:headerId/subs/reorder", authenticate, authorize(["giang-vien"]), async (req, res) => {
  try {
    const { headerId } = req.params;
    const { subHeaderIds } = req.body;

    if (!Array.isArray(subHeaderIds)) {
      return res.status(400).json({ error: "subHeaderIds phải là một mảng" });
    }

    const header = await PageHeader.findById(headerId)
      .populate('instructor', '_id');

    if (!header) {
      return res.status(404).json({ error: "Không tìm thấy header" });
    }

    // Verify this is a teacher page and belongs to the current lecturer
    if (header.pageType !== "teacher") {
      return res.status(403).json({ error: "Không thể sắp xếp sub-header của trang khoa" });
    }

    const lecturerProfile = await GiangVien.findOne({ 
      account: req.account._id,
      _id: header.instructor._id
    });
    if (!lecturerProfile) {
      return res.status(403).json({ error: "Bạn không có quyền sắp xếp sub-header này" });
    }

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
    console.error("Reorder teacher sub-headers error:", error);
    res.status(400).json({ error: "Không thể thay đổi thứ tự sub-header: " + error.message });
  }
});

// Get submissions for a sub-header (role-based filtering)
router.get("/subs/:subId/submissions", authenticate, async (req, res) => {
  try {
    const { subId } = req.params;

    const subHeader = await SubHeader.findById(subId).populate({
      path: 'pageHeader',
      populate: { path: 'internshipSubject instructor' }
    });

    if (!subHeader) {
      return res.status(404).json({ error: "Không tìm thấy sub-header" });
    }
    if (subHeader.kind !== "nop-file") {
      return res.status(400).json({ error: "Sub-header này không phải loại nộp file" });
    }

    const query = { subHeader: subHeader._id };

    // Role-based filtering:
    // - Students: only their own
    // - Teachers: only their own (NOT their students' uploads)
    // - BCN/PDT: see all
    if (req.account.role === "sinh-vien" || req.account.role === "giang-vien") {
      query.submitter = req.account._id;
    }

    const submissions = await FileSubmission.find(query)
      .populate('submitter', 'id name email')
      .populate('reviewedBy', 'id name email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      submissions,
      // Only BCN/PDT can review
      canReview: req.account.role === "ban-chu-nhiem" || req.account.role === "phong-dao-tao"
    });
  } catch (error) {
    console.error("Get submissions error:", error);
    res.status(400).json({ error: error.message });
  }
});


// Submit a file (students and teachers)
router.post("/subs/:subId/submissions", authenticate, async (req, res) => {
  try {
    const { subId } = req.params;
    const { fileUrl, fileName, fileSize } = req.body;

    if (!fileUrl || !fileName || !fileSize) {
      return res.status(400).json({ error: "File information is required" });
    }

    const subHeader = await SubHeader.findById(subId).populate('pageHeader');
    if (!subHeader) {
      return res.status(404).json({ error: "Không tìm thấy sub-header" });
    }
    if (subHeader.kind !== "nop-file") {
      return res.status(400).json({ error: "Sub-header này không phải loại nộp file" });
    }

    // Time window checks
    const now = new Date();
    if (subHeader.startAt && now < new Date(subHeader.startAt)) {
      return res.status(400).json({ error: "Chưa đến thời gian nộp file" });
    }
    if (subHeader.endAt && now > new Date(subHeader.endAt)) {
      return res.status(400).json({ error: "Đã hết thời gian nộp file" });
    }

    // IMPORTANT: Do NOT delete existing submissions anymore — allow multiple
    const submission = new FileSubmission({
      subHeader: subHeader._id,
      submitter: req.account._id,
      fileUrl,
      fileName,
      fileSize
    });

    await submission.save();
    await submission.populate('submitter', 'id name email');

    res.status(201).json({
      success: true,
      submission
    });
  } catch (error) {
    console.error("Submit file error:", error);
    res.status(400).json({ error: error.message });
  }
});


// Update submission status (BCN only)
router.put("/submissions/:submissionId", ...authBCN, async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { status, reviewNote } = req.body;

    const submission = await FileSubmission.findById(submissionId)
      .populate({
        path: 'subHeader',
        populate: {
          path: 'pageHeader',
          populate: { path: 'internshipSubject' }
        }
      });

    if (!submission) {
      return res.status(404).json({ error: "Không tìm thấy bài nộp" });
    }

    // Verify BCN manages this subject
    const bcnProfile = await BanChuNhiem.findOne({ 
      account: req.account._id,
      internshipSubject: submission.subHeader.pageHeader.internshipSubject._id 
    });
    if (!bcnProfile) {
      return res.status(403).json({ error: "Bạn không quản lý môn thực tập này" });
    }

    if (status) submission.status = status;
    if (reviewNote !== undefined) submission.reviewNote = reviewNote;
    submission.reviewedBy = req.account._id;
    submission.reviewedAt = new Date();

    await submission.save();
    await submission.populate('submitter', 'id name email');
    await submission.populate('reviewedBy', 'id name email');

    res.json({
      success: true,
      submission
    });
  } catch (error) {
    console.error("Update submission error:", error);
    res.status(400).json({ error: error.message });
  }
});

// Delete submission (submitter or BCN)
router.delete("/submissions/:submissionId", authenticate, async (req, res) => {
  try {
    const { submissionId } = req.params;

    const submission = await FileSubmission.findById(submissionId)
      .populate({
        path: 'subHeader',
        populate: {
          path: 'pageHeader',
          populate: { path: 'internshipSubject' }
        }
      });

    if (!submission) {
      return res.status(404).json({ error: "Không tìm thấy bài nộp" });
    }

    // Check permissions
    const isOwner = submission.submitter.toString() === req.account._id.toString();
    const isBCN = req.account.role === "ban-chu-nhiem";
    
    if (!isOwner && !isBCN) {
      return res.status(403).json({ error: "Không có quyền xóa bài nộp này" });
    }

    if (isBCN) {
      // Verify BCN manages this subject
      const bcnProfile = await BanChuNhiem.findOne({ 
        account: req.account._id,
        internshipSubject: submission.subHeader.pageHeader.internshipSubject._id 
      });
      if (!bcnProfile) {
        return res.status(403).json({ error: "Bạn không quản lý môn thực tập này" });
      }
    }

    await FileSubmission.deleteOne({ _id: submission._id });

    res.json({
      success: true,
      message: "Đã xóa bài nộp thành công"
    });
  } catch (error) {
    console.error("Delete submission error:", error);
    res.status(400).json({ error: error.message });
  }
});

// Mount page routes under /pages prefix
export default router;
