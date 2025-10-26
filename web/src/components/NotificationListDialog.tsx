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
      low: "border-l-gray-400 bg-gray-50"
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
      {/* Light Backdrop - only slightly darkens background */}
      <div 
        className="fixed inset-0 z-30 bg-black/5" 
        onClick={onClose} 
      />
      
      {/* Dropdown Panel - positioned as a dropdown, not modal */}
      <div className="fixed sm:absolute top-[60px] sm:top-full right-0 sm:right-0 sm:mt-2 w-[calc(100vw-16px)] sm:w-[420px] mx-2 sm:mx-0 bg-white rounded-xl shadow-2xl border border-gray-200 z-40 max-h-[calc(100vh-80px)] sm:max-h-[640px] flex flex-col overflow-hidden animate-in slide-in-from-top-2 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b bg-gradient-to-br from-blue-50 to-white">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
              <span className="text-xl sm:text-2xl">🔔</span>
              Thông báo
            </h2>
            {unreadCount > 0 && (
              <p className="text-xs sm:text-sm text-blue-600 font-medium mt-0.5">
                {unreadCount} thông báo chưa đọc
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-2 transition-all touch-manipulation"
            aria-label="Đóng"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Filters & Actions */}
        <div className="px-4 sm:px-5 py-3 border-b bg-gray-50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex gap-2">
              <button
                onClick={() => setFilter("all")}
                className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all touch-manipulation ${
                  filter === "all"
                    ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                    : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
                }`}
              >
                Tất cả
              </button>
              <button
                onClick={() => setFilter("unread")}
                className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all relative touch-manipulation ${
                  filter === "unread"
                    ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                    : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
                }`}
              >
                Chưa đọc
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {unreadCount > 0 && (
            <div className="flex flex-wrap gap-2 sm:gap-3">
              <button
                onClick={() => markAllAsRead()}
                className="text-xs sm:text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 hover:underline touch-manipulation"
              >
                <svg className="w-3.5 sm:w-4 h-3.5 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="hidden sm:inline">Đánh dấu tất cả đã đọc</span>
                <span className="sm:hidden">Đọc tất cả</span>
              </button>
              <span className="text-gray-300 hidden sm:inline">•</span>
              <button
                onClick={() => deleteAllRead()}
                className="text-xs sm:text-sm text-red-600 hover:text-red-700 font-medium flex items-center gap-1 hover:underline touch-manipulation"
              >
                <svg className="w-3.5 sm:w-4 h-3.5 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Xóa đã đọc
              </button>
            </div>
          )}
        </div>

        {/* Notification List */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-500">
              <div className="relative">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-100"></div>
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent absolute inset-0"></div>
              </div>
              <p className="mt-4 text-sm font-medium">Đang tải thông báo...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-500 px-4">
              <div className="bg-gray-100 rounded-full p-4 mb-3">
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <p className="text-base font-medium text-gray-700">Không có thông báo</p>
              <p className="text-sm text-gray-500 mt-1">Bạn đã xem hết tất cả thông báo</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {notifications.map((notification) => (
                <div
                  key={notification._id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-3 sm:p-4 border-l-4 transition-all cursor-pointer hover:shadow-md hover:-translate-y-0.5 group touch-manipulation ${
                    getPriorityColor(notification.priority)
                  } ${!notification.isRead ? "bg-opacity-40 hover:bg-opacity-50" : "bg-opacity-10 hover:bg-opacity-20"}`}
                >
                  <div className="flex items-start gap-2 sm:gap-3">
                    {/* Icon */}
                    <div className="flex-shrink-0 text-2xl sm:text-3xl group-hover:scale-110 transition-transform">
                      {getNotificationIcon(notification.type)}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className={`text-xs sm:text-sm font-semibold leading-snug ${
                          notification.isRead ? "text-gray-700" : "text-gray-900"
                        }`}>
                          {notification.title}
                        </h4>
                        {!notification.isRead && (
                          <span className="flex-shrink-0 w-2 h-2 sm:w-2.5 sm:h-2.5 bg-blue-600 rounded-full mt-1 animate-pulse"></span>
                        )}
                      </div>
                      
                      <p className={`text-xs sm:text-sm leading-relaxed mb-2 ${
                        notification.isRead ? "text-gray-500" : "text-gray-700"
                      }`}>
                        {notification.message}
                      </p>
                      
                      {/* Footer */}
                      <div className="flex items-center justify-between mt-2 sm:mt-3">
                        <span className="text-[10px] sm:text-xs text-gray-400 font-medium flex items-center gap-1">
                          <svg className="w-3 sm:w-3.5 h-3 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {formatTimestamp(notification.createdAt)}
                        </span>
                        
                        <div className="flex items-center gap-2">
                          {notification.link && (
                            <span className="text-[10px] sm:text-xs text-blue-600 font-medium flex items-center gap-1">
                              <span className="hidden sm:inline">Xem chi tiết</span>
                              <span className="sm:hidden">Chi tiết</span>
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </span>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notification._id);
                            }}
                            className="text-xs text-gray-400 hover:text-red-600 hover:bg-red-50 px-1.5 sm:px-2 py-1 rounded transition-all touch-manipulation"
                            aria-label="Xóa thông báo"
                          >
                            <svg className="w-3.5 sm:w-4 h-3.5 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
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
