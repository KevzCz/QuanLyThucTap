import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import type { ChatRequest, ChatConversation, UserRole} from "./ChatTypes";
import { roleLabel, roleColor } from "./ChatTypes";
import { chatAPI } from "../../../services/chatApi";
import { socketManager } from "../../../services/socketManager";
import { useAuth } from "../../../contexts/UseAuth";
import ChatRequestCard from "../../../components/chat/ChatRequestCard";
import ChatRequestDialog from "./ChatRequestDialog";
import CreateChatDialog from "./CreateChatDialog";
import ChatDialog from "./ChatDialog";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

// API Response interfaces
interface ApiUser {
  userId: string;
  name: string;
  role: string;
  isOnline: boolean;
  avatar?: string;
}

interface ApiRequest {
  requestId: string;
  fromUser: ApiUser;
  toUser?: ApiUser;
  subject?: string; // Made optional to match API
  message: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  department?: string;
  assignedPDT?: ApiUser;
}

interface ApiParticipant {
  userId: string;
  name: string;
  role: string;
  joinedAt: string;
  avatar?: string;
}

interface ApiConversation {
  conversationId: string;
  participants: ApiParticipant[];
  lastMessage?: {
    messageId: string;
    senderId: string;
    senderName: string;
    content: string;
    timestamp?: string;
    sentAt?: string;
    type?: string;
  };
  createdAt: string;
  updatedAt: string;
  unreadCount?: number;
  isActive?: boolean;
}

// Transform API types to match existing component expectations  
const transformApiRequestToLocal = (apiRequest: ApiRequest): ChatRequest => ({
  id: apiRequest.requestId,
  fromUser: {
    id: apiRequest.fromUser.userId,
    name: apiRequest.fromUser.name,
    role: apiRequest.fromUser.role as UserRole,
    isOnline: apiRequest.fromUser.isOnline,
    avatar: apiRequest.fromUser.avatar
  },
  toUser: apiRequest.toUser ? {
    id: apiRequest.toUser.userId,
    name: apiRequest.toUser.name,
    role: apiRequest.toUser.role as UserRole,
    isOnline: apiRequest.toUser.isOnline,
    avatar: apiRequest.toUser.avatar
  } : undefined,
  message: apiRequest.message,
  subject: apiRequest.subject,
  timestamp: apiRequest.createdAt,
  status: apiRequest.status as "pending" | "accepted" | "declined" | "expired" | "cancelled",
  assignedTo: apiRequest.assignedPDT ? {
    id: apiRequest.assignedPDT.userId,
    name: apiRequest.assignedPDT.name,
    role: apiRequest.assignedPDT.role as UserRole,
    isOnline: true,
    avatar: apiRequest.assignedPDT.avatar
  } : undefined,
  isAssigned: !!apiRequest.assignedPDT
});

const transformApiConversationToLocal = (apiConv: ApiConversation): ChatConversation => ({
  id: apiConv.conversationId,
  participants: apiConv.participants.map((p: ApiParticipant) => ({
    id: p.userId,
    name: p.name,
    role: p.role as UserRole,
    isOnline: true, // Will be updated by Socket.io
    avatar: p.avatar
  })),
  lastMessage: apiConv.lastMessage ? {
    id: apiConv.lastMessage.messageId,
    senderId: apiConv.lastMessage.senderId,
    content: apiConv.lastMessage.content,
    timestamp: apiConv.lastMessage.timestamp || apiConv.lastMessage.sentAt || new Date().toISOString(),
    type: (apiConv.lastMessage.type as "text" | "file" | "system") || "text"
  } : undefined,
  updatedAt: apiConv.updatedAt,
  unreadCount: apiConv.unreadCount || 0,
  isActive: apiConv.isActive ?? true
});

const ChatManagement: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<"requests" | "conversations">("requests");
  const [requests, setRequests] = useState<ChatRequest[]>([]);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [query, setQuery] = useState("");
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { user } = useAuth();

  // Current PDT user
  const currentUser = user ? { 
    id: user.id, 
    name: user.name, 
    role: "phong-dao-tao" as const, 
    isOnline: true 
  } : { id: "PDT001", name: "TS. Lê Thị B", role: "phong-dao-tao" as const, isOnline: true };

  // Dialogs
  const [selectedRequest, setSelectedRequest] = useState<ChatRequest | null>(null);
  const [openRequestDialog, setOpenRequestDialog] = useState(false);
  const [openCreateChat, setOpenCreateChat] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<ChatConversation | null>(null);
  const [openChatDialog, setOpenChatDialog] = useState(false);

  const loadRequests = useCallback(async () => {
    try {
      setLoadingRequests(true);
      const apiRequestParams: Parameters<typeof chatAPI.getChatRequests>[0] = { 
        status: 'pending',
        direction: 'all'
      };

      const apiRequests = await chatAPI.getChatRequests(apiRequestParams);
      // Since chatAPI returns ApiRequest[] from server, we need to transform each one
      const transformedRequests = (apiRequests as ApiRequest[])?.map(transformApiRequestToLocal) || [];
      setRequests(transformedRequests);
    } catch (error) {
      console.error('Error loading chat requests:', error);
      setError('Không thể tải danh sách yêu cầu chat');
    } finally {
      setLoadingRequests(false);
    }
  }, []);

  const loadConversations = useCallback(async () => {
    try {
      setLoadingConversations(true);
      const apiConversations = await chatAPI.getConversations({ isActive: true });
      const transformedConversations = (apiConversations as ApiConversation[])?.map(transformApiConversationToLocal) || [];
      setConversations(transformedConversations);
    } catch (error) {
      console.error('Error loading conversations:', error);
      setError('Không thể tải danh sách cuộc trò chuyện');
    } finally {
      setLoadingConversations(false);
    }
  }, []);

  // Load initial data
  useEffect(() => {
    loadRequests();
    loadConversations();
  }, [loadRequests, loadConversations]);

  // Set up Socket.io connection  
  useEffect(() => {
    if (user) {
      // Socket is already connected in AuthProvider, just ensure authentication
      if (!socketManager.connected) {
        socketManager.connect();
      }
      socketManager.authenticate({
        id: user.id,
        name: user.name,
        role: user.role
      });

      // Listen for new requests
      socketManager.on('newChatRequest', (...args: unknown[]) => {
        const request = args[0] as ApiRequest;
        const transformedRequest = transformApiRequestToLocal(request);
        
        // Don't add requests that the current user sent (they're already added via callback)
        if (transformedRequest.fromUser.id === user?.id) {
          return;
        }
        
        setRequests(prev => [transformedRequest, ...prev]);
      });

      // Listen for PDT-specific requests
      socketManager.on('newPDTRequest', (...args: unknown[]) => {
        const request = args[0] as ApiRequest;
        const transformedRequest = transformApiRequestToLocal(request);
        
        // Don't add requests that the current user sent (they're already added via callback)
        if (transformedRequest.fromUser.id === user?.id) {
          return;
        }
        
        setRequests(prev => [transformedRequest, ...prev]);
      });

      // Listen for request updates
      socketManager.on('requestUpdated', (...args: unknown[]) => {
        const request = args[0] as ApiRequest;
        const transformedRequest = transformApiRequestToLocal(request);
        
        // If request is accepted or declined, remove it from the list
        if (transformedRequest.status === 'accepted' || transformedRequest.status === 'declined') {
          setRequests(prev => prev.filter(r => r.id !== transformedRequest.id));
        } else {
          setRequests(prev => {
            const exists = prev.find(r => r.id === transformedRequest.id);
            if (exists) {
              // Update existing request
              return prev.map(r => 
                r.id === transformedRequest.id ? transformedRequest : r
              );
            } else {
              // Add new request (in case it was just assigned to this user)
              return [transformedRequest, ...prev];
            }
          });
        }
      });

      // Listen for new conversations
      socketManager.on('newConversation', (...args: unknown[]) => {
        const conversation = args[0] as ApiConversation;
        const transformedConversation = transformApiConversationToLocal(conversation);
        setConversations(prev => [transformedConversation, ...prev]);
      });

      // Listen for conversation updates (new messages)
      socketManager.on('conversationUpdated', (...args: unknown[]) => {
        const data = args[0] as { conversationId: string; lastMessage?: { messageId: string; senderId: string; content: string; timestamp: string; type: string }; updatedAt: string };
        setConversations(prev => {
          const updatedConversations = prev.map(conv => 
            conv.id === data.conversationId 
              ? { 
                  ...conv, 
                  lastMessage: data.lastMessage ? {
                    id: data.lastMessage.messageId,
                    senderId: data.lastMessage.senderId,
                    content: data.lastMessage.content,
                    timestamp: data.lastMessage.timestamp,
                    type: data.lastMessage.type as "text" | "file" | "system"
                  } : undefined,
                  updatedAt: data.updatedAt,
                  // Only increment unread count if the message is from someone else
                  unreadCount: data.lastMessage && data.lastMessage.senderId !== user?.id 
                    ? (conv.unreadCount || 0) + 1 
                    : conv.unreadCount
                }
              : conv
          );
          
          // Sort conversations by updatedAt (most recent first)
          return updatedConversations.sort((a, b) => 
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          );
        });
      });

      // Listen for conversation end
      socketManager.on('conversationEnded', (...args: unknown[]) => {
        const data = args[0] as { conversationId: string };
        setConversations(prev => 
          prev.map(conv => 
            conv.id === data.conversationId 
              ? { ...conv, isActive: false }
              : conv
          )
        );
      });

      return () => {
        socketManager.off('newChatRequest');
        socketManager.off('newPDTRequest'); 
        socketManager.off('requestUpdated');
        socketManager.off('newConversation');
        socketManager.off('conversationUpdated');
        socketManager.off('conversationEnded');
      };
    }
  }, [user, user?.id]);

  // Handle opening conversation from URL parameter (from notifications)
  useEffect(() => {
    const conversationId = searchParams.get('conversation');
    if (conversationId && conversations.length > 0) {
      const conversation = conversations.find(c => c.id === conversationId);
      if (conversation) {
        setActiveTab('conversations');
        setSelectedConversation(conversation);
        setOpenChatDialog(true);
        // Clear the URL parameter
        setSearchParams({});
      }
    }
  }, [searchParams, conversations, setSearchParams]);

  const filteredRequests = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return requests;
    return requests.filter(req => 
      req.fromUser.name.toLowerCase().includes(q) ||
      req.message.toLowerCase().includes(q) ||
      (req.subject && req.subject.toLowerCase().includes(q))
    );
  }, [requests, query]);

  const filteredConversations = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter(conv => 
      conv.participants.some(p => p.name.toLowerCase().includes(q)) ||
      conv.lastMessage?.content.toLowerCase().includes(q)
    );
  }, [conversations, query]);

  const handleAcceptRequest = async (request: ChatRequest, responseMessage?: string) => {
    try {
      const result = await chatAPI.acceptChatRequest(request.id, responseMessage);
      
      // Update local state
      setRequests(prev => prev.filter(r => r.id !== request.id));
      
      // Add new conversation if created
      if (result.data && result.data.conversation) {
        const newConversation = transformApiConversationToLocal(result.data.conversation as ApiConversation);
        setConversations(prev => [newConversation, ...prev]);
        
        // Open the new conversation
        setSelectedConversation(newConversation);
        setOpenChatDialog(true);
      }
      
      setOpenRequestDialog(false);
      setSelectedRequest(null);
    } catch (error) {
      console.error('Error accepting chat request:', error);
      setError('Không thể chấp nhận yêu cầu chat');
    }
  };

  const handleDeclineRequest = async (request: ChatRequest, responseMessage?: string) => {
    try {
      await chatAPI.declineChatRequest(request.id, responseMessage);
      
      // Update local state
      setRequests(prev => prev.map(r => 
        r.id === request.id ? { ...r, status: 'declined' as const } : r
      ));
      
      setOpenRequestDialog(false);
      setSelectedRequest(null);
    } catch (error) {
      console.error('Error declining chat request:', error);
      setError('Không thể từ chối yêu cầu chat');
    }
  };

  const handleRevokeRequest = async (request: ChatRequest) => {
    try {
      await chatAPI.declineChatRequest(request.id); // Using decline API for revoke
      setRequests(prev => prev.filter(r => r.id !== request.id));
      setOpenRequestDialog(false);
      setSelectedRequest(null);
    } catch (error) {
      console.error('Error revoking request:', error);
      setError('Không thể hủy yêu cầu');
    }
  };

  const handleCreateConversation = async (conversation: ChatConversation) => {
    try {
      // The conversation is already created by CreateChatDialog, just add it to state
      setConversations(prev => [conversation, ...prev]);
      
      setOpenCreateChat(false);
      setSelectedConversation(conversation);
      setOpenChatDialog(true);
    } catch (error) {
      console.error('Error handling conversation:', error);
      setError('Không thể tạo cuộc trò chuyện');
    }
  };

  const handleOpenConversation = (conversation: ChatConversation) => {
    // Mark as read
    setConversations(prev => 
      prev.map(c => c.id === conversation.id ? { ...c, unreadCount: 0 } : c)
    );
    setSelectedConversation(conversation);
    setOpenChatDialog(true);
  };

  const pendingCount = filteredRequests.filter(r => r.status === "pending").length;
  const totalConversations = conversations.length;

  return (
    <div className="space-y-4">
      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Có lỗi xảy ra</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    loadRequests();
                    loadConversations();
                  }}
                  className="bg-red-50 text-red-800 rounded-md px-2 py-1.5 text-sm font-medium hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Thử lại
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs and Search */}
      <div className="flex flex-col gap-3">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-full sm:w-auto">
          <button
            onClick={() => setActiveTab("requests")}
            className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition touch-manipulation ${
              activeTab === "requests"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <span className="hidden sm:inline">Yêu cầu chat ({pendingCount})</span>
            <span className="sm:hidden">YC ({pendingCount})</span>
          </button>
          <button
            onClick={() => setActiveTab("conversations")}
            className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition touch-manipulation ${
              activeTab === "conversations"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <span className="hidden sm:inline">Cuộc trò chuyện ({totalConversations})</span>
            <span className="sm:hidden">Chat ({totalConversations})</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-3 flex items-center text-gray-400">
              <svg viewBox="0 0 24 24" className="h-4 w-4">
                <path fill="currentColor" d="M10 2a8 8 0 1 1-5.3 13.9l-3.4 3.4 1.4 1.4 3.4-3.4A8 8 0 0 1 10 2m0 2a6 6 0 1 0 0 12A6 6 0 0 0 10 4z"/>
              </svg>
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm kiếm..."
              className="w-full sm:w-[300px] h-10 rounded-lg border border-gray-300 bg-white pl-8 pr-3 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <button
            onClick={() => setOpenCreateChat(true)}
            className="inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm touch-manipulation"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4">
              <path fill="currentColor" d="M19 11h-6V5h-2v6H5v2h6v6h2v-6h6z"/>
            </svg>
            <span className="hidden sm:inline">Tạo chat mới</span>
            <span className="sm:hidden">Tạo mới</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
        {activeTab === "requests" ? (
          <div className="divide-y divide-gray-100">
            {loadingRequests ? (
              <div className="p-8 text-center text-gray-500">
                <div className="text-4xl mb-2">⏳</div>
                <div className="font-medium">Đang tải...</div>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <div className="text-4xl mb-2">💬</div>
                <div className="font-medium">Không có yêu cầu chat nào</div>
                <div className="text-sm">Các yêu cầu chat sẽ hiển thị ở đây</div>
              </div>
            ) : (
              filteredRequests.map((request) => (
                <ChatRequestCard
                  key={request.id}
                  request={request}
                  currentUserId={user?.id || ""}
                  currentUserRole="phong-dao-tao"
                  onAccept={handleAcceptRequest}
                  onDecline={handleDeclineRequest}
                  onClick={(request) => {
                    setSelectedRequest(request);
                    setOpenRequestDialog(true);
                  }}
                />
              ))
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {loadingConversations ? (
              <div className="p-8 text-center text-gray-500">
                <div className="text-4xl mb-2">⏳</div>
                <div className="font-medium text-sm sm:text-base">Đang tải...</div>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <div className="text-4xl mb-2">💬</div>
                <div className="font-medium text-sm sm:text-base">Chưa có cuộc trò chuyện nào</div>
                <div className="text-xs sm:text-sm">Bắt đầu cuộc trò chuyện mới hoặc chấp nhận yêu cầu chat</div>
              </div>
            ) : (
              filteredConversations.map((conversation) => (
                <div key={conversation.id} className="p-3 sm:p-4 hover:bg-gray-50 cursor-pointer touch-manipulation"
                     onClick={() => handleOpenConversation(conversation)}>
                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs sm:text-sm font-medium">
                        {conversation.participants.find(p => p.role !== "phong-dao-tao")?.name.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {conversation.participants.filter(p => p.role !== "phong-dao-tao").map(participant => (
                          <React.Fragment key={participant.id}>
                            <span className="font-medium text-gray-900 text-xs sm:text-sm">{participant.name}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleColor[participant.role]}`}>
                              {roleLabel[participant.role]}
                            </span>
                            {participant.isOnline && (
                              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                      {conversation.lastMessage && (
                        <p className="text-gray-600 text-xs sm:text-sm line-clamp-1 mb-1">
                          {conversation.lastMessage.content}
                        </p>
                      )}
                      <div className="text-xs text-gray-500">
                        {dayjs(conversation.updatedAt).fromNow()}
                      </div>
                    </div>
                    {conversation.unreadCount > 0 && (
                      <div className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0">
                        {conversation.unreadCount}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <ChatRequestDialog
        open={openRequestDialog}
        onClose={() => setOpenRequestDialog(false)}
        request={selectedRequest}
        onAccept={handleAcceptRequest}
        onDecline={handleDeclineRequest}
        onRevoke={handleRevokeRequest}
        currentUser={currentUser}
      />

      <CreateChatDialog
        open={openCreateChat}
        onClose={() => setOpenCreateChat(false)}
        onCreateConversation={handleCreateConversation}
      />

      <ChatDialog
        open={openChatDialog}
        onClose={() => setOpenChatDialog(false)}
        conversation={selectedConversation}
        currentUser={currentUser}
        onConversationEnded={() => {
          // Refresh conversations list after ending
          loadConversations();
          // Close chat dialog
          setOpenChatDialog(false);
        }}
      />
    </div>
  );
};

export default ChatManagement;

