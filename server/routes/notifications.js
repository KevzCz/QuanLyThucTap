import express from "express";
import Notification from "../models/Notification.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

// Get all notifications for current user
router.get("/", authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, isRead, type } = req.query;
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(50, Math.max(1, Number(limit)));

    // Build query
    const query = { recipient: req.account._id };
    if (isRead !== undefined) {
      query.isRead = isRead === 'true';
    }
    if (type && type !== 'all') {
      query.type = type;
    }

    const [notifications, total] = await Promise.all([
      Notification.find(query)
        .populate('sender', 'id name email role')
        .sort({ createdAt: -1 })
        .limit(limitNum)
        .skip((pageNum - 1) * limitNum)
        .lean(),
      Notification.countDocuments(query)
    ]);

    res.json({
      success: true,
      notifications,
      pagination: {
        page: pageNum,
        pages: Math.ceil(total / limitNum),
        total
      }
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Lỗi khi tải thông báo' 
    });
  }
});

// Get unread count
router.get("/unread-count", authenticate, async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      recipient: req.account._id,
      isRead: false
    });

    res.json({
      success: true,
      count
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Lỗi khi tải số lượng thông báo' 
    });
  }
});

// Mark notification as read
router.put("/:id/read", authenticate, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { 
        _id: req.params.id,
        recipient: req.account._id 
      },
      { 
        isRead: true,
        readAt: new Date()
      },
      { new: true }
    ).populate('sender', 'id name email role');

    if (!notification) {
      return res.status(404).json({ 
        success: false, 
        error: 'Không tìm thấy thông báo' 
      });
    }

    res.json({
      success: true,
      notification
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Lỗi khi đánh dấu đã đọc' 
    });
  }
});

// Mark all notifications as read
router.put("/read-all", authenticate, async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { 
        recipient: req.account._id,
        isRead: false 
      },
      { 
        isRead: true,
        readAt: new Date()
      }
    );

    res.json({
      success: true,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Lỗi khi đánh dấu tất cả đã đọc' 
    });
  }
});

// Delete notification
router.delete("/:id", authenticate, async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      recipient: req.account._id
    });

    if (!notification) {
      return res.status(404).json({ 
        success: false, 
        error: 'Không tìm thấy thông báo' 
      });
    }

    res.json({
      success: true,
      message: 'Đã xóa thông báo'
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Lỗi khi xóa thông báo' 
    });
  }
});

// Delete all read notifications
router.delete("/", authenticate, async (req, res) => {
  try {
    const result = await Notification.deleteMany({
      recipient: req.account._id,
      isRead: true
    });

    res.json({
      success: true,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Delete all read notifications error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Lỗi khi xóa thông báo' 
    });
  }
});

// Create notification (internal use by other routes)
router.post("/", authenticate, async (req, res) => {
  try {
    const { recipient, type, title, message, link, priority, metadata } = req.body;

    if (!recipient || !type || !title || !message) {
      return res.status(400).json({ 
        success: false, 
        error: 'Thiếu thông tin bắt buộc' 
      });
    }

    const notification = await Notification.create({
      recipient,
      sender: req.account._id,
      type,
      title,
      message,
      link,
      priority: priority || 'normal',
      metadata: metadata || {}
    });

    // Emit socket event if io is available
    const io = req.app.get('io');
    if (io) {
      io.to(recipient).emit('newNotification', notification);
    }

    res.json({
      success: true,
      notification
    });
  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Lỗi khi tạo thông báo' 
    });
  }
});

export default router;
