import React, { useState, useEffect } from "react";
import { useNotifications } from "../contexts/UseNotifications";
import { type Notification, type NotificationType } from "../utils/api";
import { useNavigate } from "react-router-dom";

interface Props {
  open: boolean;
  onClose: () => void;
}

const NotificationListDialog: React.FC<Props> = ({ open, onClose }) => {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    isLoading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllRead,
  } = useNotifications();

  const [filter, setFilter] = useState<"all" | "unread">("all");

  useEffect(() => {
    if (open) {
      fetchNotifications({ 
        limit: 50,
        isRead: filter === "unread" ? false : undefined
      });
    }
  }, [open, filter, fetchNotifications]);

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    if (!notification.isRead) {
      await markAsRead(notification._id);
    }

    // Navigate to link if provided
    if (notification.link) {
      onClose();
      navigate(notification.link);
    }
  };

  const getNotificationIcon = (type: NotificationType) => {
    const icons: Record<NotificationType, string> = {
      "chat-request": "💬",
      "chat-message": "💬",
      "request-accepted": "✅",
      "request-rejected": "❌",
      "report-reviewed": "📋",
      "student-assigned": "👨‍🎓",
      "student-removed": "👨‍🎓",
      "subject-assigned": "📚",
      "file-submitted": "📎",
      "deadline-reminder": "⏰",
      "system": "🔔",
      "other": "ℹ️"
    };
    return icons[type] || "ℹ️";
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      urgent: "border-l-red-500 bg-red-50",
      high: "border-l-orange-500 bg-orange-50",
      normal: "border-l-blue-500 bg-blue-50",
      low: "border-l-gray-500 bg-gray-50"
    };
    return colors[priority] || colors.normal;
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "vừa xong";
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return date.toLocaleDateString("vi-VN");
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-30" onClick={onClose} />
      
      {/* Dropdown Panel */}
      <div className="absolute top-full right-0 mt-2 w-96 bg-white rounded-lg shadow-2xl border border-gray-200 z-40 max-h-[600px] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Thông báo</h2>
            {unreadCount > 0 && (
              <p className="text-sm text-gray-500">{unreadCount} chưa đọc</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Filters */}
        <div className="p-3 border-b bg-gray-50 space-y-2">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1 rounded-md text-sm font-medium transition ${
                filter === "all"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-100"
              }`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setFilter("unread")}
              className={`px-3 py-1 rounded-md text-sm font-medium transition ${
                filter === "unread"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-100"
              }`}
            >
              Chưa đọc
            </button>
          </div>

          {unreadCount > 0 && (
            <div className="flex gap-2">
              <button
                onClick={() => markAllAsRead()}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Đánh dấu tất cả đã đọc
              </button>
              <span className="text-gray-300">|</span>
              <button
                onClick={() => deleteAllRead()}
                className="text-sm text-red-600 hover:text-red-700 font-medium"
              >
                Xóa đã đọc
              </button>
            </div>
          )}
        </div>

        {/* Notification List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-500">
              <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <p className="text-sm">Không có thông báo</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification._id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-4 border-l-4 transition cursor-pointer hover:bg-gray-50 ${
                    getPriorityColor(notification.priority)
                  } ${!notification.isRead ? "bg-opacity-30" : "bg-opacity-0"}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 text-2xl">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className={`text-sm font-medium ${
                          notification.isRead ? "text-gray-700" : "text-gray-900"
                        }`}>
                          {notification.title}
                        </h4>
                        {!notification.isRead && (
                          <span className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full mt-1"></span>
                        )}
                      </div>
                      <p className={`text-sm mb-2 ${
                        notification.isRead ? "text-gray-500" : "text-gray-700"
                      }`}>
                        {notification.message}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">
                          {formatTimestamp(notification.createdAt)}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification._id);
                          }}
                          className="text-xs text-red-500 hover:text-red-700"
                        >
                          Xóa
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default NotificationListDialog;
