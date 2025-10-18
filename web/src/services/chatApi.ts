import { apiClient } from '../utils/api';

export interface ChatUser {
  userId: string;
  name: string;
  role: 'phong-dao-tao' | 'ban-chu-nhiem' | 'giang-vien' | 'sinh-vien';
  email?: string;
  avatar?: string;
  isOnline: boolean;
}

export interface ChatMessage {
  messageId: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  content: string;
  type: 'text' | 'file' | 'image' | 'system';
  attachment?: {
    fileName: string;
    originalName: string;
    fileUrl: string;
    fileSize: number;
    mimeType: string;
  };
  replyToMessageId?: string;
  replyToContent?: string;
  reactions?: Array<{
    userId: string;
    emoji: string;
    timestamp: string;
  }>;
  readBy?: Array<{
    userId: string;
    userName: string;
    readAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface ChatConversation {
  conversationId: string;
  participants: Array<{
    userId: string;
    name: string;
    role: string;
    joinedAt: string;
    lastReadAt: string;
  }>;
  conversationType: 'direct' | 'group' | 'support';
  title?: string;
  isActive: boolean;
  lastMessage?: {
    messageId: string;
    content: string;
    senderId: string;
    senderName: string;
    timestamp: string;
    type: string;
  };
  messageCount: number;
  unreadCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChatRequest {
  requestId: string;
  fromUser: ChatUser;
  toUser: ChatUser;
  message: string;
  subject?: string;
  requestType: 'chat' | 'support' | 'consultation' | 'approval' | 'information';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled';
  assignedTo?: {
    userId: string;
    name: string;
    role: string;
    assignedAt: string;
  };
  isAssigned?: boolean;
  responseMessage?: string;
  respondedAt?: string;
  conversationId?: string;
  attachments?: Array<{
    fileName: string;
    originalName: string;
    fileUrl: string;
    fileSize: number;
    mimeType: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

class ChatAPI {
  // Chat Requests
  async getChatRequests(params?: {
    status?: string;
    isAssigned?: boolean;
    limit?: number;
    skip?: number;
    direction?: 'incoming' | 'outgoing' | 'all';
  }) {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.append('status', params.status);
    if (params?.isAssigned !== undefined) searchParams.append('isAssigned', params.isAssigned.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.skip) searchParams.append('skip', params.skip.toString());
    if (params?.direction) searchParams.append('direction', params.direction);

    const response = await apiClient.request<{ success: boolean; data: ChatRequest[] }>(`/chat/requests?${searchParams.toString()}`, {
      method: 'GET'
    });
    return response.data;
  }

  async createChatRequest(data: {
    toUserId: string;
    message: string;
    subject?: string;
    requestType?: string;
    priority?: string;
    attachments?: File[];
  }) {
    const formData = new FormData();
    formData.append('toUserId', data.toUserId);
    formData.append('message', data.message);
    if (data.subject) formData.append('subject', data.subject);
    if (data.requestType) formData.append('requestType', data.requestType);
    if (data.priority) formData.append('priority', data.priority);
    
    if (data.attachments) {
      data.attachments.forEach((file) => {
        formData.append('attachments', file);
      });
    }

    const response = await apiClient.request<{ success: boolean; data: ChatRequest; message: string }>('/chat/requests', {
      method: 'POST',
      body: formData
    });
    return response.data;
  }

  async getChatRequest(requestId: string) {
    const response = await apiClient.request<{ success: boolean; data: ChatRequest }>(`/chat/requests/${requestId}`, {
      method: 'GET'
    });
    return response.data;
  }

  async acceptChatRequest(requestId: string, responseMessage?: string) {
    const response = await apiClient.request<{ success: boolean; data: ChatRequest & { conversation: ChatConversation; conversationId: string } }>(`/chat/requests/${requestId}/accept`, {
      method: 'POST',
      body: JSON.stringify({ responseMessage })
    });
    return response;
  }

  async declineChatRequest(requestId: string, responseMessage?: string) {
    const response = await apiClient.request<{ success: boolean; data: ChatRequest }>(`/chat/requests/${requestId}/decline`, {
      method: 'POST',
      body: JSON.stringify({ responseMessage })
    });
    return response.data;
  }

  async assignChatRequest(requestId: string, assignToUserId: string) {
    const response = await apiClient.request<{ success: boolean; data: ChatRequest }>(`/chat/requests/${requestId}/assign`, {
      method: 'POST',
      body: JSON.stringify({ assignToUserId })
    });
    return response;
  }

  // Conversations
  async getConversations(params?: {
    limit?: number;
    skip?: number;
    isActive?: boolean;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.skip) searchParams.append('skip', params.skip.toString());
    if (params?.isActive !== undefined) searchParams.append('isActive', params.isActive.toString());

    const response = await apiClient.request<{ success: boolean; data: ChatConversation[] }>(`/chat/conversations?${searchParams.toString()}`, {
      method: 'GET'
    });
    return response.data;
  }

  async getConversation(conversationId: string) {
    const response = await apiClient.request<{ success: boolean; data: ChatConversation }>(`/chat/conversations/${conversationId}`, {
      method: 'GET'
    });
    return response.data;
  }

  async createConversation(data: {
    participantIds: string[];
    title?: string;
    conversationType?: 'direct' | 'group' | 'support';
  }) {
    const response = await apiClient.request<{ success: boolean; data: ChatConversation }>('/chat/conversations', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return response.data;
  }

  // Messages
  async getMessages(conversationId: string, params?: {
    limit?: number;
    skip?: number;
    before?: string;
    after?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.skip) searchParams.append('skip', params.skip.toString());
    if (params?.before) searchParams.append('before', params.before);
    if (params?.after) searchParams.append('after', params.after);

    const response = await apiClient.request<{ success: boolean; data: ChatMessage[] }>(`/chat/conversations/${conversationId}/messages?${searchParams.toString()}`, {
      method: 'GET'
    });
    return response.data;
  }

  async sendMessage(conversationId: string, data: {
    content: string;
    type?: 'text' | 'file';
    attachment?: File;
    replyToMessageId?: string;
  }) {
    const formData = new FormData();
    formData.append('content', data.content);
    if (data.type) formData.append('type', data.type);
    if (data.replyToMessageId) formData.append('replyToMessageId', data.replyToMessageId);
    if (data.attachment) formData.append('attachment', data.attachment);

    const response = await apiClient.request<{ success: boolean; data: ChatMessage }>(`/chat/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: formData
    });
    return response.data;
  }

  // Utility methods
  async searchChat(query: string, type?: 'all' | 'conversations' | 'messages') {
    const searchParams = new URLSearchParams();
    searchParams.append('q', query);
    if (type) searchParams.append('type', type);

    const response = await apiClient.request<{ success: boolean; data: { conversations: ChatConversation[]; messages: ChatMessage[] } }>(`/chat/search?${searchParams.toString()}`, {
      method: 'GET'
    });
    return response.data;
  }

  async getUnreadCount() {
    const response = await apiClient.request<{ success: boolean; data: { unreadCount: number } }>('/chat/unread-count', {
      method: 'GET'
    });
    return response.data;
  }

  async getChatStats() {
    const response = await apiClient.request<{ success: boolean; data: { totalConversations: number; pendingRequests: number; messagesToday: number } }>('/chat/stats', {
      method: 'GET'
    });
    return response.data;
  }

  // Get available users for chat
  async getAvailableUsers(role?: string) {
    const searchParams = new URLSearchParams();
    if (role) searchParams.append('role', role);

    const response = await apiClient.request<{ success: boolean; data: Array<{ userId: string; name: string; role: string; email: string; avatar?: string; isOnline: boolean }> }>(`/chat/users?${searchParams.toString()}`, {
      method: 'GET'
    });
    
    // Data is already in ChatUser format from the backend
    return response.data || [];
  }

  // End conversation (PDT and BCN only)
  async endConversation(conversationId: string, reason?: string) {
    const response = await apiClient.request<{ 
      success: boolean; 
      message: string;
      data: {
        conversationId: string;
        isActive: boolean;
        endedBy: {
          userId: string;
          name: string;
          role: string;
        };
        endedAt: string;
        reason?: string;
      };
    }>(`/chat/conversations/${conversationId}/end`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        reason: reason || ''
      })
    });
    
    return response;
  }
}

export const chatAPI = new ChatAPI();