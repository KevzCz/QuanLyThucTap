import React, { createContext, useState, useEffect, useCallback } from 'react';
import { socketManager } from '../services/socketManager';
import { apiClient, type Notification, type NotificationType } from '../utils/api';
import { useAuth } from './UseAuth';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  fetchNotifications: (params?: { page?: number; limit?: number; isRead?: boolean; type?: NotificationType | "all" }) => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  deleteAllRead: () => Promise<void>;
  refreshUnreadCount: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Export context for use in separate hook file
export { NotificationContext };

interface NotificationProviderProps {
  children: React.ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch unread count
  const refreshUnreadCount = useCallback(async () => {
    if (!user) return;
    
    try {
      const response = await apiClient.getUnreadNotificationCount();
      setUnreadCount(response.count);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  }, [user]);

  // Fetch notifications
  const fetchNotifications = useCallback(async (params?: { 
    page?: number; 
    limit?: number; 
    isRead?: boolean; 
    type?: NotificationType | "all" 
  }) => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const response = await apiClient.getNotifications(params);
      setNotifications(response.notifications);
      await refreshUnreadCount();
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, refreshUnreadCount]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await apiClient.markNotificationAsRead(notificationId);
      
      // Update local state
      setNotifications(prev => 
        prev.map(notif => 
          notif._id === notificationId 
            ? { ...notif, isRead: true, readAt: new Date().toISOString() }
            : notif
        )
      );
      
      await refreshUnreadCount();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, [refreshUnreadCount]);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    try {
      await apiClient.markAllNotificationsAsRead();
      
      // Update local state
      setNotifications(prev => 
        prev.map(notif => ({ 
          ...notif, 
          isRead: true, 
          readAt: new Date().toISOString() 
        }))
      );
      
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  }, []);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      await apiClient.deleteNotification(notificationId);
      
      // Update local state
      setNotifications(prev => prev.filter(notif => notif._id !== notificationId));
      await refreshUnreadCount();
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  }, [refreshUnreadCount]);

  // Delete all read notifications
  const deleteAllRead = useCallback(async () => {
    try {
      await apiClient.deleteAllReadNotifications();
      
      // Update local state
      setNotifications(prev => prev.filter(notif => !notif.isRead));
    } catch (error) {
      console.error('Error deleting read notifications:', error);
    }
  }, []);

  // Listen for real-time notifications via Socket.IO
  useEffect(() => {
    if (!user) return;

    const handleNewNotification = (notification: Notification) => {
      console.log('New notification received:', notification);
      
      // Add to the beginning of the list
      setNotifications(prev => [notification, ...prev]);
      
      // Increment unread count
      if (!notification.isRead) {
        setUnreadCount(prev => prev + 1);
      }
      
      // Optional: Show browser notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
        });
      }
    };

    socketManager.on('newNotification', handleNewNotification as (...args: unknown[]) => void);

    return () => {
      socketManager.off('newNotification', handleNewNotification as (...args: unknown[]) => void);
    };
  }, [user]);

  // Initial fetch on mount
  useEffect(() => {
    if (user) {
      fetchNotifications({ limit: 20 });
      refreshUnreadCount();
    }
  }, [user, fetchNotifications, refreshUnreadCount]);

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    isLoading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllRead,
    refreshUnreadCount,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
