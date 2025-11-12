import express from 'express';
import mongoose from 'mongoose';
import { authenticate, authGV, authBCN, authSV } from '../middleware/auth.js';
import PageHeader from '../models/PageHeader.js';
import SubHeader from '../models/SubHeader.js';
import FileSubmission from '../models/FileSubmission.js';
import GiangVien from '../models/GiangVien.js';
import SinhVien from '../models/SinhVien.js';
import Account from '../models/Account.js';
import BanChuNhiem from '../models/BanChuNhiem.js';
import notificationService from '../services/notificationService.js';

const router = express.Router();

// Get teacher's managed page structure (instructor-based)
router.get('/teacher/managed', authGV, async (req, res) => {
  try {
    // Find the teacher's profile
    const giangVien = await GiangVien.findOne({ account: req.account._id }).lean();

    if (!giangVien) {
      return res.json({
        success: true,
        instructor: {
          id: req.account.id || req.account._id.toString(),
          name: req.account.name,
          email: req.account.email
        },
        subject: null,
        headers: []
      });
    }

    // Find all page headers for this teacher (pageType: "teacher", instructor: giangVien._id)
    const pageHeaders = await PageHeader.find({
      pageType: 'teacher',
      instructor: giangVien._id,
      isActive: true
    })
      .sort({ order: 1 })
      .lean();

    // Get sub-headers for each page header
    const headerIds = pageHeaders.map(h => h._id);
    const subHeaders = await SubHeader.find({
      pageHeader: { $in: headerIds },
      isActive: true
    })
      .sort({ order: 1 })
      .lean();

    // Group sub-headers by header
    const headersWithSubs = pageHeaders.map(header => ({
      ...header,
      subs: subHeaders.filter(sub => sub.pageHeader.toString() === header._id.toString())
    }));

    const response = {
      success: true,
      instructor: {
        id: req.account.id || req.account._id.toString(),
        name: req.account.name,
        email: req.account.email,
        khoa: giangVien.khoa
      },
      subject: {
        id: giangVien.khoa,
        title: `Khoa ${giangVien.khoa}`,
        canManage: true
      },
      headers: headersWithSubs || []
    };

    res.json(response);
  } catch (error) {
    console.error('Error getting teacher page structure:', error);
    res.status(500).json({ success: false, error: 'Lỗi server' });
  }
});

// Create header for teacher's page
router.post('/teacher/headers', authGV, async (req, res) => {
  try {
    const { title, order, audience } = req.body;

    // Validate title
    if (!title || title.length < 2 || title.length > 200) {
      return res.status(400).json({ success: false, error: 'Tiêu đề phải từ 2 đến 200 ký tự' });
    }

    // Validate order
    if (order === undefined || !Number.isInteger(Number(order)) || Number(order) < 0) {
      return res.status(400).json({ success: false, error: 'Thứ tự phải là số nguyên không âm' });
    }

    // Validate audience
    const validAudiences = ['tat-ca', 'sinh-vien', 'giang-vien'];
    if (!audience || !validAudiences.includes(audience)) {
      return res.status(400).json({ success: false, error: 'Đối tượng không hợp lệ' });
    }

    // Find the teacher's profile
    const giangVien = await GiangVien.findOne({ account: req.account._id }).lean();
    if (!giangVien) {
      return res.status(403).json({ success: false, error: 'Không tìm thấy thông tin giảng viên' });
    }

    // Create new page header for this teacher
    const newHeader = new PageHeader({
      instructor: giangVien._id,
      pageType: 'teacher',
      title,
      order: Number(order),
      audience,
      isActive: true
    });

    await newHeader.save();

    res.json({
      success: true,
      header: {
        _id: newHeader._id,
        id: newHeader._id.toString(),
        title: newHeader.title,
        order: newHeader.order,
        audience: newHeader.audience,
        pageType: newHeader.pageType
      }
    });

  } catch (error) {
    console.error('Error creating header:', error);
    res.status(500).json({ success: false, error: 'Lỗi server' });
  }
});

// Update header
router.put('/teacher/headers/:headerId', authGV, async (req, res) => {
  try {
    const { headerId } = req.params;
    const { title, order, audience } = req.body;

    // Validate title if provided
    if (title && (title.length < 2 || title.length > 200)) {
      return res.status(400).json({ success: false, error: 'Tiêu đề phải từ 2 đến 200 ký tự' });
    }

    // Validate order if provided
    if (order !== undefined && (!Number.isInteger(Number(order)) || Number(order) < 0)) {
      return res.status(400).json({ success: false, error: 'Thứ tự phải là số nguyên không âm' });
    }

    // Validate audience if provided
    const validAudiences = ['tat-ca', 'sinh-vien', 'giang-vien'];
    if (audience && !validAudiences.includes(audience)) {
      return res.status(400).json({ success: false, error: 'Đối tượng không hợp lệ' });
    }

    // Find the teacher's profile
    const giangVien = await GiangVien.findOne({ account: req.account._id }).lean();
    if (!giangVien) {
      return res.status(403).json({ success: false, error: 'Không tìm thấy thông tin giảng viên' });
    }

    // Find and update the header
    const header = await PageHeader.findOne({
      _id: headerId,
      instructor: giangVien._id,
      pageType: 'teacher'
    });

    if (!header) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy header hoặc bạn không có quyền chỉnh sửa' });
    }

    if (title) header.title = title;
    if (order !== undefined) header.order = Number(order);
    if (audience) header.audience = audience;
    
    await header.save();

    res.json({ success: true, header });
  } catch (error) {
    console.error('Error updating header:', error);
    res.status(500).json({ success: false, error: 'Lỗi server' });
  }
});

// Delete header
router.delete('/teacher/headers/:headerId', authGV, async (req, res) => {
  try {
    const { headerId } = req.params;

    // Find the teacher's profile
    const giangVien = await GiangVien.findOne({ account: req.account._id }).lean();
    if (!giangVien) {
      return res.status(403).json({ success: false, error: 'Không tìm thấy thông tin giảng viên' });
    }

    // Find and delete the header
    const result = await PageHeader.findOneAndDelete({
      _id: headerId,
      instructor: giangVien._id,
      pageType: 'teacher'
    });

    if (!result) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy header hoặc bạn không có quyền xóa' });
    }

    // Also delete all sub-headers
    await SubHeader.deleteMany({ pageHeader: headerId });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting header:', error);
    res.status(500).json({ success: false, error: 'Lỗi server' });
  }
});

// Create sub-header
router.post('/teacher/headers/:headerId/subs', authGV, async (req, res) => {
  try {
    const { headerId } = req.params;
    const { title, content, order, kind, audience, startAt, endAt, fileUrl, fileName } = req.body;

    // Validate title
    if (!title || title.length < 2 || title.length > 200) {
      return res.status(400).json({ success: false, error: 'Tiêu đề phải từ 2 đến 200 ký tự' });
    }

    // Validate order
    if (order === undefined || !Number.isInteger(Number(order)) || Number(order) < 0) {
      return res.status(400).json({ success: false, error: 'Thứ tự phải là số nguyên không âm' });
    }

    // Validate kind
    const validKinds = ['thuong', 'thong-bao', 'nop-file', 'van-ban', 'file'];
    if (!kind || !validKinds.includes(kind)) {
      return res.status(400).json({ success: false, error: 'Loại nội dung không hợp lệ' });
    }

    // Validate audience
    const validAudiences = ['tat-ca', 'sinh-vien', 'giang-vien'];
    if (!audience || !validAudiences.includes(audience)) {
      return res.status(400).json({ success: false, error: 'Đối tượng không hợp lệ' });
    }

    // Validate dates for nop-file kind
    if (kind === 'nop-file') {
      if (startAt && endAt && new Date(startAt) >= new Date(endAt)) {
        return res.status(400).json({ success: false, error: 'Ngày kết thúc phải sau ngày bắt đầu' });
      }
    }

    const header = await PageHeader.findById(headerId);

    if (!header) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy header' });
    }

    // Verify teacher owns this header
    const giangVien = await GiangVien.findOne({ account: req.account._id });
    if (!giangVien || header.instructor?.toString() !== giangVien._id.toString()) {
      return res.status(403).json({ success: false, error: 'You do not own this header' });
    }

    const newSub = new SubHeader({
      pageHeader: header._id,
      title,
      content,
      order: Number(order),
      kind,
      audience,
      startAt: startAt ? new Date(startAt) : null,
      endAt: endAt ? new Date(endAt) : null,
      fileUrl,
      fileName,
      isActive: true
    });

    await newSub.save();

    res.json({
      success: true,
      subHeader: newSub
    });
  } catch (error) {
    console.error('Error creating sub-header:', error);
    res.status(500).json({ success: false, error: 'Lỗi server' });
  }
});

// Delete sub-header
router.delete('/teacher/headers/:headerId/subs/:subId', authGV, async (req, res) => {
  try {
    const { headerId, subId } = req.params;

    const pageStructure = await PageHeader.findOne({
      'headers._id': headerId
    });

    if (!pageStructure) {
      return res.status(404).json({ success: false, error: 'Header not found' });
    }

    const header = pageStructure.headers.id(headerId);
    if (!header) {
      return res.status(404).json({ success: false, error: 'Header not found' });
    }

    header.subs.id(subId).remove();
    await pageStructure.save();

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting sub-header:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Reorder teacher headers
router.put('/teacher/headers/reorder', authGV, async (req, res) => {
  try {
    const { headerIds } = req.body;

    if (!Array.isArray(headerIds)) {
      return res.status(400).json({ success: false, error: 'headerIds must be an array' });
    }

    // Find the teacher's profile
    const giangVien = await GiangVien.findOne({ account: req.account._id });
    if (!giangVien) {
      return res.status(403).json({ success: false, error: 'Teacher profile not found' });
    }

    // Use timestamp-based temporary orders to avoid conflicts
    const tempOrderBase = Date.now();
    
    // First, set all headers to unique temporary orders
    for (let i = 0; i < headerIds.length; i++) {
      await PageHeader.updateOne(
        { _id: headerIds[i], instructor: giangVien._id, pageType: 'teacher' },
        { order: tempOrderBase + i }
      );
    }

    // Then update to final positive orders
    for (let i = 0; i < headerIds.length; i++) {
      await PageHeader.updateOne(
        { _id: headerIds[i], instructor: giangVien._id, pageType: 'teacher' },
        { order: i + 1 }
      );
    }

    res.json({ success: true, message: 'Headers reordered successfully' });
  } catch (error) {
    console.error('Error reordering headers:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Reorder sub-headers within a header
router.put('/teacher/headers/:headerId/subs/reorder', authGV, async (req, res) => {
  try {
    const { headerId } = req.params;
    const { subHeaderIds } = req.body;

    if (!Array.isArray(subHeaderIds)) {
      return res.status(400).json({ success: false, error: 'subHeaderIds must be an array' });
    }

    const header = await PageHeader.findById(headerId);
    if (!header) {
      return res.status(404).json({ success: false, error: 'Header not found' });
    }

    // Verify teacher owns this header
    const giangVien = await GiangVien.findOne({ account: req.account._id });
    if (!giangVien || header.instructor?.toString() !== giangVien._id.toString()) {
      return res.status(403).json({ success: false, error: 'You do not own this header' });
    }

    // Use timestamp-based temporary orders to avoid conflicts
    const tempOrderBase = Date.now();
    
    // First, set all sub-headers to unique temporary orders
    for (let i = 0; i < subHeaderIds.length; i++) {
      await SubHeader.updateOne(
        { _id: subHeaderIds[i], pageHeader: header._id },
        { order: tempOrderBase + i }
      );
    }

    // Then update to final positive orders
    for (let i = 0; i < subHeaderIds.length; i++) {
      await SubHeader.updateOne(
        { _id: subHeaderIds[i], pageHeader: header._id },
        { order: i + 1 }
      );
    }

    res.json({ success: true, message: 'Sub-headers reordered successfully' });
  } catch (error) {
    console.error('Error reordering sub-headers:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Get single teacher sub-header - Updated to use correct models
router.get('/teacher/subs/:subId', authGV, async (req, res) => {
  try {
    const { subId } = req.params;

    // Find the sub-header and verify it belongs to the teacher
    const subHeader = await SubHeader.findById(subId)
      .populate({
        path: 'pageHeader',
        populate: { 
          path: 'instructor',
          select: 'name khoa'
        }
      });

    if (!subHeader) {
      return res.status(404).json({ success: false, error: 'Sub-header not found' });
    }

    // Verify this is a teacher page and belongs to the current lecturer
    if (subHeader.pageHeader.pageType !== "teacher") {
      return res.status(403).json({ success: false, error: 'Cannot access department page content' });
    }

    const lecturerProfile = await GiangVien.findOne({ 
      account: req.account._id,
      _id: subHeader.pageHeader.instructor._id
    });

    if (!lecturerProfile) {
      return res.status(403).json({ success: false, error: 'You do not have permission to access this sub-header' });
    }

    res.json({
      success: true,
      subHeader: {
        _id: subHeader._id,
        id: subHeader._id.toString(),
        title: subHeader.title,
        content: subHeader.content || '',
        order: subHeader.order,
        kind: subHeader.kind,
        audience: subHeader.audience,
        startAt: subHeader.startAt,
        endAt: subHeader.endAt,
        fileUrl: subHeader.fileUrl,
        fileName: subHeader.fileName,
        isActive: subHeader.isActive
      },
      canEdit: true, // Teachers can edit their own content
      khoa: {
        name: subHeader.pageHeader.khoa || subHeader.pageHeader.instructor?.khoa,
        title: `Khoa ${subHeader.pageHeader.khoa || subHeader.pageHeader.instructor?.khoa}`
      }
    });

  } catch (error) {
    console.error('Error getting teacher sub-header:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Update teacher sub-header - Updated to use correct models
router.put('/teacher/subs/:subId', authGV, async (req, res) => {
  try {
    const { subId } = req.params;
    const { title, content, order, audience, startAt, endAt, fileUrl, fileName } = req.body;

    const subHeader = await SubHeader.findById(subId)
      .populate({
        path: 'pageHeader',
        populate: { path: 'instructor' }
      });

    if (!subHeader) {
      return res.status(404).json({ success: false, error: 'Sub-header not found' });
    }

    // Verify this is a teacher page and belongs to the current lecturer
    if (subHeader.pageHeader.pageType !== "teacher") {
      return res.status(403).json({ success: false, error: 'Cannot edit department page content' });
    }

    const lecturerProfile = await GiangVien.findOne({ 
      account: req.account._id,
      _id: subHeader.pageHeader.instructor._id
    });

    if (!lecturerProfile) {
      return res.status(403).json({ success: false, error: 'You do not have permission to edit this sub-header' });
    }

    // Update fields
    if (title !== undefined) subHeader.title = title;
    if (content !== undefined) subHeader.content = content;
    if (order !== undefined) subHeader.order = order;
    if (audience !== undefined) subHeader.audience = audience;
    if (startAt !== undefined) subHeader.startAt = startAt ? new Date(startAt) : null;
    if (endAt !== undefined) subHeader.endAt = endAt ? new Date(endAt) : null;
    if (fileUrl !== undefined) subHeader.fileUrl = fileUrl;
    if (fileName !== undefined) subHeader.fileName = fileName;

    await subHeader.save();

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating teacher sub-header:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Delete teacher sub-header - Updated to use correct models
router.delete('/teacher/subs/:subId', authGV, async (req, res) => {
  try {
    const { subId } = req.params;

    const subHeader = await SubHeader.findById(subId)
      .populate({
        path: 'pageHeader',
        populate: { path: 'instructor' }
      });

    if (!subHeader) {
      return res.status(404).json({ success: false, error: 'Sub-header not found' });
    }

    // Verify this is a teacher page and belongs to the current lecturer
    if (subHeader.pageHeader.pageType !== "teacher") {
      return res.status(403).json({ success: false, error: 'Cannot delete department page content' });
    }

    const lecturerProfile = await GiangVien.findOne({ 
      account: req.account._id,
      _id: subHeader.pageHeader.instructor._id
    });

    if (!lecturerProfile) {
      return res.status(403).json({ success: false, error: 'You do not have permission to delete this sub-header' });
    }

    // Soft delete
    subHeader.isActive = false;
    await subHeader.save();

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting teacher sub-header:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Get submissions for any user (students, teachers, BCN)
router.get('/subs/:subId/submissions', authenticate, async (req, res) => {
  try {
    const { subId } = req.params;

    // Verify the sub-header exists
    const subHeader = await SubHeader.findById(subId)
      .populate({
        path: 'pageHeader',
        populate: { path: 'instructor', select: 'account' }
      });

    if (!subHeader) {
      return res.status(404).json({ success: false, error: 'Sub-header not found' });
    }

    if (subHeader.kind !== "nop-file") {
      return res.status(400).json({ success: false, error: 'This sub-header is not a file submission type' });
    }

    let query = { subHeader: subId };
    let canReview = false;

    // Filter based on role
    if (req.account.role === 'sinh-vien') {
      // Students can only see their own submissions
      query.submitter = req.account._id;
    } else if (req.account.role === 'giang-vien') {
      // Teachers can see submissions based on page type
      if (subHeader.pageHeader.pageType === 'teacher') {
        // On teacher pages, they can see all submissions if it's their page
        const lecturerProfile = await GiangVien.findOne({ 
          account: req.account._id 
        });
        
        if (lecturerProfile && subHeader.pageHeader.instructor && 
            lecturerProfile._id.toString() === subHeader.pageHeader.instructor._id.toString()) {
          canReview = true;
          // No query filter - see all submissions
        } else {
          return res.status(403).json({ success: false, error: 'You do not have permission to view these submissions' });
        }
      } else if (subHeader.pageHeader.pageType === 'khoa') {
        // On khoa pages, teachers can only see their own submissions
        query.submitter = req.account._id;
        canReview = false;
      } else {
        return res.status(403).json({ success: false, error: 'Unknown page type' });
      }
    } else if (req.account.role === 'ban-chu-nhiem') {
      // BCN can see all submissions in their khoa (both khoa and teacher pages)
      const bcnProfile = await BanChuNhiem.findOne({ 
        account: req.account._id 
      });
      
      if (!bcnProfile) {
        return res.status(403).json({ success: false, error: 'BCN profile not found' });
      }

      // Check if this submission belongs to BCN's khoa
      if (subHeader.pageHeader.pageType === 'khoa') {
        // For khoa pages, check if khoa matches
        if (subHeader.pageHeader.khoa === bcnProfile.khoa) {
          canReview = true;
        } else {
          return res.status(403).json({ success: false, error: 'You do not have permission to view submissions from other departments' });
        }
      } else if (subHeader.pageHeader.pageType === 'teacher') {
        // For teacher pages, check if instructor belongs to BCN's khoa
        const instructorProfile = await GiangVien.findById(subHeader.pageHeader.instructor);
        if (instructorProfile && instructorProfile.khoa === bcnProfile.khoa) {
          canReview = true;
        } else {
          return res.status(403).json({ success: false, error: 'You do not have permission to view submissions from teachers in other departments' });
        }
      } else {
        return res.status(403).json({ success: false, error: 'Unknown page type' });
      }
    } else if (req.account.role === 'phong-dao-tao') {
      // PDT can see all submissions
      canReview = true;
    }

    const submissions = await FileSubmission.find(query)
      .populate('submitter', 'id name email')
      .populate('reviewedBy', 'id name email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      submissions,
      canReview
    });
  } catch (error) {
    console.error('Error getting submissions:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Submit a file to a sub-header (students, teachers)
router.post('/subs/:subId/submissions', authenticate, async (req, res) => {
  try {
    const { subId } = req.params;
    const { fileUrl, fileName, fileSize } = req.body;

    if (!fileUrl || !fileName || !fileSize) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    // Verify the sub-header exists
    const subHeader = await SubHeader.findById(subId)
      .populate('pageHeader');

    if (!subHeader) {
      return res.status(404).json({ success: false, error: 'Sub-header not found' });
    }

    if (subHeader.kind !== "nop-file") {
      return res.status(400).json({ success: false, error: 'This sub-header is not a file submission type' });
    }

    // Create the submission
    const submission = new FileSubmission({
      subHeader: subId,
      submitter: req.account._id,
      fileName,
      fileUrl,
      fileSize,
      status: 'submitted'
    });

    await submission.save();
    await submission.populate('submitter', 'id name email');

    // Notify relevant parties based on page type
    try {
      const io = req.app.get('io');
      
      if (subHeader.pageHeader.pageType === 'teacher' && subHeader.pageHeader.instructor) {
        // Notify teacher about student submission
        const lecturerProfile = await GiangVien.findById(subHeader.pageHeader.instructor);
        if (lecturerProfile) {
          await notificationService.createNotification({
            recipient: lecturerProfile.account,
            sender: req.account._id,
            type: 'file-submitted',
            title: 'Bài nộp mới từ sinh viên',
            message: `${req.account.name} đã nộp file "${fileName}"`,
            link: `/gv/teacher-page`,
            priority: 'normal',
            metadata: { 
              submissionId: submission._id.toString(),
              subHeaderId: subId
            }
          }, io);
        }
      } else if (subHeader.pageHeader.pageType === 'khoa') {
        // Notify BCN about submission on khoa pages
        // Find the BCN for this khoa and notify them
        const bcnProfile = await BanChuNhiem.findOne({ khoa: subHeader.pageHeader.khoa });
        if (bcnProfile) {
          await notificationService.createNotification({
            recipient: bcnProfile.account,
            sender: req.account._id,
            type: 'file-submitted',
            title: 'Bài nộp mới trên trang khoa',
            message: `${req.account.name} đã nộp file "${fileName}"`,
            link: `/bcn-page`,
            priority: 'normal',
            metadata: { 
              submissionId: submission._id.toString(),
              subHeaderId: subId
            }
          }, io);
        }
      }
    } catch (notifError) {
      console.error('Error sending submission notification:', notifError);
    }

    res.status(201).json({
      success: true,
      submission
    });
  } catch (error) {
    console.error('Error submitting file:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Get teacher submissions - Updated to use correct models
router.get('/teacher/subs/:subId/submissions', authGV, async (req, res) => {
  try {
    const { subId } = req.params;

    // Verify the sub-header exists and belongs to the teacher
    const subHeader = await SubHeader.findById(subId)
      .populate({
        path: 'pageHeader',
        populate: { path: 'instructor' }
      });

    if (!subHeader) {
      return res.status(404).json({ success: false, error: 'Sub-header not found' });
    }

    if (subHeader.kind !== "nop-file") {
      return res.status(400).json({ success: false, error: 'This sub-header is not a file submission type' });
    }

    // Verify this is a teacher page and belongs to the current lecturer
    if (subHeader.pageHeader.pageType !== "teacher") {
      return res.status(403).json({ success: false, error: 'Cannot access department submissions' });
    }

    const lecturerProfile = await GiangVien.findOne({ 
      account: req.account._id,
      _id: subHeader.pageHeader.instructor._id
    });

    if (!lecturerProfile) {
      return res.status(403).json({ success: false, error: 'You do not have permission to view these submissions' });
    }

    const submissions = await FileSubmission.find({ subHeader: subId })
      .populate('submitter', 'id name email')
      .populate('reviewedBy', 'id name email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      submissions,
      canReview: true // Teachers can always review their students' submissions
    });
  } catch (error) {
    console.error('Error getting teacher submissions:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Update teacher submission status - Updated to use correct models
router.put('/teacher/submissions/:submissionId', authGV, async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { status, reviewNote } = req.body;

    const submission = await FileSubmission.findById(submissionId)
      .populate({
        path: 'subHeader',
        populate: {
          path: 'pageHeader',
          populate: { path: 'instructor' }
        }
      });

    if (!submission) {
      return res.status(404).json({ success: false, error: 'Submission not found' });
    }

    // Verify this is a teacher page and belongs to the current lecturer
    if (submission.subHeader.pageHeader.pageType !== "teacher") {
      return res.status(403).json({ success: false, error: 'Cannot review department submissions' });
    }

    const lecturerProfile = await GiangVien.findOne({ 
      account: req.account._id,
      _id: submission.subHeader.pageHeader.instructor._id
    });

    if (!lecturerProfile) {
      return res.status(403).json({ success: false, error: 'You do not have permission to review this submission' });
    }

    if (status !== undefined) submission.status = status;
    if (reviewNote !== undefined) submission.reviewNote = reviewNote;
    
    if (status && status !== 'submitted') {
      submission.reviewedBy = req.account._id;
      submission.reviewedAt = new Date();
    }

    await submission.save();

    const populatedSubmission = await submission.populate('submitter', 'id name email').populate('reviewedBy', 'id name email');

    // Notify student about submission review by teacher
    try {
      const io = req.app.get('io');
      if (status && status !== 'submitted') {
        await notificationService.createNotification({
          recipient: submission.submitter._id,
          sender: req.account._id,
          type: 'file-submitted',
          title: 'Bài nộp đã được giảng viên xem xét',
          message: `Giảng viên ${req.account.name} đã ${status === 'accepted' ? 'chấp nhận' : status === 'rejected' ? 'từ chối' : 'xem xét'} bài nộp "${submission.fileName}"${reviewNote ? ': ' + reviewNote : ''}`,
          link: `/teacher-page/${lecturerProfile._id}`,
          priority: 'normal',
          metadata: { 
            submissionId: submission._id.toString(),
            subHeaderId: submission.subHeader._id.toString(),
            instructorId: lecturerProfile._id.toString()
          }
        }, io);
      }
    } catch (notifError) {
      console.error('Error sending teacher submission review notification:', notifError);
    }

    res.json({
      success: true,
      submission: populatedSubmission
    });
  } catch (error) {
    console.error('Error updating teacher submission status:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Get page structure for teacher (instructor-based) or khoa (department-based)
// This endpoint returns either teacher pages or khoa pages depending on context
router.get('/khoa', authenticate, async (req, res) => {
  try {
    const { khoa, audience } = req.query;

    // If khoa query param is provided, return khoa-based pages (BCN-created department pages)
    if (khoa) {
      // Get the user's khoa to verify access
      let userKhoa = null;
      
      if (req.account.role === 'giang-vien') {
        const giangVien = await GiangVien.findOne({ account: req.account._id }).lean();
        userKhoa = giangVien?.khoa;
      } else if (req.account.role === 'sinh-vien') {
        const SinhVien = (await import('../models/SinhVien.js')).default;
        const student = await SinhVien.findOne({ account: req.account._id }).lean();
        userKhoa = student?.khoa;
      }

      // Verify user belongs to the requested khoa
      if (userKhoa !== khoa) {
        return res.status(403).json({ 
          success: false, 
          error: 'Bạn không có quyền xem trang của khoa này' 
        });
      }

      // Get khoa-based page headers (created by BCN)
      const pageHeaders = await PageHeader.find({
        khoa: khoa,
        pageType: 'khoa',
        isActive: true
      })
        .sort({ order: 1 })
        .lean();

      // Get sub-headers for each page header
      const headerIds = pageHeaders.map(h => h._id);
      const subHeaders = await SubHeader.find({
        pageHeader: { $in: headerIds },
        isActive: true
      })
        .sort({ order: 1 })
        .lean();

      // Group sub-headers by header
      const headersWithSubs = pageHeaders.map(header => ({
        ...header,
        subs: subHeaders.filter(sub => sub.pageHeader.toString() === header._id.toString())
      }));

      return res.json({
        success: true,
        khoa: {
          name: khoa,
          canManage: false
        },
        headers: headersWithSubs || []
      });
    }

    // Otherwise, return teacher-based pages (for teacher/student viewing their supervisor's pages)
    // For teachers viewing their own pages
    if (req.account.role === 'giang-vien') {
      const giangVien = await GiangVien.findOne({ account: req.account._id }).lean();
      if (!giangVien) {
        return res.json({
          success: true,
          instructor: { name: req.account.name },
          headers: []
        });
      }

      // Get all page headers for this teacher
      const pageHeaders = await PageHeader.find({
        pageType: 'teacher',
        instructor: giangVien._id,
        isActive: true
      })
        .sort({ order: 1 })
        .lean();

      // Get sub-headers for each page header
      const headerIds = pageHeaders.map(h => h._id);
      const subHeaders = await SubHeader.find({
        pageHeader: { $in: headerIds },
        isActive: true
      })
        .sort({ order: 1 })
        .lean();

      // Group sub-headers by header
      const headersWithSubs = pageHeaders.map(header => ({
        ...header,
        subs: subHeaders.filter(sub => sub.pageHeader.toString() === header._id.toString())
      }));

      return res.json({
        success: true,
        instructor: { 
          id: giangVien._id,
          name: req.account.name,
          khoa: giangVien.khoa,
          canManage: true 
        },
        headers: headersWithSubs || []
      });
    } 
    
    // For students viewing their supervisor's pages
    else if (req.account.role === 'sinh-vien') {
      const SinhVien = (await import('../models/SinhVien.js')).default;
      const student = await SinhVien.findOne({ account: req.account._id })
        .populate('supervisor', 'id name email')
        .lean();

      if (!student || !student.supervisor) {
        return res.json({
          success: true,
          message: 'Bạn chưa được phân công giảng viên hướng dẫn',
          headers: []
        });
      }

      const lecturerProfile = await GiangVien.findOne({ account: student.supervisor._id }).lean();
      if (!lecturerProfile) {
        return res.json({
          success: true,
          headers: []
        });
      }

      // Get page headers from student's supervisor
      const pageHeaders = await PageHeader.find({
        pageType: 'teacher',
        instructor: lecturerProfile._id,
        isActive: true
      })
        .sort({ order: 1 })
        .lean();

      // Get sub-headers for each page header
      const headerIds = pageHeaders.map(h => h._id);
      const subHeaders = await SubHeader.find({
        pageHeader: { $in: headerIds },
        isActive: true
      })
        .sort({ order: 1 })
        .lean();

      // Group sub-headers by header
      const headersWithSubs = pageHeaders.map(header => ({
        ...header,
        subs: subHeaders.filter(sub => sub.pageHeader.toString() === header._id.toString())
      }));

      return res.json({
        success: true,
        instructor: {
          id: lecturerProfile._id,
          name: student.supervisor.name,
          khoa: lecturerProfile.khoa,
          canManage: false
        },
        headers: headersWithSubs || []
      });
    }

    // For other roles, return empty
    return res.json({
      success: true,
      headers: []
    });

  } catch (error) {
    console.error('Error getting page structure:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Get deadlines for file submissions
router.get("/deadlines/:audience", authenticate, async (req, res) => {
  try {
    const { audience } = req.params;
    
    if (!["sinh-vien", "giang-vien"].includes(audience)) {
      return res.status(400).json({ error: "Invalid audience parameter" });
    }

    let userKhoa = null;

    // Get the user's khoa based on their role
    if (req.account.role === "giang-vien") {
      const lecturerProfile = await GiangVien.findOne({ account: req.account._id }).lean();
      if (lecturerProfile) {
        userKhoa = lecturerProfile.khoa;
      }
    } else if (req.account.role === "sinh-vien") {
      const studentProfile = await SinhVien.findOne({ account: req.account._id }).lean();
      if (studentProfile) {
        userKhoa = studentProfile.khoa;
      }
    }

    if (!userKhoa) {
      return res.json({
        success: true,
        deadlines: []
      });
    }

    // Get all page headers for this khoa (both department pages and teacher pages)
    const headers = await PageHeader.find({
      $or: [
        { pageType: 'khoa', khoa: userKhoa, isActive: true },
        { pageType: 'teacher', isActive: true }
      ]
    }).select('_id');

    const headerIds = headers.map(h => h._id);

    // Find all nop-file subheaders with matching audience and endAt deadline
    const subHeaders = await SubHeader.find({
      pageHeader: { $in: headerIds },
      kind: "nop-file",
      audience: { $in: [audience, "tat-ca"] },
      endAt: { $ne: null },
      isActive: true
    })
    .select('title endAt audience')
    .sort({ endAt: 1 })
    .lean();

    // Transform to deadline format
    const deadlines = subHeaders.map(sub => ({
      id: sub._id.toString(),
      title: sub.title,
      dueDate: sub.endAt,
      type: "submission",
      status: new Date() > new Date(sub.endAt) ? "overdue" : "pending"
    }));

    res.json({
      success: true,
      deadlines
    });
  } catch (error) {
    console.error('Error getting deadlines:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Get teacher-specific page structure for viewing (public access for students)
router.get('/teacher/:instructorId/view', authenticate, async (req, res) => {
  try {
    console.log('=== TEACHER PAGE VIEW ROUTE HIT ===');
    const { instructorId } = req.params;

    console.log('Teacher page view request:', { instructorId });

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
    const lecturerProfile = await GiangVien.findOne({ account: instructor._id }).lean();

    console.log('Lecturer profile:', lecturerProfile ? 'found' : 'not found');

    if (!lecturerProfile) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy hồ sơ giảng viên'
      });
    }

    // Get page structure for this teacher (pageType: 'teacher', instructor-based)
    const headers = await PageHeader.find({
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
        id: lecturerProfile.khoa,
        title: `Khoa ${lecturerProfile.khoa}`
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

export default router;
