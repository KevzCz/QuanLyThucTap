import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/UseAuth";
import { useNotifications } from "../../contexts/UseNotifications";
import NotificationListDialog from "../NotificationListDialog";
import ProfileDialog from "../ProfileDialog";
import GlobalSearch from "../GlobalSearch";
import UserProfileDialog from "../UserProfileDialog";

const BellIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5"><path fill="currentColor" d="M12 2a6 6 0 0 0-6 6v3.28l-1.62 3.24A1 1 0 0 0 5.28 16h13.44a1 1 0 0 0 .9-1.48L18 11.28V8a6 6 0 0 0-6-6zm0 20a3 3 0 0 0 2.995-2.824L15 19h-6a3 3 0 0 0 2.824 2.995L12 22z"/></svg>
);
const UserIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5"><path fill="currentColor" d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5zm0 2c-5 0-9 2.5-9 5.5V22h18v-2.5C21 16.5 17 14 12 14z"/></svg>
);


function roleName(role: string) {
  switch (role) {
    case "phong-dao-tao": return "Phòng Đào Tạo";
    case "ban-chu-nhiem": return "Ban Chủ Nhiệm";
    case "giang-vien": return "Giảng viên";
    case "sinh-vien": return "Sinh viên";
    default: return role;
  }
}

function getPageInfo(pathname: string): { breadcrumb: string; title: string } {
  // Map paths to page names
  const pageMap: Record<string, { breadcrumb: string; title: string }> = {
    "/dashboard": { breadcrumb: "Trang chủ", title: "Trang chủ" },
    "/chat": { breadcrumb: "Chat hỗ trợ", title: "Chat hỗ trợ" },
    
    // PDT pages
    "/accounts": { breadcrumb: "Quản lý tài khoản", title: "Quản lý tài khoản" },
    "/menu-list": { breadcrumb: "Quản lý môn thực tập", title: "Quản lý môn thực tập" },
    "/summary": { breadcrumb: "Quản lý tổng kết", title: "Quản lý tổng kết" },
    "/stats": { breadcrumb: "Thống kê điểm thực tập", title: "Thống kê điểm thực tập" },
    
    // BCN pages
    "/bcn-internship": { breadcrumb: "Quản lý môn thực tập", title: "Quản lý môn thực tập" },
    "/bcn-page": { breadcrumb: "Quản lý trang khoa", title: "Quản lý trang khoa" },
    "/request": { breadcrumb: "Quản lý yêu cầu", title: "Quản lý yêu cầu" },
    "/bcn-reports": { breadcrumb: "Quản lý báo cáo", title: "Quản lý báo cáo" },
    "/grade-review": { breadcrumb: "Duyệt điểm", title: "Duyệt điểm thực tập" },
    
    // GV pages
    "/teacher-students": { breadcrumb: "Quản lý sinh viên", title: "Quản lý sinh viên" },
    "/docs-dept": { breadcrumb: "Xem tài liệu khoa", title: "Xem tài liệu khoa" },
    "/teacher-page": { breadcrumb: "Quản lý trang giảng viên", title: "Quản lý trang giảng viên" },
    "/teacher-internship-registration": { breadcrumb: "Đăng ký môn thực tập", title: "Đăng ký môn thực tập" },
    "/teacher-reports": { breadcrumb: "Quản lý báo cáo", title: "Quản lý báo cáo" },
    "/grade-management": { breadcrumb: "Quản lý điểm", title: "Quản lý điểm thực tập" },
    
    // SV pages
    "/docs-teacher": { breadcrumb: "Xem tài liệu giảng viên", title: "Xem tài liệu giảng viên" },
    "/internship-registration": { breadcrumb: "Đăng ký môn thực tập", title: "Đăng ký môn thực tập" },
    "/my-internship": { breadcrumb: "Thực tập của tôi", title: "Thực tập của tôi" },
    "/profile": { breadcrumb: "Hồ sơ cá nhân", title: "Hồ sơ cá nhân" },
  };

  // Handle detail pages with dynamic IDs
  if (pathname.startsWith("/grade-review/") && pathname !== "/grade-review") {
    return { breadcrumb: "Duyệt điểm / Chi tiết điểm", title: "Chi tiết điểm thực tập" };
  }
  if (pathname.startsWith("/grade-management/") && pathname !== "/grade-management") {
    return { breadcrumb: "Quản lý điểm / Chi tiết sinh viên", title: "Điểm thực tập sinh viên" };
  }

  // Handle sub-routes
  if (pathname.startsWith("/bcn-page/sub/")) {
    return { breadcrumb: "Quản lý trang khoa / Trang con", title: "Trang con khoa" };
  }
  if (pathname.startsWith("/teacher-page/sub/")) {
    return { breadcrumb: "Quản lý trang giảng viên / Trang con", title: "Trang con giảng viên" };
  }
  if (pathname.startsWith("/docs-dept/sub/")) {
    return { breadcrumb: "Xem tài liệu khoa / Trang con", title: "Trang con khoa" };
  }
  if (pathname.startsWith("/docs-teacher/sub/")) {
    return { breadcrumb: "Xem tài liệu giảng viên / Trang con", title: "Trang con giảng viên" };
  }

  // Find exact match or return default
  const pageInfo = pageMap[pathname];
  if (pageInfo) {
    return pageInfo;
  }

  // Default fallback
  return { breadcrumb: "Trang chủ", title: "Trang chủ" };
}

const Header: React.FC = () => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{ id: string; name: string; email: string; role: string } | null>(null);
  const { breadcrumb, title } = getPageInfo(location.pathname);

  const handleUserProfileClick = (user: { id: string; name: string; email: string; role: string }) => {
    setSelectedUser(user);
    setShowUserProfile(true);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (!user) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
      <div className="px-6 py-4 flex items-center justify-between">
        <div>
          <div className="text-sm text-gray-500">{roleName(user.role)} / {breadcrumb}</div>
          <h1 className="text-[15px] font-semibold text-gray-800 mt-1">{title}</h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Notification Button with Dropdown */}
          <div className="relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative h-9 w-9 rounded-md border border-gray-300 bg-white text-gray-700 flex items-center justify-center hover:bg-gray-50" 
              title="Thông báo"
            >
              <BellIcon />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown Panel */}
            <NotificationListDialog 
              open={showNotifications} 
              onClose={() => setShowNotifications(false)} 
            />
          </div>

          <GlobalSearch onUserProfileClick={handleUserProfileClick} />

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowProfile(true)}
              className="inline-flex items-center gap-2 px-3 h-9 rounded-full border border-gray-300 bg-white hover:bg-gray-50 transition-colors"
            >
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-medium text-gray-800">{user.name}</span>
            </button>
            <button 
              onClick={handleLogout}
              className="inline-flex items-center gap-2 px-3 h-9 rounded-md border border-gray-300 bg-white text-gray-800 hover:bg-gray-50"
            >
              <UserIcon />
              <span className="text-sm font-medium">Đăng xuất</span>
            </button>
          </div>
        </div>
      </div>

      {/* Profile Dialog */}
      <ProfileDialog open={showProfile} onClose={() => setShowProfile(false)} />
      
      {/* User Profile Dialog */}
      <UserProfileDialog 
        open={showUserProfile} 
        onClose={() => setShowUserProfile(false)} 
        user={selectedUser} 
      />
    </div>
  );
};

export default Header;
