import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import type { ChatRequest, ChatConversation, ChatUser } from "../../PDT/chat/ChatTypes";
import { roleLabel, roleColor } from "../../PDT/chat/ChatTypes";
import ChatRequestDialog from "./ChatRequestDialog";
import CreateChatRequestDialog from "./CreateChatRequestDialog";
import ChatDialog from "./ChatDialog";
import ChatRequestCard from "../../../components/chat/ChatRequestCard";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { useAuth } from "../../../contexts/UseAuth";
import { chatAPI } from "../../../services/chatApi";
import type { ChatRequest as ApiChatRequest, ChatConversation as ApiChatConversation, ChatUser as ApiChatUser } from "../../../services/chatApi";
import { socketManager } from "../../../services/socketManager";
import { useToast } from "../../../components/UI/Toast";
import EmptyState from "../../../components/UI/EmptyState";

dayjs.extend(relativeTime);

type UserRole = "phong-dao-tao" | "ban-chu-nhiem" | "giang-vien" | "sinh-vien";

const ChatManagement: React.FC = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { showError, showSuccess } = useToast();
  const [activeTab, setActiveTab] = useState<"requests" | "conversations">("requests");
  const [requests, setRequests] = useState<ChatRequest[]>([]);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [query, setQuery] = useState("");
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [error, setError] = useState("");

  // Dialogs
  const [selectedRequest, setSelectedRequest] = useState<ChatRequest | null>(null);
  const [openRequestDialog, setOpenRequestDialog] = useState(false);
  const [openCreateChatRequest, setOpenCreateChatRequest] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<ChatConversation | null>(null);
  const [openChatDialog, setOpenChatDialog] = useState(false);

  // Current user for SV role
  const currentUser: ChatUser = {
    id: user?.id || "SV001",
    name: user?.name || "Sinh Viên",
    role: "sinh-vien" as const,
    isOnline: true
  };

  // API transformation functions
  const transformApiUserToLocal = useCallback((apiUser: ApiChatUser): ChatUser => ({
    id: apiUser.userId,
    name: apiUser.name,
    role: apiUser.role as UserRole,
    isOnline: apiUser.isOnline
  }), []);

  const transformApiConversationToLocal = useCallback((apiConv: ApiChatConversation): ChatConversation => ({
    id: apiConv.conversationId,
    participants: apiConv.participants.map(p => ({
      id: p.userId,
      name: p.name,
      role: p.role as UserRole,
      isOnline: true
    })),
    lastMessage: apiConv.lastMessage ? {
      id: apiConv.lastMessage.messageId,
      senderId: apiConv.lastMessage.senderId,
      content: apiConv.lastMessage.content,
      timestamp: apiConv.lastMessage.timestamp,
      type: apiConv.lastMessage.type as "text" | "file" | "system"
    } : undefined,
    updatedAt: apiConv.updatedAt,
    unreadCount: apiConv.unreadCount || 0,
    isActive: apiConv.isActive
  }), []);

  const transformApiRequestToLocal = useCallback((apiReq: ApiChatRequest): ChatRequest => ({
    id: apiReq.requestId,
    fromUser: transformApiUserToLocal(apiReq.fromUser),
    toUser: transformApiUserToLocal(apiReq.toUser),
    message: apiReq.message,
    subject: apiReq.subject,
    timestamp: apiReq.createdAt,
    status: apiReq.status,
    isAssigned: apiReq.isAssigned
  }), [transformApiUserToLocal]);

  // Load requests from backend
  const loadRequests = useCallback(async () => {
    try {
      setLoadingRequests(true);
      setError("");
      // Students should only see pending requests (not accepted/declined ones)
      const response = await chatAPI.getChatRequests({ direction: 'all', status: 'pending' });
      const transformedRequests = response.map(transformApiRequestToLocal);
      setRequests(transformedRequests);
    } catch (err) {
      console.error("Error loading requests:", err);
      setError("Không thể tải yêu cầu chat");
    } finally {
      setLoadingRequests(false);
    }
  }, [transformApiRequestToLocal]);

  // Load conversations from backend
  const loadConversations = useCallback(async () => {
    try {
      setLoadingConversations(true);
      setError("");
      const response = await chatAPI.getConversations();
      const transformedConversations = response.map(transformApiConversationToLocal);
      setConversations(transformedConversations);
    } catch (err) {
      console.error("Error loading conversations:", err);
      setError("Không thể tải cuộc trò chuyện");
    } finally {
      setLoadingConversations(false);
    }
  }, [transformApiConversationToLocal]);

  // Initial load and socket setup
  useEffect(() => {
    loadRequests();
    loadConversations();
  }, [loadRequests, loadConversations]);

  // Socket connection and event listeners
  useEffect(() => {
    if (!user) return;

    // Socket is already connected in AuthProvider, just ensure authentication
    if (!socketManager.connected) {
      socketManager.connect();
    }
    socketManager.authenticate({
      id: user.id,
      name: user.name,
      role: user.role
    });

    // Setup socket listeners
    // Listen for new chat requests
    const handleNewRequest = (...args: unknown[]) => {
      const data = args[0] as ApiChatRequest;
      const transformedRequest = transformApiRequestToLocal(data);
      setRequests(prev => [transformedRequest, ...prev]);
    };

    // Listen for new conversations
    const handleNewConversation = (...args: unknown[]) => {
      const data = args[0] as ApiChatConversation;
      const transformedConv = transformApiConversationToLocal(data);
      setConversations(prev => [transformedConv, ...prev]);
    };

    // Listen for conversation updates (new messages)
    const handleConversationUpdate = (...args: unknown[]) => {
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
    };

    // Listen for conversation end
    const handleConversationEnd = (...args: unknown[]) => {
      const data = args[0] as { conversationId: string };
      setConversations(prev => 
        prev.map(conv => 
          conv.id === data.conversationId 
            ? { ...conv, isActive: false }
            : conv
        )
      );
    };

    // Listen for request updates
    const handleRequestUpdate = (...args: unknown[]) => {
      const data = args[0] as ApiChatRequest;
      const transformedRequest = transformApiRequestToLocal(data);
      
      // If request is accepted or declined, remove it from the list
      if (transformedRequest.status === 'accepted' || transformedRequest.status === 'declined') {
        setRequests(prev => prev.filter(r => r.id !== transformedRequest.id));
        
        // If accepted, automatically switch to conversations tab to see the new chat
        if (transformedRequest.status === 'accepted') {
          setActiveTab('conversations');
          // Reload conversations to get the new one
          loadConversations();
        }
      } else {
        setRequests(prev => {
          const exists = prev.find(r => r.id === transformedRequest.id);
          if (exists) {
            // Update existing request
            return prev.map(r => r.id === transformedRequest.id ? transformedRequest : r);
          } else {
            // Add new request (in case it was just assigned to this user)
            return [transformedRequest, ...prev];
          }
        });
      }
    };

    socketManager.on('newChatRequest', handleNewRequest);
    socketManager.on('newConversation', handleNewConversation);
    socketManager.on('conversationUpdated', handleConversationUpdate);
    socketManager.on('conversationEnded', handleConversationEnd);
    socketManager.on('requestUpdated', handleRequestUpdate);

    return () => {
      socketManager.off('newChatRequest', handleNewRequest);
      socketManager.off('newConversation', handleNewConversation);
      socketManager.off('conversationUpdated', handleConversationUpdate);
      socketManager.off('conversationEnded', handleConversationEnd);
      socketManager.off('requestUpdated', handleRequestUpdate);
    };
  }, [user, transformApiRequestToLocal, transformApiConversationToLocal, loadConversations, user?.id]);

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
      req.message.toLowerCase().includes(q)
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

  const handleAcceptRequest = async (request: ChatRequest) => {
    try {
      await chatAPI.acceptChatRequest(request.id);
      showSuccess("Đã chấp nhận", "Yêu cầu chat đã được chấp nhận");
      // Request will be removed and conversation will be added via socket events
      setOpenRequestDialog(false);
      setActiveTab("conversations");
    } catch (err) {
      console.error("Error accepting request:", err);
      showError("Lỗi", "Không thể chấp nhận yêu cầu. Vui lòng thử lại");
    }
  };

  const handleDeclineRequest = async (request: ChatRequest) => {
    try {
      await chatAPI.declineChatRequest(request.id);
      showSuccess("Đã từ chối", "Yêu cầu chat đã bị từ chối");
      // Remove from local state
      setRequests(prev => prev.filter(r => r.id !== request.id));
      setOpenRequestDialog(false);
    } catch (err) {
      console.error("Error declining request:", err);
      showError("Lỗi", "Không thể từ chối yêu cầu. Vui lòng thử lại");
    }
  };

  const handleOpenConversation = (conversation: ChatConversation) => {
    setConversations(prev => 
      prev.map(c => c.id === conversation.id ? { ...c, unreadCount: 0 } : c)
    );
    setSelectedConversation(conversation);
    setOpenChatDialog(true);
  };

  const pendingCount = requests.filter(r => r.status === "pending").length;
  const conversationCount = conversations.length;
  const unreadCount = conversations.reduce((sum, conv) => sum + conv.unreadCount, 0);

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Tabs and Search */}
      <div className="flex flex-col gap-3 sm:gap-4">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg overflow-x-auto touch-manipulation">
          <button
            onClick={() => setActiveTab("requests")}
            className={`px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition whitespace-nowrap ${
              activeTab === "requests"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Yêu cầu chat ({pendingCount})
          </button>
          <button
            onClick={() => setActiveTab("conversations")}
            className={`px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition whitespace-nowrap ${
              activeTab === "conversations"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Cuộc trò chuyện ({conversationCount})
            {unreadCount > 0 && (
              <span className="ml-1 w-4 h-4 sm:w-5 sm:h-5 bg-red-500 text-white rounded-full inline-flex items-center justify-center text-[10px] sm:text-xs">
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          <div className="relative flex-1 sm:flex-initial">
            <span className="absolute inset-y-0 left-3 flex items-center text-gray-400">
              <svg viewBox="0 0 24 24" className="h-4 w-4">
                <path fill="currentColor" d="M10 2a8 8 0 1 1-5.3 13.9l-3.4 3.4 1.4 1.4 3.4-3.4A8 8 0 0 1 10 2m0 2a6 6 0 1 0 0 12A6 6 0 0 0 10 4z"/>
              </svg>
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm kiếm..."
              className="w-full sm:w-[300px] h-10 rounded-lg border border-gray-300 bg-white pl-9 pr-3 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 touch-manipulation"
            />
          </div>
          
          <button
            onClick={() => setOpenCreateChatRequest(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm whitespace-nowrap touch-manipulation"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4">
              <path fill="currentColor" d="M19 11h-6V5h-2v6H5v2h6v6h2v-6h6z"/>
            </svg>
            Gửi yêu cầu hỗ trợ
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 shadow-sm">
        {/* Error message */}
        {error && (
          <div className="p-4 bg-red-50 border-b border-red-200">
            <div className="text-sm text-red-800">{error}</div>
          </div>
        )}

        {activeTab === "requests" ? (
          <div className="divide-y divide-gray-100">
            {loadingRequests ? (
              <div className="p-8 text-center text-gray-500">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
                <div>Đang tải yêu cầu...</div>
              </div>
            ) : filteredRequests.length === 0 ? (
              <EmptyState
                icon={requests.length === 0 ? "💬" : "🔍"}
                title={requests.length === 0 ? "Không có yêu cầu chat nào" : "Không tìm thấy yêu cầu"}
                description={
                  requests.length === 0
                    ? "Các yêu cầu chat sẽ hiển thị ở đây"
                    : "Thử tìm kiếm với từ khóa khác"
                }
                action={
                  requests.length === 0
                    ? { label: "Tạo yêu cầu mới", onClick: () => setOpenCreateChatRequest(true) }
                    : undefined
                }
              />
            ) : (
              filteredRequests.map((request) => (
                <ChatRequestCard
                  key={request.id}
                  request={request}
                  currentUserId={currentUser.id}
                  currentUserRole={currentUser.role}
                  onAccept={handleAcceptRequest}
                  onDecline={handleDeclineRequest}
                  onClick={() => { setSelectedRequest(request); setOpenRequestDialog(true); }}
                  showActions={true}
                />
              ))
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {loadingConversations ? (
              <div className="p-8 text-center text-gray-500">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
                <div>Đang tải cuộc trò chuyện...</div>
              </div>
            ) : filteredConversations.length === 0 ? (
              <EmptyState
                icon={conversations.length === 0 ? "💬" : "🔍"}
                title={conversations.length === 0 ? "Chưa có cuộc trò chuyện nào" : "Không tìm thấy cuộc trò chuyện"}
                description={
                  conversations.length === 0
                    ? "Gửi yêu cầu hỗ trợ hoặc chấp nhận yêu cầu chat"
                    : "Thử tìm kiếm với từ khóa khác"
                }
                action={
                  conversations.length === 0
                    ? { label: "Tạo yêu cầu mới", onClick: () => setOpenCreateChatRequest(true) }
                    : undefined
                }
              />
            ) : (
              filteredConversations.map((conversation) => (
                <div key={conversation.id} className="p-3 sm:p-4 hover:bg-gray-50 cursor-pointer touch-manipulation"
                     onClick={() => handleOpenConversation(conversation)}>
                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs sm:text-sm font-medium">
                        {conversation.participants.find(p => p.role !== "sinh-vien")?.name.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 sm:gap-2 mb-1 flex-wrap">
                        {conversation.participants.filter(p => p.role !== "sinh-vien").map(participant => (
                          <React.Fragment key={participant.id}>
                            <span className="font-medium text-sm sm:text-base text-gray-900 truncate">{participant.name}</span>
                            <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium ${roleColor[participant.role]}`}>
                              {roleLabel[participant.role]}
                            </span>
                            {participant.isOnline && (
                              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full"></span>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                      {conversation.lastMessage && (
                        <p className="text-gray-600 text-xs sm:text-sm line-clamp-1 mb-1">
                          {conversation.lastMessage.content}
                        </p>
                      )}
                      <div className="text-[10px] sm:text-xs text-gray-500">
                        {dayjs(conversation.updatedAt).fromNow()}
                      </div>
                    </div>
                    {conversation.unreadCount > 0 && (
                      <div className="w-4 h-4 sm:w-5 sm:h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px] sm:text-xs font-medium flex-shrink-0">
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
      />

      <CreateChatRequestDialog
        open={openCreateChatRequest}
        onClose={() => setOpenCreateChatRequest(false)}
        onRequestSent={(newRequest: ChatRequest) => {
          // Add the new request to the list immediately
          setRequests(prev => [newRequest, ...prev]);
        }}
      />

      <ChatDialog
        open={openChatDialog}
        onClose={() => setOpenChatDialog(false)}
        conversation={selectedConversation}
        currentUser={currentUser}
        onConversationEnded={loadConversations}
      />
    </div>
  );
};

export default ChatManagement;

