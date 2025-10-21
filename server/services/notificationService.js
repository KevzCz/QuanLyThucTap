import Notification from "../models/Notification.js";

/**
 * Service for creating and managing notifications
 */
class NotificationService {
  /**
   * Create a notification
   * @param {Object} data - Notification data
   * @param {string} data.recipient - User ID of recipient
   * @param {string} data.sender - User ID of sender (optional)
   * @param {string} data.type - Notification type
   * @param {string} data.title - Notification title
   * @param {string} data.message - Notification message
   * @param {string} data.link - Link to related resource (optional)
   * @param {string} data.priority - Priority level (optional)
   * @param {Object} data.metadata - Additional metadata (optional)
   * @param {Object} io - Socket.IO instance for real-time push (optional)
   */
  async createNotification(data, io = null) {
    try {
      const notification = await Notification.create({
        recipient: data.recipient,
        sender: data.sender || null,
        type: data.type,
        title: data.title,
        message: data.message,
        link: data.link || null,
        priority: data.priority || 'normal',
        metadata: data.metadata || {}
      });

      // Populate sender info
      await notification.populate('sender', 'id name email role');

      // Emit real-time notification if socket.io is available
      if (io) {
        io.to(data.recipient.toString()).emit('newNotification', notification);
      }

      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Create notifications for multiple recipients
   */
  async createBulkNotifications(recipients, data, io = null) {
    try {
      const notifications = await Promise.all(
        recipients.map(recipientId => 
          this.createNotification({ ...data, recipient: recipientId }, io)
        )
      );
      return notifications;
    } catch (error) {
      console.error('Error creating bulk notifications:', error);
      throw error;
    }
  }

  /**
   * Notify about a new chat request
   */
  async notifyChatRequest(recipientId, senderName, requestId, io = null) {
    return this.createNotification({
      recipient: recipientId,
      type: 'chat-request',
      title: 'Yêu cầu chat mới',
      message: `${senderName} đã gửi yêu cầu chat cho bạn`,
      link: `/chat?request=${requestId}`,
      priority: 'normal',
      metadata: { requestId }
    }, io);
  }

  /**
   * Notify about a new chat message
   */
  async notifyChatMessage(recipientId, senderName, conversationId, io = null) {
    return this.createNotification({
      recipient: recipientId,
      type: 'chat-message',
      title: 'Tin nhắn mới',
      message: `${senderName} đã gửi tin nhắn cho bạn`,
      link: `/chat?conversation=${conversationId}`,
      priority: 'normal',
      metadata: { conversationId }
    }, io);
  }

  /**
   * Notify about request acceptance
   */
  async notifyRequestAccepted(recipientId, requestType, requestId, io = null) {
    return this.createNotification({
      recipient: recipientId,
      type: 'request-accepted',
      title: 'Yêu cầu được chấp nhận',
      message: `Yêu cầu ${requestType} của bạn đã được chấp nhận`,
      link: `/requests/${requestId}`,
      priority: 'high',
      metadata: { requestId }
    }, io);
  }

  /**
   * Notify about request rejection
   */
  async notifyRequestRejected(recipientId, requestType, requestId, reason, io = null) {
    return this.createNotification({
      recipient: recipientId,
      type: 'request-rejected',
      title: 'Yêu cầu bị từ chối',
      message: `Yêu cầu ${requestType} của bạn đã bị từ chối${reason ? `: ${reason}` : ''}`,
      link: `/requests/${requestId}`,
      priority: 'high',
      metadata: { requestId }
    }, io);
  }

  /**
   * Notify about report review
   */
  async notifyReportReviewed(recipientId, reportId, status, io = null) {
    return this.createNotification({
      recipient: recipientId,
      type: 'report-reviewed',
      title: 'Báo cáo đã được duyệt',
      message: `Báo cáo của bạn đã được ${status === 'approved' ? 'phê duyệt' : 'từ chối'}`,
      link: `/reports/${reportId}`,
      priority: 'high',
      metadata: { reportId }
    }, io);
  }

  /**
   * Notify student about assignment to supervisor
   */
  async notifyStudentAssigned(studentId, supervisorName, subjectId, io = null) {
    return this.createNotification({
      recipient: studentId,
      type: 'student-assigned',
      title: 'Đã được phân công giảng viên',
      message: `Bạn đã được phân công cho giảng viên ${supervisorName}`,
      link: `/internship-subjects/${subjectId}`,
      priority: 'high',
      metadata: { subjectId }
    }, io);
  }

  /**
   * Notify about file submission
   */
  async notifyFileSubmitted(recipientId, studentName, subHeaderId, io = null) {
    return this.createNotification({
      recipient: recipientId,
      type: 'file-submitted',
      title: 'File nộp mới',
      message: `${studentName} đã nộp file`,
      link: `/submissions/${subHeaderId}`,
      priority: 'normal',
      metadata: { subHeaderId }
    }, io);
  }

  /**
   * Notify about deadline reminder
   */
  async notifyDeadlineReminder(recipientId, taskTitle, subHeaderId, daysLeft, io = null) {
    return this.createNotification({
      recipient: recipientId,
      type: 'deadline-reminder',
      title: 'Nhắc nhở hạn nộp',
      message: `Còn ${daysLeft} ngày để nộp: ${taskTitle}`,
      link: `/submissions/${subHeaderId}`,
      priority: daysLeft <= 1 ? 'urgent' : 'high',
      metadata: { subHeaderId }
    }, io);
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId, userId) {
    return Notification.findOneAndUpdate(
      { _id: notificationId, recipient: userId },
      { isRead: true, readAt: new Date() },
      { new: true }
    );
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId) {
    return Notification.updateMany(
      { recipient: userId, isRead: false },
      { isRead: true, readAt: new Date() }
    );
  }

  /**
   * Delete old read notifications
   */
  async cleanupOldNotifications(daysOld = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    return Notification.deleteMany({
      isRead: true,
      readAt: { $lt: cutoffDate }
    });
  }
}

export default new NotificationService();
