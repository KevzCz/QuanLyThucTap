import { useEffect, useCallback } from 'react';
import { socketManager } from '../services/socketManager';

export const useSocket = () => {
  const connect = useCallback((serverUrl?: string) => {
    return socketManager.connect(serverUrl);
  }, []);

  const disconnect = useCallback(() => {
    socketManager.disconnect();
  }, []);

  const authenticate = useCallback((userData: { id: string; name: string; role: string }) => {
    socketManager.authenticate(userData);
  }, []);

  // Utility methods
  const joinConversation = useCallback((conversationId: string) => {
    socketManager.joinConversation(conversationId);
  }, []);

  const leaveConversation = useCallback((conversationId: string) => {
    socketManager.leaveConversation(conversationId);
  }, []);

  const startTyping = useCallback((conversationId: string) => {
    socketManager.startTyping(conversationId);
  }, []);

  const stopTyping = useCallback((conversationId: string) => {
    socketManager.stopTyping(conversationId);
  }, []);

  const markAsRead = useCallback((conversationId: string, messageId: string) => {
    socketManager.markAsRead(conversationId, messageId);
  }, []);

  return {
    // Connection management
    connect,
    disconnect,
    authenticate,
    connected: socketManager.connected,
    user: socketManager.user,
    
    // Direct access to socket manager for event listeners
    socketManager,
    
    // Utility methods
    joinConversation,
    leaveConversation,
    startTyping,
    stopTyping,
    markAsRead,
  };
};

// Custom hook for easier socket event handling in components
export const useSocketEvent = (
  eventName: string,
  callback: (...args: unknown[]) => void
) => {
  useEffect(() => {
    socketManager.on(eventName, callback);
    
    return () => {
      socketManager.off(eventName, callback);
    };
  }, [eventName, callback]);
};

export default useSocket;