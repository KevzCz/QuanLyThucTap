import React, { useState, useMemo, useEffect } from "react";
import Modal from "../../../util/Modal";
import type { ChatUser, ChatConversation, ChatRequest, UserRole } from "../../PDT/chat/ChatTypes";
import { roleLabel, roleColor } from "../../PDT/chat/ChatTypes";
import { useAuth } from "../../../contexts/UseAuth";
import { chatAPI } from "../../../services/chatApi";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreateConversation?: (conversation: ChatConversation) => void;
  onSendRequest?: (request: ChatRequest) => void;
}

const CreateChatDialog: React.FC<Props> = ({ open, onClose, onCreateConversation, onSendRequest }) => {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState<"all" | UserRole>("all");
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const [message, setMessage] = useState("");
  const [availableUsers, setAvailableUsers] = useState<ChatUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Current user as BCN
  const currentUser: ChatUser = {
    id: user?.id || "BCN001",
    name: user?.name || "Ban Chủ Nhiệm",
    role: "ban-chu-nhiem" as const,
    isOnline: true
  };

  // Load available users when dialog opens
  useEffect(() => {
    const loadUsers = async () => {
      if (!open) return;
      
      try {
        setLoading(true);
        setError("");
        
        // Load users from all roles that BCN can interact with
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const [pdtUsers, gvUsers, svUsers] = await Promise.all([
          chatAPI.getAvailableUsers("phong-dao-tao"),
          chatAPI.getAvailableUsers("giang-vien"),
          chatAPI.getAvailableUsers("sinh-vien")
        ]);

        // Add special PDT entry for requests
        const pdtEntry: ChatUser = {
          id: "PDT_ROLE",
          name: "Phòng Đào Tạo",
          role: "phong-dao-tao",
          isOnline: true
        };

        // Transform API users to ChatUser format
        const transformedGvUsers: ChatUser[] = gvUsers.map(u => ({
          id: u.userId,
          name: u.name,
          role: u.role as UserRole,
          isOnline: u.isOnline
        }));

        const transformedSvUsers: ChatUser[] = svUsers.map(u => ({
          id: u.userId,
          name: u.name,
          role: u.role as UserRole,
          isOnline: u.isOnline
        }));

        const allUsers = [pdtEntry, ...transformedGvUsers, ...transformedSvUsers];
        setAvailableUsers(allUsers);
      } catch (err) {
        console.error('Error loading users:', err);
        setError('Không thể tải danh sách người dùng');
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, [open]);

  const filteredUsers = useMemo(() => {
    let users = availableUsers;
    
    if (selectedRole !== "all") {
      users = users.filter(user => user.role === selectedRole);
    }
    
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      users = users.filter(user => 
        user.name.toLowerCase().includes(q) || 
        user.id.toLowerCase().includes(q)
      );
    }
    
    return users;
  }, [query, selectedRole, availableUsers]);

  const handleAction = async () => {
    if (!selectedUser) return;

    try {
      setLoading(true);
      setError("");

      if (selectedUser.role === "phong-dao-tao") {
        // Send request to PDT via API
        const requestData = {
          toUserId: selectedUser.id,
          message: message.trim() || "Xin chào, tôi cần hỗ trợ từ Phòng Đào Tạo.",
          subject: "Yêu cầu hỗ trợ từ Ban Chủ Nhiệm",
          requestType: "support",
          priority: "normal" as const
        };

        const result = await chatAPI.createChatRequest(requestData);
        
        // Transform the result to local format for callback
        if (result && onSendRequest) {
          const localRequest: ChatRequest = {
            id: result.requestId,
            fromUser: currentUser,
            toUser: selectedUser,
            message: result.message,
            subject: result.subject,
            timestamp: result.createdAt,
            status: result.status as "pending" | "accepted" | "declined" | "expired" | "cancelled",
            isAssigned: result.isAssigned
          };
          onSendRequest(localRequest);
        }
      } else {
        // Create direct conversation with GV/SV via API
        const conversationData = {
          participantIds: [selectedUser.id],
          conversationType: "direct" as const,
          title: `Chat với ${selectedUser.name}`
        };

        const result = await chatAPI.createConversation(conversationData);
        
        // Transform the result to local format for callback
        if (result && onCreateConversation) {
          const localConversation: ChatConversation = {
            id: result.conversationId,
            participants: [currentUser, selectedUser],
            updatedAt: result.updatedAt,
            unreadCount: 0,
            isActive: result.isActive
          };
          onCreateConversation(localConversation);
        }
      }

      // Close dialog and reset state
      onClose();
      setSelectedUser(null);
      setQuery("");
      setSelectedRole("all");
      setMessage("");
    } catch (err) {
      console.error('Error creating chat/request:', err);
      setError('Không thể tạo cuộc trò chuyện hoặc gửi yêu cầu');
    } finally {
      setLoading(false);
    }
  };

  const isRequestMode = selectedUser?.role === "phong-dao-tao";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isRequestMode ? "Gửi yêu cầu hỗ trợ đến PDT" : "Tạo cuộc trò chuyện"}
      widthClass="max-w-2xl"
      actions={
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="h-10 px-4 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Hủy
          </button>
          <button
            onClick={handleAction}
            disabled={!selectedUser || (isRequestMode && !message.trim()) || loading}
            className="h-10 px-4 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {loading ? "Đang xử lý..." : (isRequestMode ? "Gửi yêu cầu" : "Tạo cuộc trò chuyện")}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Search and filters */}
        <div className="space-y-3">
          <div className="relative">
            <span className="absolute inset-y-0 left-3 flex items-center text-gray-400">
              <svg viewBox="0 0 24 24" className="h-4 w-4">
                <path fill="currentColor" d="M10 2a8 8 0 1 1-5.3 13.9l-3.4 3.4 1.4 1.4 3.4-3.4A8 8 0 0 1 10 2m0 2a6 6 0 1 0 0 12A6 6 0 0 0 10 4z"/>
              </svg>
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm kiếm theo tên hoặc ID..."
              className="w-full h-10 rounded-lg border border-gray-300 bg-white pl-8 pr-3 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-2">
            {(["all", "phong-dao-tao", "giang-vien", "sinh-vien"] as const).map((role) => (
              <button
                key={role}
                onClick={() => setSelectedRole(role)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                  selectedRole === role
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {role === "all" ? "Tất cả" : roleLabel[role]}
              </button>
            ))}
          </div>
        </div>

        {/* Error display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="text-sm text-red-800">{error}</div>
          </div>
        )}

        {/* User list */}
        <div className="border border-gray-200 rounded-lg max-h-60 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-500">
              <div className="animate-spin inline-block w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full mr-2"></div>
              Đang tải danh sách người dùng...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              Không tìm thấy người dùng phù hợp
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  onClick={() => setSelectedUser(user)}
                  className={`p-3 cursor-pointer hover:bg-gray-50 ${
                    selectedUser?.id === user.id ? "bg-blue-50 border-blue-200" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                      <span className="text-sm font-medium">
                        {user.name.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{user.name}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleColor[user.role]}`}>
                          {roleLabel[user.role]}
                        </span>
                        {user.isOnline && (
                          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        {user.role === "phong-dao-tao" ? (
                          <span className="text-blue-600">• Gửi yêu cầu hỗ trợ</span>
                        ) : (
                          `ID: ${user.id}`
                        )}
                      </div>
                    </div>
                    {selectedUser?.id === user.id && (
                      <div className="text-blue-600">
                        <svg viewBox="0 0 24 24" className="h-5 w-5">
                          <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19L21 7l-1.41-1.41z"/>
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Message input for PDT requests */}
        {selectedUser && isRequestMode && (
          <div className="space-y-3">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="text-sm text-blue-800">
                <strong>Gửi yêu cầu đến:</strong> {selectedUser.name}
              </div>
              <div className="text-xs text-blue-600 mt-1">
                Yêu cầu sẽ được gửi đến tất cả thành viên PDT và ai đó sẽ nhận xử lý
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nội dung yêu cầu hỗ trợ</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Mô tả vấn đề cần hỗ trợ từ Phòng Đào Tạo..."
                className="w-full h-24 rounded-lg border border-gray-300 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="text-xs text-gray-500 mt-1">
                {message.length}/500 ký tự
              </div>
            </div>
          </div>
        )}

        {/* Direct chat confirmation */}
        {selectedUser && !isRequestMode && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="text-sm text-green-800">
              <strong>Tạo cuộc trò chuyện với:</strong> {selectedUser.name} ({roleLabel[selectedUser.role]})
            </div>
            <div className="text-xs text-green-600 mt-1">
              Bạn có thể chat trực tiếp với người này
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default CreateChatDialog;
