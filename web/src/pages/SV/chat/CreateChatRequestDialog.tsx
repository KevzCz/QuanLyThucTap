import React, { useState, useMemo, useEffect } from "react";
import Modal from "../../../util/Modal";
import type { ChatUser, UserRole, ChatRequest } from "../../PDT/chat/ChatTypes";
import { roleLabel, roleColor } from "../../PDT/chat/ChatTypes";
import { chatAPI } from "../../../services/chatApi";
import { useAuth } from "../../../contexts/UseAuth";
import { useToast } from "../../../components/UI/Toast";
import LoadingButton from "../../../components/UI/LoadingButton";

interface Props {
  open: boolean;
  onClose: () => void;
  onRequestSent?: (request: ChatRequest) => void;
}

const CreateChatRequestDialog: React.FC<Props> = ({ open, onClose, onRequestSent }) => {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  const [query, setQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState<"all" | UserRole>("all");
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const [message, setMessage] = useState("");
  const [subject, setSubject] = useState("");
  const [availableUsers, setAvailableUsers] = useState<ChatUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Load available users when dialog opens
  useEffect(() => {
    const loadUsers = async () => {
      if (!open) return;
      
      try {
        setLoading(true);
        setError("");
        const response = await chatAPI.getAvailableUsers();
        
        // Transform API users to local format and add PDT role entity
        const transformedUsers: ChatUser[] = [
          { id: "phong-dao-tao", name: "Phòng Đào Tạo", role: "phong-dao-tao", isOnline: true },
          ...response
            .filter(u => u.role !== "sinh-vien" && u.role !== "phong-dao-tao") // SV can't send to other students, and exclude individual PDT users
            .map(u => ({
              id: u.userId,
              name: u.name,
              role: u.role as UserRole,
              isOnline: u.isOnline
            }))
        ];
        
        setAvailableUsers(transformedUsers);
      } catch (err) {
        console.error("Error loading users:", err);
        setError("Không thể tải danh sách người dùng");
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

  const handleSendRequest = async () => {
    if (!selectedUser || !message.trim() || !user) return;

    try {
      setLoading(true);
      
      const response = await chatAPI.createChatRequest({
        toUserId: selectedUser.id,
        message: message.trim(),
        subject: subject.trim() || "Yêu cầu hỗ trợ"
      });

      // Create the request object to show immediately in the UI
      const newRequest: ChatRequest = {
        id: response.requestId,
        fromUser: {
          id: user.id,
          name: user.name,
          role: user.role as UserRole,
          isOnline: true
        },
        toUser: {
          id: selectedUser.id,
          name: selectedUser.name,
          role: selectedUser.role,
          isOnline: selectedUser.isOnline
        },
        message: message.trim(),
        subject: subject.trim() || "Yêu cầu hỗ trợ",
        timestamp: new Date().toISOString(),
        status: "pending",
        isAssigned: false
      };

      // Notify parent to add the request immediately
      if (onRequestSent) {
        onRequestSent(newRequest);
      }

      // Reset form and close
      setSelectedUser(null);
      setMessage("");
      setSubject("");
      setQuery("");
      setSelectedRole("all");
      showSuccess("Đã gửi yêu cầu thành công!");
      onClose();
    } catch (err) {
      console.error("Error sending chat request:", err);
      showError("Không thể gửi yêu cầu. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
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
            disabled={loading}
            className="h-10 px-4 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Hủy
          </button>
          <LoadingButton
            onClick={handleSendRequest}
            disabled={!selectedUser || !message.trim()}
            loading={loading}
            loadingText="Đang gửi..."
            variant="primary"
          >
            Gửi yêu cầu
          </LoadingButton>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
            {error}
          </div>
        )}

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
