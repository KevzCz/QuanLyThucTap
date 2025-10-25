import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import StandardDialog from './UI/StandardDialog';
import { Icons } from './UI/Icons';
import { apiClient } from '../utils/api';
import { useToast } from './UI/Toast';
import { useAuth } from '../contexts/UseAuth';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface UserProfile extends User {
  status?: string;
  createdAt?: string;
  // Additional fields based on role
  department?: string;
  studentClass?: string;
  year?: number;
  internshipStatus?: string;
  maxStudents?: number;
}

interface UserProfileDialogProps {
  open: boolean;
  onClose: () => void;
  user: User | null;
}

function getRoleName(role: string): string {
  switch (role) {
    case "phong-dao-tao": return "Phòng Đào Tạo";
    case "ban-chu-nhiem": return "Ban Chủ Nhiệm";
    case "giang-vien": return "Giảng viên";
    case "sinh-vien": return "Sinh viên";
    default: return role;
  }
}

function getRoleColor(role: string): string {
  switch (role) {
    case "phong-dao-tao": return "bg-purple-100 text-purple-800";
    case "ban-chu-nhiem": return "bg-blue-100 text-blue-800";
    case "giang-vien": return "bg-green-100 text-green-800";
    case "sinh-vien": return "bg-orange-100 text-orange-800";
    default: return "bg-gray-100 text-gray-800";
  }
}

function getStatusText(status: string): string {
  switch (status) {
    case "open": return "Đang hoạt động";
    case "locked": return "Đã khóa";
    default: return status;
  }
}

function getInternshipStatusText(status: string): string {
  switch (status) {
    case "chua-duoc-huong-dan": return "Chưa được hướng dẫn";
    case "duoc-huong-dan": return "Đã được hướng dẫn";
    case "dang-thuc-tap": return "Đang thực tập";
    case "dang-lam-do-an": return "Đang làm đồ án";
    case "hoan-thanh": return "Hoàn thành";
    default: return status;
  }
}

const UserProfileDialog: React.FC<UserProfileDialogProps> = ({ open, onClose, user }) => {
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const { user: currentUser } = useAuth();

  // Role hierarchy: pdt > bcn > gv > sv
  const roleHierarchy: Record<string, number> = {
    'phong-dao-tao': 4,
    'ban-chu-nhiem': 3,
    'giang-vien': 2,
    'sinh-vien': 1
  };

  // Check if current user can create direct chat with target user
  const canCreateDirectChat = (targetRole: string): boolean => {
    if (!currentUser) return false;
    const currentLevel = roleHierarchy[currentUser.role] || 0;
    const targetLevel = roleHierarchy[targetRole] || 0;
    return currentLevel > targetLevel; // Higher role can create direct chat
  };

  useEffect(() => {
    const loadProfile = async () => {
      if (!user || !open) return;

      try {
        setLoading(true);
        const response = await apiClient.request<{ success: boolean; account: UserProfile }>(
          `/accounts/${user.id}`
        );

        if (response.success) {
          setProfile(response.account);
        }
      } catch (error) {
        console.error('Failed to load user profile:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [user, open]);

  const handleCreateChat = async () => {
    if (!user) return;

    try {
      // Check if we should create direct chat or send request
      if (canCreateDirectChat(user.role)) {
        // Create direct conversation
        const response = await apiClient.request<{ success: boolean; data?: { conversationId: string }; message?: string }>(
          '/chat/conversations',
          {
            method: 'POST',
            body: JSON.stringify({
              participantIds: [user.id],
              conversationType: 'direct'
            })
          }
        );

        if (response.success) {
          showSuccess('Đã tạo cuộc trò chuyện thành công!');
          onClose();
          navigate('/chat');
        } else {
          showError(response.message || 'Không thể tạo cuộc trò chuyện');
        }
      } else {
        // Send chat request (for lower or equal hierarchy)
        const response = await apiClient.request<{ success: boolean; requestId?: string; message?: string }>(
          '/chat/requests',
          {
            method: 'POST',
            body: JSON.stringify({
              toUserId: user.id,
              message: `Xin chào, tôi muốn trao đổi về công việc.`
            })
          }
        );

        if (response.success) {
          showSuccess('Đã gửi yêu cầu chat thành công!');
          onClose();
          navigate('/chat');
        } else {
          showError(response.message || 'Không thể gửi yêu cầu chat');
        }
      }
    } catch (error: unknown) {
      console.error('Create chat error:', error);
      if (error && typeof error === 'object' && 'message' in error) {
        showError((error as { message: string }).message || 'Có lỗi xảy ra khi tạo chat');
      } else {
        showError('Có lỗi xảy ra khi tạo chat');
      }
    }
  };

  if (!user) return null;

  return (
    <StandardDialog
      open={open}
      onClose={onClose}
      title="Thông tin người dùng"
      size="md"
      icon={<Icons.users className="text-blue-600" />}
      primaryAction={{
        label: "Tạo chat",
        onClick: handleCreateChat,
        variant: "primary"
      }}
      secondaryAction={{
        label: "Đóng",
        onClick: onClose
      }}
    >
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : profile ? (
        <div className="space-y-6">
          {/* User Avatar and Basic Info */}
          <div className="flex items-start gap-4 pb-4 border-b border-gray-200">
            <div className="w-16 h-16 rounded-full bg-blue-600 text-white flex items-center justify-center text-2xl font-bold flex-shrink-0">
              {profile.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 truncate">{profile.name}</h3>
              <p className="text-sm text-gray-600 truncate">{profile.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(profile.role)}`}>
                  {getRoleName(profile.role)}
                </span>
                {profile.status && (
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                    profile.status === 'open' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {getStatusText(profile.status)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Account Information */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Thông tin tài khoản</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Mã định danh:</span>
                <p className="font-medium text-gray-900 mt-0.5">{profile.id}</p>
              </div>
              <div>
                <span className="text-gray-500">Email:</span>
                <p className="font-medium text-gray-900 mt-0.5 break-all">{profile.email}</p>
              </div>
            </div>
          </div>

          {/* Role-specific Information */}
          {profile.role === 'sinh-vien' && (
            <div className="space-y-3 pt-3 border-t border-gray-200">
              <h4 className="font-medium text-gray-900">Thông tin sinh viên</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {profile.studentClass && (
                  <div>
                    <span className="text-gray-500">Lớp:</span>
                    <p className="font-medium text-gray-900 mt-0.5">{profile.studentClass}</p>
                  </div>
                )}
                {profile.year && (
                  <div>
                    <span className="text-gray-500">Năm:</span>
                    <p className="font-medium text-gray-900 mt-0.5">{profile.year}</p>
                  </div>
                )}
                {profile.internshipStatus && (
                  <div className="col-span-2">
                    <span className="text-gray-500">Trạng thái thực tập:</span>
                    <p className="font-medium text-gray-900 mt-0.5">{getInternshipStatusText(profile.internshipStatus)}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {(profile.role === 'giang-vien' || profile.role === 'ban-chu-nhiem') && profile.department && (
            <div className="space-y-3 pt-3 border-t border-gray-200">
              <h4 className="font-medium text-gray-900">Thông tin khoa</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Khoa/Bộ môn:</span>
                  <p className="font-medium text-gray-900 mt-0.5">{profile.department}</p>
                </div>
                {profile.role === 'giang-vien' && profile.maxStudents && (
                  <div>
                    <span className="text-gray-500">Số SV tối đa:</span>
                    <p className="font-medium text-gray-900 mt-0.5">{profile.maxStudents}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {profile.createdAt && (
            <div className="pt-3 border-t border-gray-200 text-xs text-gray-500">
              Tài khoản được tạo: {new Date(profile.createdAt).toLocaleDateString('vi-VN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          Không thể tải thông tin người dùng
        </div>
      )}
    </StandardDialog>
  );
};

export default UserProfileDialog;
