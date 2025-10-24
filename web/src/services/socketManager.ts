import { io, Socket } from 'socket.io-client';
import type { ChatMessage, ChatConversation, ChatRequest } from './chatApi';

export interface SocketEvents {
  // Connection events
  connect: () => void;
  disconnect: () => void;
  
  // Authentication
  authenticate: (userData: { id: string; name: string; role: string }) => void;
  
  // Conversation events
  joinConversation: (conversationId: string) => void;
  leaveConversation: (conversationId: string) => void;
  
  // Message events
  newMessage: (message: ChatMessage) => void;
  messageRead: (data: { messageId: string; readBy: { userId: string; userName: string; readAt: string } }) => void;
  
  // Typing events
  typing: (data: { conversationId: string }) => void;
  stopTyping: (data: { conversationId: string }) => void;
  userTyping: (data: { userId: string; userName: string; conversationId: string }) => void;
  userStoppedTyping: (data: { userId: string; conversationId: string }) => void;
  
  // User presence
  userOnline: (data: { userId: string; name: string; role: string }) => void;
  userOffline: (data: { userId: string }) => void;
  
  // Request events
  newChatRequest: (request: ChatRequest) => void;
  newPDTRequest: (request: ChatRequest) => void;
  requestUpdated: (request: ChatRequest) => void;
  
  // Conversation events
  newConversation: (conversation: ChatConversation) => void;
  conversationUpdated: (data: { conversationId: string; lastMessage: ChatMessage; updatedAt: string }) => void;
}

class SocketManager {
  private socket: Socket | null = null;
  private isConnected = false;
  private currentUser: { id: string; name: string; role: string } | null = null;

  connect(serverUrl: string = 'http://localhost:3001') {
    if (this.socket) {
      this.socket.disconnect();
    }

    this.socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      withCredentials: true
    });

    this.setupEventHandlers();
    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.currentUser = null;
    }
  }

  authenticate(userData: { id: string; name: string; role: string }) {
    if (this.socket && this.socket.connected) {
      this.currentUser = userData;
      this.socket.emit('authenticate', userData);
    }
  }

  // Conversation methods
  joinConversation(conversationId: string) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('joinConversation', conversationId);
    }
  }

  leaveConversation(conversationId: string) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('leaveConversation', conversationId);
    }
  }

  // Typing indicators
  startTyping(conversationId: string) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('typing', { conversationId });
    }
  }

  stopTyping(conversationId: string) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('stopTyping', { conversationId });
    }
  }

  // Read receipts
  markAsRead(conversationId: string, messageId: string) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('markAsRead', { conversationId, messageId });
    }
  }

  // Event listener management - simplified approach
  on(event: string, callback: (...args: unknown[]) => void): void {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event: string, callback?: (...args: unknown[]) => void): void {
    if (this.socket) {
      if (callback) {
        this.socket.off(event, callback);
      } else {
        this.socket.off(event);
      }
    }
  }

  // Get connection status
  get connected() {
    return this.isConnected && this.socket?.connected;
  }

  get user() {
    return this.currentUser;
  }

  private setupEventHandlers() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.isConnected = true;
      
      // Re-authenticate if we have user data
      if (this.currentUser) {
        this.authenticate(this.currentUser);
      }
    });

    this.socket.on('disconnect', () => {
      this.isConnected = false;
    });

    this.socket.on('connect_error', () => {
      this.isConnected = false;
    });
  }
}

// Create singleton instance
export const socketManager = new SocketManager();

// Auto-connect when the module is imported (optional)
// socketManager.connect();

export default socketManager;