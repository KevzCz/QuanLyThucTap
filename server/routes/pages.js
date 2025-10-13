import express from 'express';
import mongoose from 'mongoose';
import { authGV, authBCN, authSV, authAll } from '../middleware/auth.js';
import PageStructure from '../models/PageStructure.js';
import GiangVien from '../models/GiangVien.js';
import InternshipSubject from '../models/InternshipSubject.js';

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
    const pageStructure = await PageStructure.findOne({
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
    let pageStructure = await PageStructure.findOne({ subjectId: subjectDoc.id });
    if (!pageStructure) {
      pageStructure = new PageStructure({
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

    const pageStructure = await PageStructure.findOne({
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

    const pageStructure = await PageStructure.findOne({
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

    const pageStructure = await PageStructure.findOne({
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

    const pageStructure = await PageStructure.findOne({
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
    const pageStructure = await PageStructure.findOne({ subjectId: subjectDoc.id });
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

    const pageStructure = await PageStructure.findOne({
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

export default router;
