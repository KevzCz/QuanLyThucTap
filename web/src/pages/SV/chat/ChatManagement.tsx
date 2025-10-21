import React, { useState, useMemo, useEffect, useCallback } from "react";
import type { ChatRequest, ChatConversation, ChatUser } from "../../PDT/chat/ChatTypes";
import { roleLabel, roleColor } from "../../PDT/chat/ChatTypes";
import ChatRequestDialog from "./ChatRequestDialog";
import CreateChatRequestDialog from "./CreateChatRequestDialog";
import ChatDialog from "./ChatDialog";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { useAuth } from "../../../contexts/UseAuth";
import { chatAPI } from "../../../services/chatApi";
import type { ChatRequest as ApiChatRequest, ChatConversation as ApiChatConversation, ChatUser as ApiChatUser } from "../../../services/chatApi";
import { socketManager } from "../../../services/socketManager";

dayjs.extend(relativeTime);

type UserRole = "phong-dao-tao" | "ban-chu-nhiem" | "giang-vien" | "sinh-vien";

const ChatManagement: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"requests" | "conversations">("requests");
  const [requests, setRequests] = useState<ChatRequest[]>([]);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [query, setQuery] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [loadingRequests, setLoadingRequests] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [loadingConversations, setLoadingConversations] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

    // Connect and authenticate socket
    socketManager.connect();
    socketManager.authenticate({
      id: user.id,
      name: user.name,
      role: user.role
    });

    // Setup socket listeners
    // Listen for new chat requests
    const handleNewRequest = (...args: unknown[]) => {
      const data = args[0] as ApiChatRequest;
      console.log('New chat request received:', data);
      const transformedRequest = transformApiRequestToLocal(data);
      setRequests(prev => [transformedRequest, ...prev]);
    };

    // Listen for new conversations
    const handleNewConversation = (...args: unknown[]) => {
      const data = args[0] as ApiChatConversation;
      console.log('New conversation created:', data);
      const transformedConv = transformApiConversationToLocal(data);
      setConversations(prev => [transformedConv, ...prev]);
    };

    // Listen for conversation updates (new messages)
    const handleConversationUpdate = (...args: unknown[]) => {
      const data = args[0] as { conversationId: string; lastMessage?: { messageId: string; senderId: string; content: string; timestamp: string; type: string }; updatedAt: string };
      console.log('Conversation updated:', data.conversationId);
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
      console.log('Conversation ended:', data.conversationId);
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
      console.log('Request updated:', data);
      const transformedRequest = transformApiRequestToLocal(data);
      
      // If request is accepted or declined, remove it from the list
      if (transformedRequest.status === 'accepted' || transformedRequest.status === 'declined') {
        console.log('Removing request from list:', transformedRequest.id);
        setRequests(prev => prev.filter(r => r.id !== transformedRequest.id));
        
        // If accepted, automatically switch to conversations tab to see the new chat
        if (transformedRequest.status === 'accepted') {
          console.log('Request accepted, switching to conversations tab');
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
      
      // Request will be removed and conversation will be added via socket events
      setOpenRequestDialog(false);
      setActiveTab("conversations");
    } catch (err) {
      console.error("Error accepting request:", err);
      alert("Không thể chấp nhận yêu cầu. Vui lòng thử lại.");
    }
  };

  const handleDeclineRequest = async (request: ChatRequest) => {
    try {
      await chatAPI.declineChatRequest(request.id);
      
      // Remove from local state
      setRequests(prev => prev.filter(r => r.id !== request.id));
      setOpenRequestDialog(false);
    } catch (err) {
      console.error("Error declining request:", err);
      alert("Không thể từ chối yêu cầu. Vui lòng thử lại.");
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
    <div className="space-y-4">
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
          </button>
          <button
            onClick={() => setActiveTab("conversations")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${
              activeTab === "conversations"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Cuộc trò chuyện ({conversationCount})
            {unreadCount > 0 && (
              <span className="ml-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs">
                {unreadCount}
              </span>
            )}
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
            onClick={() => setOpenCreateChatRequest(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4">
              <path fill="currentColor" d="M19 11h-6V5h-2v6H5v2h6v6h2v-6h6z"/>
            </svg>
            Gửi yêu cầu hỗ trợ
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
        {activeTab === "requests" ? (
          <div className="divide-y divide-gray-100">
            {filteredRequests.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <div className="text-4xl mb-2">💬</div>
                <div className="font-medium">Không có yêu cầu chat nào</div>
                <div className="text-sm">Các yêu cầu chat sẽ hiển thị ở đây</div>
              </div>
            ) : (
              filteredRequests.map((request) => {
                const isOwnRequest = request.fromUser.id === currentUser.id;
                const displayUser = isOwnRequest ? request.toUser : request.fromUser;
                
                return (
                  <div key={request.id} className="p-4 hover:bg-gray-50 cursor-pointer"
                       onClick={() => { setSelectedRequest(request); setOpenRequestDialog(true); }}>
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                        <span className="text-sm font-medium">
                          {displayUser?.name.charAt(0)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {isOwnRequest && (
                            <span className="text-xs text-gray-500">Đến:</span>
                          )}
                          <span className="font-medium text-gray-900">{displayUser?.name}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleColor[displayUser?.role || 'sinh-vien']}`}>
                            {roleLabel[displayUser?.role || 'sinh-vien']}
                          </span>
                          {displayUser?.isOnline && (
                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                          )}
                          {isOwnRequest && (
                            <span className="ml-auto px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                              Đã gửi
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600 text-sm line-clamp-2 mb-1">{request.message}</p>
                        <div className="text-xs text-gray-500">
                          {dayjs(request.timestamp).fromNow()}
                        </div>
                      </div>
                      {!isOwnRequest && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeclineRequest(request);
                            }}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                            title="Từ chối"
                          >
                            <svg viewBox="0 0 24 24" className="h-4 w-4">
                              <path fill="currentColor" d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12z"/>
                            </svg>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAcceptRequest(request);
                            }}
                            className="p-1 text-green-600 hover:bg-green-50 rounded"
                            title="Chấp nhận"
                          >
                            <svg viewBox="0 0 24 24" className="h-4 w-4">
                              <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19L21 7l-1.41-1.41z"/>
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <div className="text-4xl mb-2">💬</div>
                <div className="font-medium">Chưa có cuộc trò chuyện nào</div>
                <div className="text-sm">Gửi yêu cầu hỗ trợ hoặc chấp nhận yêu cầu chat</div>
              </div>
            ) : (
              filteredConversations.map((conversation) => (
                <div key={conversation.id} className="p-4 hover:bg-gray-50 cursor-pointer"
                     onClick={() => handleOpenConversation(conversation)}>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                      <span className="text-sm font-medium">
                        {conversation.participants.find(p => p.role !== "sinh-vien")?.name.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {conversation.participants.filter(p => p.role !== "sinh-vien").map(participant => (
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
      />
    </div>
  );
};

export default ChatManagement;

