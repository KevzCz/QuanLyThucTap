import React, { useState, useMemo } from "react";
import Modal from "../../../util/Modal";
import type { ChatUser, ChatRequest, UserRole } from "../../PDT/chat/ChatTypes";
import { roleLabel, roleColor } from "../../PDT/chat/ChatTypes";

interface Props {
  open: boolean;
  onClose: () => void;
  onSendRequest: (request: ChatRequest) => void;
}

// Mock users that SV can send requests to (their teacher, BCN, and PDT)
const MOCK_USERS: ChatUser[] = [
  // PDT - can send requests to
  { id: "PDT_ROLE", name: "Phòng Đào Tạo", role: "phong-dao-tao", isOnline: true },
  
  // Their teacher
  { id: "GV001", name: "ThS. Lê Văn A", role: "giang-vien", isOnline: true },
  
  // BCN of their internship subject
  { id: "BCN001", name: "PGS. Nguyễn Văn B", role: "ban-chu-nhiem", isOnline: true },
];

const CreateChatRequestDialog: React.FC<Props> = ({ open, onClose, onSendRequest }) => {
  const [query, setQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState<"all" | UserRole>("all");
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const [message, setMessage] = useState("");

  const filteredUsers = useMemo(() => {
    let users = MOCK_USERS;
    
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
  }, [query, selectedRole]);

  const handleSendRequest = () => {
    if (!selectedUser || !message.trim()) return;

    const chatRequest: ChatRequest = {
      id: `req_${Date.now()}`,
      fromUser: { id: "SV001", name: "Nguyễn Văn C", role: "sinh-vien", isOnline: true },
      toUser: selectedUser,
      message: message.trim(),
      timestamp: new Date().toISOString(),
      status: "pending",
      isAssigned: selectedUser.role === "phong-dao-tao" ? false : undefined,
    };

    onSendRequest(chatRequest);
    
    // Reset form
    setSelectedUser(null);
    setMessage("");
    setQuery("");
    setSelectedRole("all");
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Gửi yêu cầu hỗ trợ"
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
            onClick={handleSendRequest}
            disabled={!selectedUser || !message.trim()}
            className="h-10 px-4 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Gửi yêu cầu
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
            {(["all", "phong-dao-tao", "ban-chu-nhiem", "giang-vien"] as const).map((role) => (
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

        {/* User list */}
        <div className="border border-gray-200 rounded-lg max-h-60 overflow-y-auto">
          {filteredUsers.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              Không tìm thấy người hỗ trợ phù hợp
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
                        ID: {user.id}
                        {user.role === "giang-vien" && <span className="ml-2 text-blue-600">• Giảng viên hướng dẫn</span>}
                        {user.role === "ban-chu-nhiem" && <span className="ml-2 text-cyan-600">• Ban chủ nhiệm khoa</span>}
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

        {/* Message input */}
        {selectedUser && (
          <div className="space-y-3">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="text-sm text-blue-800">
                <strong>Gửi yêu cầu đến:</strong> {selectedUser.name} ({roleLabel[selectedUser.role]})
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nội dung yêu cầu hỗ trợ</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Mô tả vấn đề cần hỗ trợ..."
                className="w-full h-24 rounded-lg border border-gray-300 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="text-xs text-gray-500 mt-1">
                {message.length}/500 ký tự
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default CreateChatRequestDialog;
