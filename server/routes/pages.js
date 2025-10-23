import express from 'express';
import mongoose from 'mongoose';
import { authGV, authBCN, authSV, authAll } from '../middleware/auth.js';
import PageHeader from '../models/PageHeader.js';
import SubHeader from '../models/SubHeader.js';
import FileSubmission from '../models/FileSubmission.js';
import GiangVien from '../models/GiangVien.js';
import InternshipSubject from '../models/InternshipSubject.js';
import notificationService from '../services/notificationService.js';

const router = express.Router();

// Get teacher's managed page structure
router.get('/teacher/managed', authGV, async (req, res) => {
  try {
    // Find the teacher's profile
    const giangVien = await GiangVien.findOne({ account: req.account._id })
      .populate('account', 'name email')
      .populate('internshipSubject', 'id title');

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

    // Find the page structure for this subject
    const pageStructure = await PageHeader.findOne({
      subjectId: giangVien.internshipSubject?.id || giangVien.internshipSubject?._id
    });

    const response = {
      success: true,
      instructor: {
        id: giangVien.account.id || giangVien.account._id.toString(),
        name: giangVien.account.name,
        email: giangVien.account.email
      },
      subject: giangVien.internshipSubject ? {
        id: giangVien.internshipSubject.id || giangVien.internshipSubject._id.toString(),
        title: giangVien.internshipSubject.title,
        canManage: true
      } : null,
      headers: pageStructure?.headers || []
    };

    res.json(response);
  } catch (error) {
    console.error('Error getting teacher page structure:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Create header for teacher's page
router.post('/teacher/subjects/:subjectId/headers', authGV, async (req, res) => {
  try {
    const { subjectId } = req.params;
    const { title, order, audience } = req.body;

    // Verify teacher manages this subject
    const subjectDoc = await InternshipSubject.findOne({ id: subjectId });
    if (!subjectDoc) {
      return res.status(404).json({ success: false, error: 'Subject not found' });
    }

    const giangVien = await GiangVien.findOne({ 
      account: req.account._id,
      internshipSubject: subjectDoc._id
    });

    if (!giangVien) {
      return res.status(403).json({ success: false, error: 'You do not manage this subject' });
    }

    // Find or create page structure
    let pageStructure = await PageHeader.findOne({ subjectId: subjectDoc.id });
    if (!pageStructure) {
      pageStructure = new PageHeader({
        subjectId: subjectDoc.id,
        headers: []
      });
    }

    const newHeader = {
      _id: new mongoose.Types.ObjectId(),
      title,
      order,
      audience,
      subs: []
    };

    pageStructure.headers.push(newHeader);
    await pageStructure.save();

    res.json({
      success: true,
      header: {
        ...newHeader,
        id: newHeader._id.toString()
      }
    });

  } catch (error) {
    console.error('Error creating header:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Update header
router.put('/teacher/headers/:headerId', authGV, async (req, res) => {
  try {
    const { headerId } = req.params;
    const { title, order, audience } = req.body;

    const pageStructure = await PageHeader.findOne({
      'headers._id': headerId
    });

    if (!pageStructure) {
      return res.status(404).json({ success: false, error: 'Header not found' });
    }

    const header = pageStructure.headers.id(headerId);
    if (header) {
      header.title = title;
      header.order = order;
      header.audience = audience;
      await pageStructure.save();
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating header:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Delete header
router.delete('/teacher/headers/:headerId', authGV, async (req, res) => {
  try {
    const { headerId } = req.params;

    const pageStructure = await PageHeader.findOne({
      'headers._id': headerId
    });

    if (!pageStructure) {
      return res.status(404).json({ success: false, error: 'Header not found' });
    }

    pageStructure.headers.id(headerId).remove();
    await pageStructure.save();

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting header:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Create sub-header
router.post('/teacher/headers/:headerId/subs', authGV, async (req, res) => {
  try {
    const { headerId } = req.params;
    const { title, content, order, kind, audience, startAt, endAt, fileUrl, fileName } = req.body;

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

    const newSub = {
      _id: new mongoose.Types.ObjectId(),
      title,
      content,
      order,
      kind,
      audience,
      startAt,
      endAt,
      fileUrl,
      fileName
    };

    header.subs.push(newSub);
    await pageStructure.save();

    res.json({
      success: true,
      ...newSub,
      id: newSub._id.toString()
    });
  } catch (error) {
    console.error('Error creating sub-header:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
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

// Reorder headers
router.put('/teacher/subjects/:subjectId/headers/reorder', authGV, async (req, res) => {
  try {
    const { subjectId } = req.params;
    const { headerIds } = req.body;

    if (!Array.isArray(headerIds)) {
      return res.status(400).json({ success: false, error: 'headerIds must be an array' });
    }

    // Verify teacher manages this subject
    const subjectDoc = await InternshipSubject.findOne({ id: subjectId });
    if (!subjectDoc) {
      return res.status(404).json({ success: false, error: 'Subject not found' });
    }

    const giangVien = await GiangVien.findOne({ 
      account: req.account._id,
      internshipSubject: subjectDoc._id
    });

    if (!giangVien) {
      return res.status(403).json({ success: false, error: 'You do not manage this subject' });
    }

    // Find the page structure and update header orders
    const pageStructure = await PageHeader.findOne({ subjectId: subjectDoc.id });
    if (!pageStructure) {
      return res.status(404).json({ success: false, error: 'Page structure not found' });
    }

    // Use timestamp-based temporary orders to avoid conflicts
    const tempOrderBase = Date.now();
    
    // First, set all headers to unique temporary orders
    headerIds.forEach((headerId, index) => {
      const header = pageStructure.headers.id(headerId);
      if (header) {
        header.order = tempOrderBase + index;
      }
    });

    // Then update to final positive orders
    headerIds.forEach((headerId, index) => {
      const header = pageStructure.headers.id(headerId);
      if (header) {
        header.order = index + 1;
      }
    });

    // Sort headers by new order before saving
    pageStructure.headers.sort((a, b) => a.order - b.order);

    await pageStructure.save();

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

    // Use timestamp-based temporary orders to avoid conflicts
    const tempOrderBase = Date.now();
    
    // First, set all sub-headers to unique temporary orders
    subHeaderIds.forEach((subId, index) => {
      const sub = header.subs.id(subId);
      if (sub) {
        sub.order = tempOrderBase + index;
      }
    });

    // Then update to final positive orders
    subHeaderIds.forEach((subId, index) => {
      const sub = header.subs.id(subId);
      if (sub) {
        sub.order = index + 1;
      }
    });

    // Sort subs by new order before saving
    header.subs.sort((a, b) => a.order - b.order);

    await pageStructure.save();

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
          path: 'internshipSubject instructor',
          select: 'id title name'
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
      subject: {
        id: subHeader.pageHeader.internshipSubject.id,
        title: subHeader.pageHeader.internshipSubject.title
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

export default router;
