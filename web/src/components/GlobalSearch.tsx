import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../utils/api';
import { useDebounce } from '../hooks/useDebounce';
import { useToast } from './UI/Toast';
import { useAuth } from '../contexts/UseAuth';

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4 text-gray-400">
    <path fill="currentColor" d="M10 2a8 8 0 1 1-5.3 13.9l-3.4 3.4 1.4 1.4 3.4-3.4A8 8 0 0 1 10 2m0 2a6 6 0 1 0 0 12A6 6 0 0 0 10 4z"/>
  </svg>
);

const UserIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5">
    <path fill="currentColor" d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5zm0 2c-5 0-9 2.5-9 5.5V22h18v-2.5C21 16.5 17 14 12 14z"/>
  </svg>
);

const ChatIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4">
    <path fill="currentColor" d="M12 3C6.5 3 2 6.58 2 11c0 2.8 1.89 5.27 4.73 6.61L6 22l5.27-3.16C11.5 18.93 11.74 19 12 19c5.5 0 10-3.58 10-8s-4.5-8-10-8z"/>
  </svg>
);

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface GlobalSearchProps {
  onUserProfileClick?: (user: User) => void;
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

const GlobalSearch: React.FC<GlobalSearchProps> = ({ onUserProfileClick }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debouncedSearch = useDebounce(searchQuery, 300);
  const searchRef = useRef<HTMLDivElement>(null);
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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search users
  useEffect(() => {
    const searchUsers = async () => {
      if (debouncedSearch.trim().length < 2) {
        setUsers([]);
        setIsOpen(false);
        return;
      }

      try {
        setLoading(true);
        const response = await apiClient.request<{ success: boolean; users: User[] }>(
          `/accounts/search?q=${encodeURIComponent(debouncedSearch)}`
        );

        if (response.success) {
          setUsers(response.users);
          setIsOpen(true);
        }
      } catch (error) {
        console.error('Search error:', error);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    searchUsers();
  }, [debouncedSearch]);

  const handleCreateChat = async (user: User) => {
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
          setIsOpen(false);
          setSearchQuery('');
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
          setIsOpen(false);
          setSearchQuery('');
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

  const handleViewProfile = (user: User) => {
    setIsOpen(false);
    setSearchQuery('');
    if (onUserProfileClick) {
      onUserProfileClick(user);
    }
  };

  return (
    <div className="relative" ref={searchRef}>
      <span className="absolute left-3 top-2.5 pointer-events-none">
        <SearchIcon />
      </span>
      <input
        type="text"
        placeholder="Tìm kiếm người dùng..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onFocus={() => {
          if (users.length > 0) setIsOpen(true);
        }}
        className="pl-8 pr-3 py-2 w-[320px] rounded-md border border-gray-300 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {/* Search Results Dropdown */}
      {isOpen && (
        <div className="absolute top-full mt-2 w-[400px] bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-[400px] overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-sm text-gray-500">
              Đang tìm kiếm...
            </div>
          ) : users.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-500">
              {searchQuery.trim().length < 2
                ? 'Nhập ít nhất 2 ký tự để tìm kiếm'
                : 'Không tìm thấy người dùng'}
            </div>
          ) : (
            <div className="py-2">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate">{user.name}</div>
                        <div className="text-xs text-gray-500 truncate">{user.email}</div>
                        <div className="text-xs text-gray-500 mt-0.5">ID: {user.id}</div>
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                          {getRoleName(user.role)}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => handleViewProfile(user)}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 transition-colors whitespace-nowrap"
                        title="Xem hồ sơ"
                      >
                        <UserIcon />
                        <span>Xem</span>
                      </button>
                      <button
                        onClick={() => handleCreateChat(user)}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs rounded-md hover:bg-green-700 transition-colors whitespace-nowrap"
                        title="Tạo chat"
                      >
                        <ChatIcon />
                        <span>Chat</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;
