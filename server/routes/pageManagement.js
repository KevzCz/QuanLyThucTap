import express from "express";
import mongoose from "mongoose";
import Account from "../models/Account.js";
import PageHeader from "../models/PageHeader.js";
import SubHeader from "../models/SubHeader.js";
import BanChuNhiem from "../models/BanChuNhiem.js";
import GiangVien from "../models/GiangVien.js";
import FileSubmission from "../models/FileSubmission.js";
import SinhVien from "../models/SinhVien.js";
import { authBCN, authenticate, authorize } from "../middleware/auth.js";
import notificationService from "../services/notificationService.js";

const router = express.Router();

// Get BCN's khoa page structure for management (BCN only)
router.get("/bcn/khoa", authenticate, authorize(["ban-chu-nhiem"]), async (req, res) => {
  try {
    const { audience } = req.query;

    // Get BCN's khoa
    const bcnProfile = await BanChuNhiem.findOne({ account: req.account._id });
    if (!bcnProfile) {
      return res.status(404).json({ error: "Không tìm thấy thông tin ban chủ nhiệm" });
    }

    // Build audience filter
    const audienceFilter = { 
      khoa: bcnProfile.khoa, 
      isActive: true,
      pageType: 'khoa' // Only show department pages
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
      khoa: {
        name: bcnProfile.khoa,
        canManage: true
      },
      headers: headerMap
    });
  } catch (error) {
    console.error("Get BCN khoa page structure error:", error);
    res.status(400).json({ error: error.message });
  }
});

// Get single header (BCN only)
router.get("/headers/:headerId", ...authBCN, async (req, res) => {
  try {
    const { headerId } = req.params;

    // Validate MongoDB ObjectId format
    if (!headerId || !headerId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: "ID header không hợp lệ" });
    }

    const header = await PageHeader.findById(headerId).lean();

    if (!header) {
      return res.status(404).json({ error: "Không tìm thấy header" });
    }

    // Verify BCN manages this khoa
    const bcnProfile = await BanChuNhiem.findOne({ 
      account: req.account._id
    }).lean();
    
    if (!bcnProfile || bcnProfile.khoa !== header.khoa) {
      return res.status(403).json({ error: "Bạn không quản lý khoa này" });
    }

    res.json({
      success: true,
      header
    });
  } catch (error) {
    console.error("Get header error:", error);
    res.status(500).json({ error: "Lỗi server khi tải header" });
  }
});

// Update page header (BCN only)
router.put("/headers/:headerId", ...authBCN, async (req, res) => {
  try {
    const { headerId } = req.params;
    const { title, order, audience } = req.body;

    const header = await PageHeader.findById(headerId);

    if (!header) {
      return res.status(404).json({ error: "Không tìm thấy header" });
    }

    // Verify BCN manages this khoa
    const bcnProfile = await BanChuNhiem.findOne({ 
      account: req.account._id
    });
    if (!bcnProfile || bcnProfile.khoa !== header.khoa) {
      return res.status(403).json({ error: "Bạn không quản lý khoa này" });
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

    // Verify BCN manages this khoa
    const bcnProfile = await BanChuNhiem.findOne({ 
      account: req.account._id
    });
    if (!bcnProfile || bcnProfile.khoa !== header.khoa) {
      return res.status(403).json({ error: "Bạn không quản lý khoa này" });
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

    // Verify BCN manages this khoa
    const bcnProfile = await BanChuNhiem.findOne({ 
      account: req.account._id
    });
    if (!bcnProfile || bcnProfile.khoa !== header.khoa) {
      return res.status(403).json({ error: "Bạn không quản lý khoa này" });
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

    // Implement audience inheritance: if header has specific audience, sub-header must inherit it
    let finalAudience = audience || "tat-ca";
    if (header.audience !== "tat-ca") {
      finalAudience = header.audience; // Force inheritance
    }

    const subHeader = new SubHeader({
      pageHeader: header._id,
      title,
      content: content || "",
      order: finalOrder,
      kind: kind || "thuong",
      audience: finalAudience,
      startAt: startAt ? new Date(startAt) : null,
      endAt: endAt ? new Date(endAt) : null,
      fileUrl,
      fileName
    });

    await subHeader.save();

    // Send notifications based on audience settings
    if (kind === 'thong-bao' || kind === 'nop-file') {
      try {
        const io = req.app.get('io');
        
        const notificationType = kind === 'thong-bao' ? 'Thông báo mới' : 'Yêu cầu nộp file mới';
        const notificationMessage = kind === 'thong-bao' 
          ? `Thông báo mới từ khoa: ${title}`
          : `Yêu cầu nộp file mới: ${title}${endAt ? ` (Hạn: ${new Date(endAt).toLocaleDateString('vi-VN')})` : ''}`;
        
        // Generate correct link based on kind
        const notificationLink = kind === 'nop-file' 
          ? `/docs-dept/sub/${subHeader._id}/upload`
          : `/docs-dept/sub/${subHeader._id}`;
        
        // Send to students if audience includes them
        if (finalAudience === 'tat-ca' || finalAudience === 'sinh-vien') {
          const students = await SinhVien.find({ khoa: header.khoa })
            .populate('account', '_id')
            .lean();
          
          for (const student of students) {
            if (student.account) {
              await notificationService.createNotification({
                recipient: student.account._id,
                sender: req.account._id,
                type: kind === 'thong-bao' ? 'system' : 'deadline-reminder',
                title: notificationType,
                message: notificationMessage,
                link: notificationLink,
                priority: kind === 'nop-file' ? 'high' : 'normal',
                metadata: { 
                  khoa: header.khoa,
                  subHeaderId: subHeader._id.toString(),
                  audience: finalAudience
                }
              }, io);
            }
          }
        }

        // Send to lecturers if audience includes them
        if (finalAudience === 'tat-ca' || finalAudience === 'giang-vien') {
          const lecturers = await GiangVien.find({ khoa: header.khoa })
            .populate('account', '_id')
            .lean();
          
          for (const lecturer of lecturers) {
            if (lecturer.account) {
              await notificationService.createNotification({
                recipient: lecturer.account._id,
                sender: req.account._id,
                type: 'system',
                title: notificationType,
                message: notificationMessage,
                link: notificationLink,
                priority: 'normal',
                metadata: { 
                  khoa: header.khoa,
                  subHeaderId: subHeader._id.toString(),
                  audience: finalAudience
                }
              }, io);
            }
          }
        }
      } catch (notifError) {
        console.error('Error sending notifications:', notifError);
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
      .populate('pageHeader');

    if (!subHeader) {
      return res.status(404).json({ error: "Không tìm thấy sub-header" });
    }

    // Verify BCN manages this khoa
    const bcnProfile = await BanChuNhiem.findOne({ 
      account: req.account._id
    });
    if (!bcnProfile || bcnProfile.khoa !== subHeader.pageHeader.khoa) {
      return res.status(403).json({ error: "Bạn không quản lý khoa này" });
    }

    // Update fields
    if (title !== undefined) subHeader.title = title;
    if (content !== undefined) subHeader.content = content;
    if (order !== undefined) subHeader.order = order;
    
    // Implement audience inheritance: if header has specific audience, sub-header must inherit it
    if (audience) {
      if (subHeader.pageHeader.audience !== "tat-ca") {
        subHeader.audience = subHeader.pageHeader.audience; // Force inheritance
      } else {
        subHeader.audience = audience; // Allow change only if header is "tat-ca"
      }
    }
    
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

    // Verify BCN manages this khoa
    const bcnProfile = await BanChuNhiem.findOne({ 
      account: req.account._id
    });
    if (!bcnProfile || bcnProfile.khoa !== subHeader.pageHeader.khoa) {
      return res.status(403).json({ error: "Bạn không quản lý khoa này" });
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
      .populate('pageHeader');

    if (!subHeader) {
      return res.status(404).json({ error: "Không tìm thấy sub-header" });
    }

    // Check permissions
    let canEdit = false;
    if (req.account.role === "phong-dao-tao") {
      canEdit = true;
    } else if (req.account.role === "ban-chu-nhiem") {
      const bcnProfile = await BanChuNhiem.findOne({ 
        account: req.account._id
      });
      canEdit = bcnProfile && bcnProfile.khoa === subHeader.pageHeader.khoa;
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
      khoa: {
        name: subHeader.pageHeader.khoa,
        title: `Khoa ${subHeader.pageHeader.khoa}`
      }
    });
  } catch (error) {
    console.error("Get sub-header error:", error);
    res.status(400).json({ error: error.message });
  }
});

// Reorder headers is already handled by khoa/headers/reorder route below - Remove this duplicate subject-based route

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

    // Verify BCN manages this khoa
    const bcnProfile = await BanChuNhiem.findOne({ 
      account: req.account._id
    });
    if (!bcnProfile || bcnProfile.khoa !== header.khoa) {
      return res.status(403).json({ error: "Bạn không quản lý khoa này" });
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

// ===== Khoa-based Page Management Routes (BCN) =====

// Create page header for khoa
router.post("/khoa/headers", authenticate, authorize(["ban-chu-nhiem"]), async (req, res) => {
  try {
    const { title, order, audience } = req.body;

    // Get BCN's khoa
    const bcnProfile = await BanChuNhiem.findOne({ account: req.account._id });
    if (!bcnProfile) {
      return res.status(404).json({ error: "Không tìm thấy thông tin ban chủ nhiệm" });
    }

    // Validate title
    if (!title || typeof title !== "string" || title.trim().length < 2 || title.trim().length > 200) {
      return res.status(400).json({ error: "Tiêu đề phải từ 2-200 ký tự" });
    }

    // Create new header
    const header = new PageHeader({
      khoa: bcnProfile.khoa,
      title: title.trim(),
      order: order || 1,
      audience: audience || "tat-ca",
      pageType: "khoa",
      isActive: true
    });

    await header.save();

    res.json({
      success: true,
      header
    });
  } catch (error) {
    console.error("Create khoa header error:", error);
    res.status(400).json({ error: error.message });
  }
});

// Update page header for khoa
router.put("/khoa/headers/:headerId", authenticate, authorize(["ban-chu-nhiem"]), async (req, res) => {
  try {
    const { headerId } = req.params;
    const { title, audience } = req.body;

    const header = await PageHeader.findById(headerId);
    if (!header) {
      return res.status(404).json({ error: "Không tìm thấy header" });
    }

    // Verify BCN manages this khoa
    const bcnProfile = await BanChuNhiem.findOne({ account: req.account._id });
    if (!bcnProfile || bcnProfile.khoa !== header.khoa) {
      return res.status(403).json({ error: "Bạn không quản lý khoa này" });
    }

    // Update fields
    if (title) header.title = title.trim();
    if (audience) header.audience = audience;

    await header.save();

    res.json({
      success: true,
      header
    });
  } catch (error) {
    console.error("Update khoa header error:", error);
    res.status(400).json({ error: error.message });
  }
});

// Delete page header for khoa
router.delete("/khoa/headers/:headerId", authenticate, authorize(["ban-chu-nhiem"]), async (req, res) => {
  try {
    const { headerId } = req.params;

    const header = await PageHeader.findById(headerId);
    if (!header) {
      return res.status(404).json({ error: "Không tìm thấy header" });
    }

    // Verify BCN manages this khoa
    const bcnProfile = await BanChuNhiem.findOne({ account: req.account._id });
    if (!bcnProfile || bcnProfile.khoa !== header.khoa) {
      return res.status(403).json({ error: "Bạn không quản lý khoa này" });
    }

    // Delete all sub-headers first
    await SubHeader.deleteMany({ pageHeader: header._id });

    // Delete the header
    await header.deleteOne();

    res.json({
      success: true,
      message: "Đã xóa header và các sub-header thành công"
    });
  } catch (error) {
    console.error("Delete khoa header error:", error);
    res.status(400).json({ error: error.message });
  }
});

// Create sub-header for khoa
router.post("/khoa/headers/:headerId/subs", authenticate, authorize(["ban-chu-nhiem"]), async (req, res) => {
  try {
    const { headerId } = req.params;
    const { title, content, type, order, audience, deadline } = req.body;

    const header = await PageHeader.findById(headerId);
    if (!header) {
      return res.status(404).json({ error: "Không tìm thấy header" });
    }

    // Verify BCN manages this khoa
    const bcnProfile = await BanChuNhiem.findOne({ account: req.account._id });
    if (!bcnProfile || bcnProfile.khoa !== header.khoa) {
      return res.status(403).json({ error: "Bạn không quản lý khoa này" });
    }

    // Create sub-header
    const subHeader = new SubHeader({
      pageHeader: header._id,
      title: title.trim(),
      content: content || "",
      type: type || "regular",
      order: order || 1,
      audience: audience || header.audience,
      deadline: deadline || null,
      isActive: true
    });

    await subHeader.save();

    // Notify students if needed
    if (type === "upload" && deadline) {
      const students = await SinhVien.find({ khoa: bcnProfile.khoa })
        .populate('account', 'id')
        .lean();
      
      for (const student of students) {
        if (student.account) {
          await notificationService.createNotification({
            recipient: student.account.id,
            type: "deadline",
            title: `Hạn nộp mới: ${title}`,
            message: `Hạn nộp: ${new Date(deadline).toLocaleDateString('vi-VN')}`,
            link: `/bcn-page/sub/${subHeader._id}`
          });
        }
      }
    }

    res.json({
      success: true,
      subHeader
    });
  } catch (error) {
    console.error("Create khoa sub-header error:", error);
    res.status(400).json({ error: error.message });
  }
});

// Reorder headers for khoa
router.put("/khoa/headers/reorder", authenticate, authorize(["ban-chu-nhiem"]), async (req, res) => {
  try {
    const { headerIds } = req.body;

    if (!Array.isArray(headerIds)) {
      return res.status(400).json({ error: "headerIds phải là một mảng" });
    }

    // Get BCN's khoa
    const bcnProfile = await BanChuNhiem.findOne({ account: req.account._id });
    if (!bcnProfile) {
      return res.status(404).json({ error: "Không tìm thấy thông tin ban chủ nhiệm" });
    }

    // Update order for each header
    const updatePromises = headerIds.map((id, index) =>
      PageHeader.findOneAndUpdate(
        { _id: id, khoa: bcnProfile.khoa },
        { order: index + 1 },
        { new: true }
      )
    );

    await Promise.all(updatePromises);

    res.json({
      success: true,
      message: "Đã cập nhật thứ tự header"
    });
  } catch (error) {
    console.error("Reorder khoa headers error:", error);
    res.status(400).json({ error: "Không thể thay đổi thứ tự header: " + error.message });
  }
});

// Reorder sub-headers for khoa
router.put("/khoa/headers/:headerId/subs/reorder", authenticate, authorize(["ban-chu-nhiem"]), async (req, res) => {
  try {
    const { headerId } = req.params;
    const { subHeaderIds } = req.body;

    if (!Array.isArray(subHeaderIds)) {
      return res.status(400).json({ error: "subHeaderIds phải là một mảng" });
    }

    const header = await PageHeader.findById(headerId);
    if (!header) {
      return res.status(404).json({ error: "Không tìm thấy header" });
    }

    // Verify BCN manages this khoa
    const bcnProfile = await BanChuNhiem.findOne({ account: req.account._id });
    if (!bcnProfile || bcnProfile.khoa !== header.khoa) {
      return res.status(403).json({ error: "Bạn không quản lý khoa này" });
    }

    // Update order for each sub-header
    const updatePromises = subHeaderIds.map((id, index) =>
      SubHeader.findOneAndUpdate(
        { _id: id, pageHeader: header._id },
        { order: index + 1 },
        { new: true }
      )
    );

    await Promise.all(updatePromises);

    res.json({
      success: true,
      message: "Đã cập nhật thứ tự sub-header"
    });
  } catch (error) {
    console.error("Reorder khoa sub-headers error:", error);
    res.status(400).json({ error: "Không thể thay đổi thứ tự sub-header: " + error.message });
  }
});


export default router;
