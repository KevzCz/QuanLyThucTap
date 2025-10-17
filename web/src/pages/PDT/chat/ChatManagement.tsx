import React, { useState, useEffect, useMemo, useCallback } from "react";
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
  const [activeTab, setActiveTab] = useState<"requests" | "conversations">("requests");
  const [requestType, setRequestType] = useState<"incoming" | "outgoing" | "all">("incoming");
  const [assignmentFilter, setAssignmentFilter] = useState<"all" | "unassigned" | "assigned-to-me">("all");
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

  const loadRequests = useCallback(async (direction: "incoming" | "outgoing" | "all" = "incoming") => {
    try {
      setLoadingRequests(true);
      const apiRequestParams: Parameters<typeof chatAPI.getChatRequests>[0] = { 
        status: 'pending',
        direction 
      };

      // For incoming requests, we can also filter by assignment status on the server
      if (direction === "incoming") {
        if (assignmentFilter === "unassigned") {
          apiRequestParams.isAssigned = false;
        } else if (assignmentFilter === "assigned-to-me") {
          // Let the server filter based on user role and assignment
          apiRequestParams.isAssigned = true;
        }
        // For "all", we don't set isAssigned filter - let server handle it
      }

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
  }, [assignmentFilter]);

  // Load initial data
  useEffect(() => {
    loadRequests(requestType);
    loadConversations();
  }, [requestType, assignmentFilter, loadRequests]);

  // Set up Socket.io connection  
  useEffect(() => {
    if (user) {
      socketManager.connect();
      socketManager.authenticate({
        id: user.id,
        name: user.name,
        role: user.role
      });

      // Listen for new requests
      socketManager.on('newChatRequest', (...args: unknown[]) => {
        const request = args[0] as ApiRequest;
        const transformedRequest = transformApiRequestToLocal(request);
        setRequests(prev => [transformedRequest, ...prev]);
      });

      // Listen for PDT-specific requests
      socketManager.on('newPDTRequest', (...args: unknown[]) => {
        const request = args[0] as ApiRequest;
        const transformedRequest = transformApiRequestToLocal(request);
        setRequests(prev => [transformedRequest, ...prev]);
      });

      // Listen for request updates
      socketManager.on('requestUpdated', (...args: unknown[]) => {
        console.log('🔄 Received requestUpdated event:', args);
        const request = args[0] as ApiRequest;
        const transformedRequest = transformApiRequestToLocal(request);
        console.log('🔄 Transformed updated request:', transformedRequest);
        setRequests(prev => {
          const updated = prev.map(r => 
            r.id === request.requestId ? transformedRequest : r
          );
          console.log('🔄 Updated requests list:', updated.length, 'items');
          return updated;
        });
      });

      // Listen for new conversations
      socketManager.on('newConversation', (...args: unknown[]) => {
        const conversation = args[0] as ApiConversation;
        const transformedConversation = transformApiConversationToLocal(conversation);
        setConversations(prev => [transformedConversation, ...prev]);
      });

      return () => {
        socketManager.off('newChatRequest');
        socketManager.off('newPDTRequest'); 
        socketManager.off('requestUpdated');
        socketManager.off('newConversation');
      };
    }
  }, [user]);

  const loadConversations = async () => {
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
  };

  const filteredRequests = useMemo(() => {
    const q = query.trim().toLowerCase();
    let filtered = requests;
    
    // Filter based on request type
    if (requestType === "incoming") {
      // Show only requests that are not own requests
      filtered = filtered.filter(req => req.fromUser.id !== currentUser.id);
      
      // Apply assignment filter for incoming requests
      if (assignmentFilter === "unassigned") {
        filtered = filtered.filter(req => !req.isAssigned);
      } else if (assignmentFilter === "assigned-to-me") {
        filtered = filtered.filter(req => req.assignedTo?.id === currentUser.id);
      } else {
        // "all" - show unassigned OR assigned to current user (exclude assigned to others)
        filtered = filtered.filter(req => 
          !req.isAssigned || req.assignedTo?.id === currentUser.id
        );
      }
    } else if (requestType === "outgoing") {
      // Show only own requests
      filtered = filtered.filter(req => req.fromUser.id === currentUser.id);
    } else if (requestType === "all") {
      // For "all" tab, show:
      // 1. Own requests (outgoing)
      // 2. Requests assigned to current user
      // 3. Unassigned incoming requests (not from current user)
      filtered = filtered.filter(req => 
        req.fromUser.id === currentUser.id || // Own requests
        req.assignedTo?.id === currentUser.id || // Assigned to me
        (!req.isAssigned && req.fromUser.id !== currentUser.id) // Unassigned incoming
      );
    }
    
    if (q) {
      filtered = filtered.filter(req => 
        req.fromUser.name.toLowerCase().includes(q) ||
        req.message.toLowerCase().includes(q) ||
        (req.subject && req.subject.toLowerCase().includes(q))
      );
    }
    
    return filtered;
  }, [requests, query, currentUser.id, requestType, assignmentFilter]);

  const filteredConversations = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter(conv => 
      conv.participants.some(p => p.name.toLowerCase().includes(q)) ||
      conv.lastMessage?.content.toLowerCase().includes(q)
    );
  }, [conversations, query]);

  const handleBindRequest = async (request: ChatRequest) => {
    try {
      const result = await chatAPI.assignChatRequest(request.id, currentUser.id);
      
      // Use server response instead of local optimistic update
      if (result.success && result.data) {
        const updatedRequest = transformApiRequestToLocal(result.data as ApiRequest);
        setRequests(prev => prev.map(r => 
          r.id === request.id ? updatedRequest : r
        ));
      }
      
      // Close dialog if open
      if (selectedRequest?.id === request.id) {
        setOpenRequestDialog(false);
        setSelectedRequest(null);
      }

      // Refresh all incoming requests to show proper assignment status
      try {
        const allIncoming = await chatAPI.getChatRequests({ direction: 'incoming', status: 'pending' });
        const transformed = (allIncoming || []).map(transformApiRequestToLocal);
        
        setRequests(prev => {
          // Keep outgoing requests (user's own requests), replace all incoming
          const outgoing = prev.filter(r => r.fromUser.id === currentUser.id);
          return [...transformed, ...outgoing];
        });
      } catch (e) {
        console.warn('Failed to refresh requests after assign', e);
      }
      
    } catch (error) {
      console.error('Error assigning chat request:', error);
      setError('Không thể phân công yêu cầu chat');
    }
  };

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
  const assignedToMeCount = requests.filter(r => r.assignedTo?.id === currentUser.id).length;

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
                    loadRequests(requestType);
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
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab("requests")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${
              activeTab === "requests"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Yêu cầu chat ({pendingCount})
            {assignedToMeCount > 0 && (
              <span className="ml-1 bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                {assignedToMeCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("conversations")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${
              activeTab === "conversations"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Cuộc trò chuyện ({totalConversations})
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <span className="absolute inset-y-0 left-3 flex items-center text-gray-400">
              <svg viewBox="0 0 24 24" className="h-4 w-4">
                <path fill="currentColor" d="M10 2a8 8 0 1 1-5.3 13.9l-3.4 3.4 1.4 1.4 3.4-3.4A8 8 0 0 1 10 2m0 2a6 6 0 1 0 0 12A6 6 0 0 0 10 4z"/>
              </svg>
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm kiếm..."
              className="w-[300px] h-10 rounded-lg border border-gray-300 bg-white pl-8 pr-3 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <button
            onClick={() => setOpenCreateChat(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4">
              <path fill="currentColor" d="M19 11h-6V5h-2v6H5v2h6v6h2v-6h6z"/>
            </svg>
            Tạo chat mới
          </button>
        </div>
      </div>

      {/* Request Type Filter - Only show when on requests tab */}
      {activeTab === "requests" && (
        <div className="space-y-2">
          <div className="flex gap-2 bg-gray-50 p-2 rounded-lg">
            <button
              onClick={() => {
                setRequestType("incoming");
                loadRequests("incoming");
              }}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                requestType === "incoming"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Đến ({requests.filter(r => r.fromUser.id !== user?.id).length})
            </button>
            <button
              onClick={() => {
                setRequestType("outgoing");
                loadRequests("outgoing");
              }}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                requestType === "outgoing"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Đi ({requests.filter(r => r.fromUser.id === user?.id).length})
            </button>
            <button
              onClick={() => {
                setRequestType("all");
                loadRequests("all");
              }}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                requestType === "all"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Tất cả ({requests.length})
            </button>
          </div>

          {/* Assignment Filter - Only show for incoming requests */}
          {requestType === "incoming" && (
            <div className="flex gap-2 bg-blue-50 p-2 rounded-lg">
              <span className="px-2 py-1.5 text-sm font-medium text-gray-700">
                Trạng thái phân công:
              </span>
              <button
                onClick={() => setAssignmentFilter("all")}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                  assignmentFilter === "all"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Tất cả có thể xử lý
              </button>
              <button
                onClick={() => setAssignmentFilter("unassigned")}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                  assignmentFilter === "unassigned"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Chưa có ai nhận ({requests.filter(r => r.fromUser.id !== currentUser.id && !r.isAssigned).length})
              </button>
              <button
                onClick={() => setAssignmentFilter("assigned-to-me")}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                  assignmentFilter === "assigned-to-me"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Đã nhận xử lý ({requests.filter(r => r.assignedTo?.id === currentUser.id).length})
              </button>
            </div>
          )}
        </div>
      )}

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
                <div className="text-sm">
                  {requestType === "incoming" 
                    ? "Các yêu cầu chat đến sẽ hiển thị ở đây"
                    : requestType === "outgoing"
                    ? "Các yêu cầu chat bạn gửi sẽ hiển thị ở đây"
                    : "Các yêu cầu chat sẽ hiển thị ở đây"
                  }
                </div>
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
                  onAssign={handleBindRequest}
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
                <div className="font-medium">Đang tải...</div>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <div className="text-4xl mb-2">💬</div>
                <div className="font-medium">Chưa có cuộc trò chuyện nào</div>
                <div className="text-sm">Bắt đầu cuộc trò chuyện mới hoặc chấp nhận yêu cầu chat</div>
              </div>
            ) : (
              filteredConversations.map((conversation) => (
                <div key={conversation.id} className="p-4 hover:bg-gray-50 cursor-pointer"
                     onClick={() => handleOpenConversation(conversation)}>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                      <span className="text-sm font-medium">
                        {conversation.participants.find(p => p.role !== "phong-dao-tao")?.name.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {conversation.participants.filter(p => p.role !== "phong-dao-tao").map(participant => (
                          <React.Fragment key={participant.id}>
                            <span className="font-medium text-gray-900">{participant.name}</span>
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
                        <p className="text-gray-600 text-sm line-clamp-1 mb-1">
                          {conversation.lastMessage.content}
                        </p>
                      )}
                      <div className="text-xs text-gray-500">
                        {dayjs(conversation.updatedAt).fromNow()}
                      </div>
                    </div>
                    {conversation.unreadCount > 0 && (
                      <div className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-medium">
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
        onBind={handleBindRequest}
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

