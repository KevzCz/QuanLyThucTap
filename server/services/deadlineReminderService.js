import cron from 'node-cron';
import SubHeader from '../models/SubHeader.js';
import SinhVien from '../models/SinhVien.js';
import FileSubmission from '../models/FileSubmission.js';
import notificationService from './notificationService.js';

/**
 * Deadline Reminder Service
 * Sends reminders for upcoming nộp-file deadlines
 */

class DeadlineReminderService {
  constructor() {
    this.io = null;
  }

  /**
   * Initialize the cron job
   * @param {SocketIO.Server} io - Socket.IO server instance
   */
  init(io) {
    this.io = io;
    
    // Run every day at 9:00 AM
    cron.schedule('0 9 * * *', () => {
      this.checkDeadlines();
    });

    console.log('Deadline reminder service initialized - will run daily at 9:00 AM');
  }

  /**
   * Check for upcoming deadlines and send reminders
   */
  async checkDeadlines() {
    try {
      console.log('Running deadline reminder check...');
      
      const now = new Date();
      const threeDaysFromNow = new Date(now.getTime() + (3 * 24 * 60 * 60 * 1000));

      // Find all active nộp-file subheaders with deadlines in the next 3 days
      const upcomingDeadlines = await SubHeader.find({
        kind: 'nop-file',
        isActive: true,
        endAt: {
          $gte: now,
          $lte: threeDaysFromNow
        }
      }).populate({
        path: 'pageHeader',
        select: 'pageType internshipSubject instructor',
        populate: [
          { path: 'internshipSubject', select: 'name students' },
          { path: 'instructor', select: 'fullName account' }
        ]
      });

      console.log(`Found ${upcomingDeadlines.length} upcoming deadlines`);

      for (const subHeader of upcomingDeadlines) {
        await this.sendReminders(subHeader);
      }

      console.log('Deadline reminder check completed');
    } catch (error) {
      console.error('Error checking deadlines:', error);
    }
  }

  /**
   * Send reminders for a specific subheader
   * @param {Object} subHeader - SubHeader document with populated pageHeader
   */
  async sendReminders(subHeader) {
    try {
      if (!subHeader.pageHeader) {
        console.warn(`SubHeader ${subHeader._id} has no pageHeader`);
        return;
      }

      const { pageType, internshipSubject, instructor } = subHeader.pageHeader;
      let students = [];

      // Get relevant students based on page type
      if (pageType === 'khoa' && internshipSubject) {
        // For khoa pages, get all students in the subject (internshipSubject.students is array of Account IDs)
        students = await SinhVien.find({
          account: { $in: internshipSubject.students }
        }).select('account _id');
      } else if (pageType === 'teacher' && instructor && instructor.account) {
        // For teacher pages, get students supervised by this teacher (using Account ID)
        students = await SinhVien.find({
          supervisor: instructor.account
        }).select('account _id');
      }

      console.log(`Sending reminders to ${students.length} students for subheader: ${subHeader.title}`);

      // Check which students haven't submitted yet
      for (const student of students) {
        const hasSubmitted = await FileSubmission.exists({
          subHeader: subHeader._id,
          student: student._id
        });

        if (!hasSubmitted) {
          await this.sendReminderNotification(student, subHeader);
        }
      }
    } catch (error) {
      console.error(`Error sending reminders for subheader ${subHeader._id}:`, error);
    }
  }

  /**
   * Send a reminder notification to a student
   * @param {Object} student - Student document
   * @param {Object} subHeader - SubHeader document
   */
  async sendReminderNotification(student, subHeader) {
    try {
      const deadline = new Date(subHeader.endAt);
      const now = new Date();
      const daysUntilDeadline = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));

      const instructorName = subHeader.pageHeader.instructor?.fullName || 'Giảng viên';
      const subjectName = subHeader.pageHeader.internshipSubject?.name || '';

      let urgencyText = '';
      let priority = 'normal';
      
      if (daysUntilDeadline <= 1) {
        urgencyText = 'KHẨN CẤP - ';
        priority = 'urgent';
      } else if (daysUntilDeadline <= 2) {
        priority = 'high';
      }

      const message = `${urgencyText}Nhắc nhở: Bạn chưa nộp file cho "${subHeader.title}". ` +
        `Hạn nộp: ${deadline.toLocaleDateString('vi-VN')} (còn ${daysUntilDeadline} ngày)`;

      // Generate correct link based on page type
      const link = subHeader.pageHeader.pageType === 'teacher'
        ? `/docs-teacher/sub/${subHeader._id}/upload`
        : `/docs-dept/sub/${subHeader._id}/upload`;

      await notificationService.createNotification({
        recipient: student.account,
        type: 'deadline-reminder',
        title: `Nhắc nhở nộp file${subjectName ? ` - ${subjectName}` : ''}`,
        message,
        link,
        priority,
        metadata: {
          subHeaderId: subHeader._id.toString(),
          pageHeaderId: subHeader.pageHeader._id.toString(),
          deadline: subHeader.endAt.toISOString(),
          daysRemaining: daysUntilDeadline,
          pageType: subHeader.pageHeader.pageType
        }
      }, this.io);
    } catch (error) {
      console.error(`Error sending reminder to student ${student._id}:`, error);
    }
  }

  /**
   * Manually trigger deadline check (for testing)
   */
  async triggerManualCheck() {
    console.log('Manual deadline check triggered');
    await this.checkDeadlines();
  }
}

export default new DeadlineReminderService();
