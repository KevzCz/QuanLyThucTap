# Notification System Documentation

## Overview

A complete real-time notification system for the QLTT application with server-side API, Socket.IO real-time push, and React frontend integration.

## Architecture

### Backend Components

#### 1. Notification Model (`server/models/Notification.js`)
MongoDB schema for storing notifications with the following fields:
- `recipient`: User ID who receives the notification
- `sender`: User ID who triggered the notification (optional)
- `type`: Notification type (chat-request, chat-message, request-accepted, etc.)
- `title`: Short notification title
- `message`: Notification content
- `link`: Optional link to related resource
- `priority`: Priority level (low, normal, high, urgent)
- `isRead`: Boolean read status
- `readAt`: Timestamp when marked as read
- `metadata`: Additional context (conversationId, requestId, etc.)

**Auto-cleanup**: Read notifications are automatically deleted after 90 days.

#### 2. Notification Routes (`server/routes/notifications.js`)
RESTful API endpoints:
- `GET /api/notifications` - Get paginated notifications
- `GET /api/notifications/unread-count` - Get unread count
- `PUT /api/notifications/:id/read` - Mark single notification as read
- `PUT /api/notifications/read-all` - Mark all as read
- `DELETE /api/notifications/:id` - Delete single notification
- `DELETE /api/notifications` - Delete all read notifications
- `POST /api/notifications` - Create notification (internal use)

#### 3. Notification Service (`server/services/notificationService.js`)
Helper service for creating notifications from other parts of the application:

```javascript
import notificationService from './services/notificationService.js';

// Create a notification
await notificationService.createNotification({
  recipient: userId,
  sender: currentUserId,
  type: 'chat-request',
  title: 'New Chat Request',
  message: 'John Doe sent you a chat request',
  link: '/chat?request=123',
  priority: 'normal',
  metadata: { requestId: '123' }
}, io); // Pass io for real-time push

// Helper methods for common notifications
await notificationService.notifyChatRequest(recipientId, senderName, requestId, io);
await notificationService.notifyRequestAccepted(recipientId, requestType, requestId, io);
await notificationService.notifyReportReviewed(recipientId, reportId, status, io);
// ... and more
```

#### 4. Socket.IO Integration (`server/server.js`)
Real-time notification broadcasting:
- Users join their personal room on authentication
- Notifications are pushed to specific users via Socket.IO
- Event: `newNotification` with notification object

### Frontend Components

#### 1. Notification API Client (`web/src/utils/api.ts`)
TypeScript API client methods:
```typescript
// Get notifications
await apiClient.getNotifications({ page: 1, limit: 20, isRead: false });

// Get unread count
await apiClient.getUnreadNotificationCount();

// Mark as read
await apiClient.markNotificationAsRead(notificationId);
await apiClient.markAllNotificationsAsRead();

// Delete notifications
await apiClient.deleteNotification(notificationId);
await apiClient.deleteAllReadNotifications();
```

#### 2. Notification Context (`web/src/contexts/NotificationContext.tsx`)
React context providing:
- `notifications`: Array of notification objects
- `unreadCount`: Number of unread notifications
- `isLoading`: Loading state
- `fetchNotifications()`: Fetch notifications with filters
- `markAsRead(id)`: Mark single notification as read
- `markAllAsRead()`: Mark all as read
- `deleteNotification(id)`: Delete single notification
- `deleteAllRead()`: Delete all read notifications
- `refreshUnreadCount()`: Refresh unread count

Features:
- Real-time updates via Socket.IO
- Browser notification support (requests permission on mount)
- Automatic state management

#### 3. Notification List Dialog (`web/src/components/NotificationListDialog.tsx`)
Full-featured notification panel:
- Slide-in panel from right side
- Filter by read/unread status
- Display notification type icons
- Priority-based color coding
- Relative timestamps ("5 minutes ago")
- Click to navigate to linked resource
- Mark as read on click
- Delete individual notifications
- Bulk actions (mark all read, delete all read)

#### 4. Header Integration (`web/src/components/Layout/Header.tsx`)
- Bell icon with unread count badge
- Opens NotificationListDialog on click
- Red badge shows count (e.g., "5" or "9+" for 10+)

## Usage Examples

### Creating Notifications from Server Code

#### Example 1: Notify when request is accepted
```javascript
import notificationService from '../services/notificationService.js';

// In your request acceptance route
router.put('/requests/:id/accept', authenticate, async (req, res) => {
  const request = await Request.findById(req.params.id);
  
  // Update request status
  request.status = 'accepted';
  await request.save();
  
  // Notify the requester
  const io = req.app.get('io');
  await notificationService.notifyRequestAccepted(
    request.idgv, // recipient user ID
    'add-student',
    request._id,
    io
  );
  
  res.json({ success: true, request });
});
```

#### Example 2: Notify when chat message is sent
```javascript
// In your chat route
const io = req.app.get('io');

// Send notification to all conversation participants except sender
for (const participant of conversation.participants) {
  if (participant.userId !== senderId) {
    await notificationService.notifyChatMessage(
      participant.userId,
      senderName,
      conversationId,
      io
    );
  }
}
```

#### Example 3: Custom notification
```javascript
await notificationService.createNotification({
  recipient: studentId,
  sender: teacherId,
  type: 'deadline-reminder',
  title: 'Upcoming Deadline',
  message: 'Report due in 2 days',
  link: `/reports/123`,
  priority: 'high',
  metadata: { reportId: '123' }
}, io);
```

### Using Notifications in React Components

```tsx
import { useNotifications } from '../contexts/NotificationContext';

function MyComponent() {
  const { notifications, unreadCount, markAsRead } = useNotifications();
  
  return (
    <div>
      <h2>You have {unreadCount} unread notifications</h2>
      {notifications.map(notif => (
        <div key={notif._id} onClick={() => markAsRead(notif._id)}>
          {notif.title}: {notif.message}
        </div>
      ))}
    </div>
  );
}
```

## Notification Types

| Type | Usage | Priority |
|------|-------|----------|
| `chat-request` | New chat request | normal |
| `chat-message` | New chat message | normal |
| `request-accepted` | Request approved | high |
| `request-rejected` | Request denied | high |
| `report-reviewed` | Report reviewed | high |
| `student-assigned` | Student assigned to supervisor | high |
| `student-removed` | Student removed | normal |
| `subject-assigned` | Subject assigned | high |
| `file-submitted` | File uploaded | normal |
| `deadline-reminder` | Deadline approaching | urgent/high |
| `system` | System messages | normal |
| `other` | Other notifications | normal |

## Configuration

### Server Configuration
Add notification routes in `server.js`:
```javascript
import notificationRoutes from "./routes/notifications.js";
app.use("/api/notifications", notificationRoutes);
```

### Frontend Configuration
Wrap your app with NotificationProvider in `App.tsx`:
```tsx
<AuthProvider>
  <NotificationProvider>
    <YourApp />
  </NotificationProvider>
</AuthProvider>
```

## Best Practices

1. **Always pass `io` to notification service** when creating notifications from route handlers
2. **Use appropriate priority levels** - urgent for time-sensitive, high for important, normal for regular
3. **Provide meaningful links** - always include a link to the related resource when possible
4. **Include metadata** - store IDs and context for debugging and future features
5. **Test real-time push** - ensure Socket.IO is properly configured and users are authenticated
6. **Handle errors gracefully** - notification creation should not break main functionality

## Browser Notifications

The system requests browser notification permission on mount. When granted:
- Desktop notifications appear for new notifications
- Notifications include title, message, and app icon
- Only shown for new notifications received in real-time

Users can enable/disable in browser settings.

## Database Indexes

Optimized indexes for performance:
- `{ recipient: 1, isRead: 1, createdAt: -1 }` - Main query index
- `{ recipient: 1, type: 1, createdAt: -1 }` - Type filtering
- TTL index on `readAt` for auto-cleanup (90 days)

## Future Enhancements

Potential additions:
- [ ] Email notification integration
- [ ] Notification preferences per user
- [ ] Notification grouping (e.g., "5 new chat messages")
- [ ] Notification sound options
- [ ] Scheduled notifications
- [ ] Notification analytics
- [ ] Push notifications for mobile apps
- [ ] Notification templates
- [ ] Multi-language support for notifications

## Troubleshooting

### Notifications not appearing in real-time
1. Check Socket.IO connection status
2. Verify user is authenticated via socket
3. Ensure `io` is passed to notification service
4. Check browser console for errors

### High notification count not clearing
1. Verify `markAsRead` API is working
2. Check Socket.IO events are firing
3. Ensure NotificationContext is properly wrapping the app

### Missing notifications
1. Check notification creation in database
2. Verify recipient ID is correct
3. Ensure NotificationProvider is active
4. Check API endpoint responses

## API Response Examples

### Get Notifications
```json
{
  "success": true,
  "notifications": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "recipient": "GV001",
      "sender": {
        "id": "PDT001",
        "name": "Phòng Đào Tạo",
        "email": "pdt@example.com",
        "role": "phong-dao-tao"
      },
      "type": "request-accepted",
      "title": "Yêu cầu được chấp nhận",
      "message": "Yêu cầu add-student của bạn đã được chấp nhận",
      "link": "/requests/123",
      "priority": "high",
      "isRead": false,
      "metadata": {
        "requestId": "123"
      },
      "createdAt": "2025-10-21T10:30:00.000Z",
      "updatedAt": "2025-10-21T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pages": 5,
    "total": 47
  }
}
```

### Unread Count
```json
{
  "success": true,
  "count": 8
}
```

## License

Part of the QLTT (Quản Lý Thực Tập) system.
