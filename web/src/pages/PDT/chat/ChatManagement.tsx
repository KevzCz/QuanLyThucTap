import React, { useState, useMemo } from "react";
import type { ChatRequest, ChatConversation} from "./ChatTypes";
import { roleLabel, roleColor } from "./ChatTypes";
import ChatRequestDialog from "./ChatRequestDialog";
import CreateChatDialog from "./CreateChatDialog";
import ChatDialog from "./ChatDialog";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

// Mock data - now includes requests from all roles to PDT
const MOCK_REQUESTS: ChatRequest[] = [
  {
    id: "req1",
    fromUser: { id: "BCN001", name: "PGS. Nguyễn Văn A", role: "ban-chu-nhiem", isOnline: true },
    toUser: { id: "PDT_ROLE", name: "Phòng Đào Tạo", role: "phong-dao-tao", isOnline: true },
    message: "Xin chào, tôi cần hỗ trợ về quy trình phê duyệt môn thực tập mới.",
    timestamp: "2025-01-20T14:30:00",
    status: "pending",
    isAssigned: false,
  },
  {
    id: "req2",
    fromUser: { id: "GV001", name: "ThS. Trần Văn C", role: "giang-vien", isOnline: false },
    toUser: { id: "PDT_ROLE", name: "Phòng Đào Tạo", role: "phong-dao-tao", isOnline: true },
    message: "Tôi muốn thảo luận về việc cập nhật chương trình thực tập.",
    timestamp: "2025-01-20T13:15:00",
    status: "pending",
    isAssigned: false,
  },
  {
    id: "req3",
    fromUser: { id: "SV001", name: "Nguyễn Thị D", role: "sinh-vien", isOnline: true },
    toUser: { id: "PDT_ROLE", name: "Phòng Đào Tạo", role: "phong-dao-tao", isOnline: true },
    message: "Em cần hỗ trợ về thủ tục đăng ký thực tập.",
    timestamp: "2025-01-20T12:45:00",
    status: "pending",
    isAssigned: false,
  },
  {
    id: "req4",
    fromUser: { id: "GV002", name: "TS. Lê Văn E", role: "giang-vien", isOnline: true },
    toUser: { id: "PDT_ROLE", name: "Phòng Đào Tạo", role: "phong-dao-tao", isOnline: true },
    message: "Cần hỗ trợ về việc báo cáo tiến độ thực tập của sinh viên.",
    timestamp: "2025-01-20T11:00:00",
    status: "pending",
    assignedTo: { id: "PDT002", name: "TS. Hoàng Thị F", role: "phong-dao-tao", isOnline: true },
    isAssigned: true,
  },
];

const MOCK_CONVERSATIONS: ChatConversation[] = [
  {
    id: "conv1",
    participants: [
      { id: "PDT001", name: "TS. Lê Thị B", role: "phong-dao-tao", isOnline: true },
      { id: "BCN002", name: "PGS. Hoàng Văn E", role: "ban-chu-nhiem", isOnline: true },
    ],
    lastMessage: {
      id: "msg1",
      senderId: "BCN002",
      content: "Cảm ơn anh đã hỗ trợ, em sẽ cập nhật theo hướng dẫn.",
      timestamp: "2025-01-20T15:20:00",
      type: "text",
    },
    updatedAt: "2025-01-20T15:20:00",
    unreadCount: 0,
    isActive: true,
  },
  {
    id: "conv2",
    participants: [
      { id: "PDT001", name: "TS. Lê Thị B", role: "phong-dao-tao", isOnline: true },
      { id: "GV002", name: "TS. Phạm Thị F", role: "giang-vien", isOnline: false },
    ],
    lastMessage: {
      id: "msg2",
      senderId: "GV002",
      content: "Tôi sẽ gửi báo cáo chi tiết vào cuối tuần.",
      timestamp: "2025-01-20T11:30:00",
      type: "text",
    },
    updatedAt: "2025-01-20T11:30:00",
    unreadCount: 2,
    isActive: true,
  },
];

const ChatManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"requests" | "conversations">("requests");
  const [requests, setRequests] = useState<ChatRequest[]>(MOCK_REQUESTS);
  const [conversations, setConversations] = useState<ChatConversation[]>(MOCK_CONVERSATIONS);
  const [query, setQuery] = useState("");

  // Current PDT user
  const currentUser = { id: "PDT001", name: "TS. Lê Thị B", role: "phong-dao-tao" as const, isOnline: true };

  // Dialogs
  const [selectedRequest, setSelectedRequest] = useState<ChatRequest | null>(null);
  const [openRequestDialog, setOpenRequestDialog] = useState(false);
  const [openCreateChat, setOpenCreateChat] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<ChatConversation | null>(null);
  const [openChatDialog, setOpenChatDialog] = useState(false);

  const filteredRequests = useMemo(() => {
    const q = query.trim().toLowerCase();
    let filtered = requests;
    
    // Filter out requests assigned to other PDT members
    filtered = filtered.filter(req => 
      !req.isAssigned || req.assignedTo?.id === currentUser.id
    );
    
    if (q) {
      filtered = filtered.filter(req => 
        req.fromUser.name.toLowerCase().includes(q) ||
        req.message.toLowerCase().includes(q)
      );
    }
    
    return filtered;
  }, [requests, query, currentUser.id]);

  const filteredConversations = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter(conv => 
      conv.participants.some(p => p.name.toLowerCase().includes(q)) ||
      conv.lastMessage?.content.toLowerCase().includes(q)
    );
  }, [conversations, query]);

  const handleBindRequest = (request: ChatRequest) => {
    // Bind this request to current PDT user
    setRequests(prev => prev.map(r => 
      r.id === request.id 
        ? { ...r, assignedTo: currentUser, isAssigned: true }
        : r
    ));
  };

  const handleAcceptRequest = (request: ChatRequest) => {
    // Create new conversation with the actual user who sent the request
    const newConversation: ChatConversation = {
      id: `conv_${Date.now()}`,
      participants: [currentUser, request.fromUser],
      updatedAt: new Date().toISOString(),
      unreadCount: 0,
      isActive: true,
    };

    setConversations(prev => [newConversation, ...prev]);
    setRequests(prev => prev.filter(r => r.id !== request.id));
    setOpenRequestDialog(false);
    
    // Open the new conversation
    setSelectedConversation(newConversation);
    setOpenChatDialog(true);
  };

  const handleDeclineRequest = (request: ChatRequest) => {
    setRequests(prev => prev.filter(r => r.id !== request.id));
    setOpenRequestDialog(false);
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
  const unreadCount = conversations.reduce((sum, conv) => sum + conv.unreadCount, 0);
  const assignedToMeCount = requests.filter(r => r.assignedTo?.id === currentUser.id).length;

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
            Cuộc trò chuyện ({unreadCount})
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

      {/* Content */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
        {activeTab === "requests" ? (
          <div className="divide-y divide-gray-100">
            {filteredRequests.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <div className="text-4xl mb-2">💬</div>
                <div className="font-medium">Không có yêu cầu chat nào</div>
                <div className="text-sm">Các yêu cầu chat mới sẽ hiển thị ở đây</div>
              </div>
            ) : (
              filteredRequests.map((request) => (
                <div key={request.id} className="p-4 hover:bg-gray-50 cursor-pointer"
                     onClick={() => { setSelectedRequest(request); setOpenRequestDialog(true); }}>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                      <span className="text-sm font-medium">
                        {request.fromUser.name.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900">{request.fromUser.name}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleColor[request.fromUser.role]}`}>
                          {roleLabel[request.fromUser.role]}
                        </span>
                        {request.fromUser.isOnline && (
                          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        )}
                        {request.isAssigned && request.assignedTo?.id === currentUser.id && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                            Được phân cho bạn
                          </span>
                        )}
                      </div>
                      <p className="text-gray-600 text-sm line-clamp-2 mb-1">{request.message}</p>
                      <div className="text-xs text-gray-500">
                        {dayjs(request.timestamp).fromNow()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!request.isAssigned && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleBindRequest(request);
                          }}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          title="Nhận xử lý"
                        >
                          <svg viewBox="0 0 24 24" className="h-4 w-4">
                            <path fill="currentColor" d="M12 2l-1.5 6L7 4.5l3.5 7.5h3L17 4.5z"/>
                          </svg>
                        </button>
                      )}
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
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredConversations.length === 0 ? (
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
        currentUser={currentUser}
      />

      <CreateChatDialog
        open={openCreateChat}
        onClose={() => setOpenCreateChat(false)}
        onCreateConversation={(newConv) => {
          setConversations(prev => [newConv, ...prev]);
          setSelectedConversation(newConv);
          setOpenChatDialog(true);
        }}
      />

      <ChatDialog
        open={openChatDialog}
        onClose={() => setOpenChatDialog(false)}
        conversation={selectedConversation}
        currentUser={{ id: "PDT001", name: "TS. Lê Thị B", role: "phong-dao-tao", isOnline: true }}
      />
    </div>
  );
};

export default ChatManagement;

