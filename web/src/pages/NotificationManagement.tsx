import { useState, useEffect } from "react";
import { Send, Users, AlertCircle, CheckCircle2, Search } from "lucide-react";
import { useAuth } from "../contexts/UseAuth";
import { apiClient, type Role } from "../utils/api";

interface RecipientOption {
  value: string;
  label: string;
  email?: string;
  role?: Role;
}

export default function NotificationManagement() {
  const { user: account } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // Form state
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [recipientType, setRecipientType] = useState("");
  const [priority, setPriority] = useState<"low" | "normal" | "high" | "urgent">("normal");
  const [link, setLink] = useState("");
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);

  // Data for dropdowns
  const [users, setUsers] = useState<RecipientOption[]>([]);
  const [khoa, setKhoa] = useState<string[]>([]);
  const [roles, setRoles] = useState<RecipientOption[]>([]);
  
  // Search state
  const [userSearchQuery, setUserSearchQuery] = useState("");

  // Load data based on recipient type
  useEffect(() => {
    const loadRecipientData = async () => {
      if (!recipientType) return;

      try {
        if (recipientType === "individual" && users.length === 0) {
          const response = await apiClient.getNotificationRecipients("users");
          if (response.users) {
            setUsers(
              response.users.map((u) => ({
                value: u._id,
                label: `${u.name} (${u.id}) - ${getRoleLabel(u.role)}`,
                email: u.email,
                role: u.role,
              }))
            );
          }
        } else if (recipientType === "khoa" && khoa.length === 0) {
          const response = await apiClient.getNotificationRecipients("khoa");
          if (response.khoa) {
            setKhoa(response.khoa);
          }
        } else if (recipientType === "role" && roles.length === 0) {
          const response = await apiClient.getNotificationRecipients("roles");
          if (response.roles) {
            setRoles(response.roles);
          }
        }
      } catch (err) {
        console.error("Error loading recipient data:", err);
        setError("Không thể tải danh sách người nhận");
      }
    };

    loadRecipientData();
  }, [recipientType, users.length, khoa.length, roles.length]);

  const getRoleLabel = (role: Role) => {
    const labels: Record<Role, string> = {
      "phong-dao-tao": "PDT",
      "ban-chu-nhiem": "BCN",
      "giang-vien": "GV",
      "sinh-vien": "SV",
    };
    return labels[role];
  };

  const getRecipientTypeOptions = () => {
    if (!account) return [];

    switch (account.role) {
      case "phong-dao-tao":
        return [
          { value: "individual", label: "Người cụ thể" },
          { value: "role", label: "Theo vai trò" },
          { value: "khoa", label: "Theo khoa" },
          { value: "all", label: "Tất cả mọi người" },
        ];
      case "ban-chu-nhiem":
        return [
          { value: "individual", label: "Người cụ thể" },
          { value: "giang-vien-khoa", label: "Tất cả giảng viên trong khoa" },
          { value: "sinh-vien-khoa", label: "Tất cả sinh viên trong khoa" },
        ];
      case "giang-vien":
        return [
          { value: "individual", label: "Người cụ thể" },
          { value: "sinh-vien-managed", label: "Tất cả sinh viên được quản lý" }
        ];
      case "sinh-vien":
        return [{ value: "giang-vien-supervisor", label: "Giảng viên hướng dẫn" }];
      default:
        return [];
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      // Validation
      if (!title.trim() || !message.trim() || !recipientType) {
        setError("Vui lòng điền đầy đủ thông tin bắt buộc");
        setLoading(false);
        return;
      }

      // Check if recipients are needed
      const needsRecipients = ["individual", "role", "khoa"].includes(recipientType);
      if (needsRecipients && selectedRecipients.length === 0) {
        setError("Vui lòng chọn người nhận");
        setLoading(false);
        return;
      }

      const response = await apiClient.sendNotification({
        title,
        message,
        recipientType,
        recipients: needsRecipients ? selectedRecipients : undefined,
        priority,
        link: link.trim() || undefined,
      });

      setSuccess(`${response.message} (${response.recipientCount} người)`);
      // Reset form
      setTitle("");
      setMessage("");
      setRecipientType("");
      setSelectedRecipients([]);
      setLink("");
      setPriority("normal");
    } catch (err: unknown) {
      const errorMessage =
        err && typeof err === "object" && "message" in err
          ? (err as { message: string }).message
          : "Có lỗi xảy ra khi gửi thông báo";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRecipientToggle = (value: string) => {
    setSelectedRecipients((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Quản lý thông báo</h1>
        <p className="text-gray-600 mt-1">Gửi thông báo đến người dùng trong hệ thống</p>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <span className="text-red-800">{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
          <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
          <span className="text-green-800">{success}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tiêu đề <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Nhập tiêu đề thông báo"
              maxLength={200}
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nội dung <span className="text-red-500">*</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Nhập nội dung thông báo"
            />
          </div>

          {/* Recipient Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Người nhận <span className="text-red-500">*</span>
            </label>
            <select
              value={recipientType}
              onChange={(e) => {
                setRecipientType(e.target.value);
                setSelectedRecipients([]);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">-- Chọn loại người nhận --</option>
              {getRecipientTypeOptions().map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Recipient Selection */}
          {recipientType === "individual" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Chọn người nhận <span className="text-red-500">*</span>
              </label>
              
              {/* Search Input */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  placeholder="Tìm theo tên hoặc ID..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="border border-gray-300 rounded-lg p-4 max-h-64 overflow-y-auto">
                {users.length === 0 ? (
                  <p className="text-gray-500 text-sm">Đang tải...</p>
                ) : (
                  <div className="space-y-2">
                    {users
                      .filter((user) => {
                        if (!userSearchQuery.trim()) return true;
                        const query = userSearchQuery.toLowerCase();
                        return (
                          user.label.toLowerCase().includes(query) ||
                          (user.email && user.email.toLowerCase().includes(query))
                        );
                      })
                      .map((user) => (
                        <label
                          key={user.value}
                          className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedRecipients.includes(user.value)}
                            onChange={() => handleRecipientToggle(user.value)}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-900">{user.label}</span>
                        </label>
                      ))}
                    {users.filter((user) => {
                      if (!userSearchQuery.trim()) return true;
                      const query = userSearchQuery.toLowerCase();
                      return (
                        user.label.toLowerCase().includes(query) ||
                        (user.email && user.email.toLowerCase().includes(query))
                      );
                    }).length === 0 && (
                      <p className="text-gray-500 text-sm text-center py-4">
                        Không tìm thấy người dùng phù hợp
                      </p>
                    )}
                  </div>
                )}
              </div>
              {selectedRecipients.length > 0 && (
                <p className="text-sm text-gray-600 mt-2">
                  Đã chọn {selectedRecipients.length} người
                </p>
              )}
            </div>
          )}

          {recipientType === "role" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Chọn vai trò <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
                {roles.map((role) => (
                  <label
                    key={role.value}
                    className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedRecipients.includes(role.value)}
                      onChange={() => handleRecipientToggle(role.value)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <Users className="w-5 h-5 text-gray-500" />
                    <span className="text-sm font-medium text-gray-900">{role.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {recipientType === "khoa" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Chọn khoa <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
                {khoa.length === 0 ? (
                  <p className="text-gray-500 text-sm">Đang tải...</p>
                ) : (
                  khoa.map((k) => (
                    <label
                      key={k}
                      className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedRecipients.includes(k)}
                        onChange={() => handleRecipientToggle(k)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-900">{k}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mức độ ưu tiên
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as "low" | "normal" | "high" | "urgent")}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="low">Thấp</option>
              <option value="normal">Trung bình</option>
              <option value="high">Cao</option>
              <option value="urgent">Khẩn cấp</option>
            </select>
          </div>

          {/* Link (optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Liên kết (tùy chọn)
            </label>
            <input
              type="text"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="/path/to/page"
            />
            <p className="text-xs text-gray-500 mt-1">
              Đường dẫn trong ứng dụng (ví dụ: /hocky, /profile)
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              {loading ? "Đang gửi..." : "Gửi thông báo"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
