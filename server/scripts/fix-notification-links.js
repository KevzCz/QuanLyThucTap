import mongoose from 'mongoose';
import Notification from '../models/Notification.js';
import SubHeader from '../models/SubHeader.js';

/**
 * Script to fix notification links for file submissions and deadline reminders
 * Updates old links like /submissions/{id} to proper format with /upload suffix
 */

async function fixNotificationLinks() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/QLTT');
    console.log('Connected to MongoDB');

    // Find all notifications with incorrect links
    const notifications = await Notification.find({
      $or: [
        { link: { $regex: '^/submissions/' } },
        { link: { $regex: '^/teacher-page/' } },
        { link: { $regex: '^/khoa-page/' } },
        { 
          $and: [
            { link: { $regex: '^/docs-dept/sub/' } },
            { link: { $not: { $regex: '/upload$' } } },
            { type: { $in: ['file-submitted', 'deadline-reminder'] } }
          ]
        },
        { 
          $and: [
            { link: { $regex: '^/docs-teacher/sub/' } },
            { link: { $not: { $regex: '/upload$' } } },
            { type: { $in: ['file-submitted', 'deadline-reminder'] } }
          ]
        }
      ]
    }).populate({
      path: 'metadata.subHeaderId',
      model: 'SubHeader',
      populate: {
        path: 'pageHeader',
        model: 'PageHeader',
        select: 'pageType'
      }
    });

    console.log(`Found ${notifications.length} notifications to fix`);

    let fixed = 0;
    let skipped = 0;

    for (const notification of notifications) {
      let newLink = null;
      
      // Extract subHeaderId from various link formats
      let subHeaderId = null;
      
      if (notification.link.startsWith('/submissions/')) {
        subHeaderId = notification.link.replace('/submissions/', '');
      } else if (notification.metadata?.subHeaderId) {
        subHeaderId = notification.metadata.subHeaderId;
      } else {
        // Try to extract from docs-dept or docs-teacher links
        const match = notification.link.match(/\/(docs-dept|docs-teacher)\/sub\/([^\/]+)/);
        if (match) {
          subHeaderId = match[2];
        }
      }

      if (!subHeaderId) {
        console.log(`Skipping notification ${notification._id} - no subHeaderId found`);
        skipped++;
        continue;
      }

      // Get the subheader to determine pageType
      const subHeader = await SubHeader.findById(subHeaderId).populate('pageHeader', 'pageType');
      
      if (!subHeader || !subHeader.pageHeader) {
        console.log(`Skipping notification ${notification._id} - subheader not found`);
        skipped++;
        continue;
      }

      const pageType = subHeader.pageHeader.pageType;
      
      // Generate correct link based on type and pageType
      if (notification.type === 'file-submitted' || notification.type === 'deadline-reminder') {
        // These should go to upload page
        if (pageType === 'teacher') {
          newLink = `/docs-teacher/sub/${subHeaderId}/upload`;
        } else {
          newLink = `/docs-dept/sub/${subHeaderId}/upload`;
        }
      } else if (notification.type === 'system') {
        // System notifications (thông báo) should go to view page
        if (pageType === 'teacher') {
          newLink = `/docs-teacher/sub/${subHeaderId}`;
        } else {
          newLink = `/docs-dept/sub/${subHeaderId}`;
        }
      }

      if (newLink && newLink !== notification.link) {
        await Notification.updateOne(
          { _id: notification._id },
          { 
            $set: { link: newLink },
            $unset: { 'metadata.pageType': '' }
          }
        );
        console.log(`Fixed: ${notification._id} - ${notification.link} → ${newLink}`);
        fixed++;
      } else {
        skipped++;
      }
    }

    console.log(`\nSummary:`);
    console.log(`- Fixed: ${fixed} notifications`);
    console.log(`- Skipped: ${skipped} notifications`);
    console.log(`- Total: ${notifications.length} notifications processed`);

  } catch (error) {
    console.error('Error fixing notification links:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Disconnected from MongoDB');
  }
}

// Run the script
fixNotificationLinks();
