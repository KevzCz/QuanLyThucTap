import React, { useState, useMemo } from "react";
import Modal from "../../../util/Modal";
import type { ChatUser, ChatConversation, UserRole } from "../../PDT/chat/ChatTypes";
import { roleLabel, roleColor } from "../../PDT/chat/ChatTypes";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreateConversation: (conversation: ChatConversation) => void;
}

// Mock users that BCN can chat with (only GV and SV)
const MOCK_USERS: ChatUser[] = [
  { id: "GV001", name: "ThS. Lê Văn C", role: "giang-vien", isOnline: true },
  { id: "GV002", name: "TS. Phạm Thị D", role: "giang-vien", isOnline: true },
  { id: "GV003", name: "PGS. Hoàng Văn E", role: "giang-vien", isOnline: false },
  { id: "GV004", name: "TS. Nguyễn Thị F", role: "giang-vien", isOnline: true },
  { id: "SV001", name: "Nguyễn Thị G", role: "sinh-vien", isOnline: true },
  { id: "SV002", name: "Trần Văn H", role: "sinh-vien", isOnline: false },
  { id: "SV003", name: "Lê Thị I", role: "sinh-vien", isOnline: true },
  { id: "SV004", name: "Phạm Văn J", role: "sinh-vien", isOnline: true },
];

const CreateChatDialog: React.FC<Props> = ({ open, onClose, onCreateConversation }) => {
  const [query, setQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState<"all" | UserRole>("all");
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);

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

  const handleCreateChat = () => {
    if (!selectedUser) return;

    const newConversation: ChatConversation = {
      id: `conv_${Date.now()}`,
      participants: [
        { id: "BCN001", name: "PGS. Nguyễn Văn B", role: "ban-chu-nhiem", isOnline: true },
        selectedUser
      ],
      updatedAt: new Date().toISOString(),
      unreadCount: 0,
      isActive: true,
    };

    onCreateConversation(newConversation);
    onClose();
    setSelectedUser(null);
    setQuery("");
    setSelectedRole("all");
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Tạo cuộc trò chuyện mới"
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
            onClick={handleCreateChat}
            disabled={!selectedUser}
            className="h-10 px-4 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Tạo cuộc trò chuyện
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
            {(["all", "giang-vien", "sinh-vien"] as const).map((role) => (
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
        <div className="border border-gray-200 rounded-lg max-h-80 overflow-y-auto">
          {filteredUsers.length === 0 ? (
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
                      <div className="text-sm text-gray-500">ID: {user.id}</div>
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

        {selectedUser && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="text-sm text-blue-800">
              <strong>Đã chọn:</strong> {selectedUser.name} ({roleLabel[selectedUser.role]})
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default CreateChatDialog;
