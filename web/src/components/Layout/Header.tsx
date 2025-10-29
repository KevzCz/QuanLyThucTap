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
const LogoutIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5"><path fill="currentColor" d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/></svg>
);
const MenuIcon = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6"><path fill="currentColor" d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/></svg>
);

interface HeaderProps {
  onMenuToggle?: () => void;
}


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

const Header: React.FC<HeaderProps> = ({ onMenuToggle }) => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{ id: string; name: string; email: string; role: string } | null>(null);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1280);
  const { breadcrumb, title } = getPageInfo(location.pathname);

  // Track window size to show/hide menu button
  React.useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1280);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
      <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 flex items-center justify-between gap-2 sm:gap-3">
        {/* Left section with menu button and page title */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          {/* Mobile menu button - only show when not desktop (< 1280px) */}
          {!isDesktop && (
            <button
              onClick={onMenuToggle}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 flex-shrink-0"
              aria-label="Toggle menu"
            >
              <MenuIcon />
            </button>
          )}

          {/* Page info */}
          <div className="min-w-0 flex-1">
            <div className="text-xs sm:text-sm text-gray-500 truncate">
              <span className="hidden sm:inline">{roleName(user.role)} / </span>
              {breadcrumb}
            </div>
            <h1 className="text-sm sm:text-[15px] font-semibold text-gray-800 mt-0.5 sm:mt-1 truncate">{title}</h1>
          </div>
        </div>

        {/* Right section with actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 flex-shrink-0">
          {/* Notification Button */}
          <div className="relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative h-8 w-8 sm:h-9 sm:w-9 rounded-md border border-gray-300 bg-white text-gray-700 flex items-center justify-center hover:bg-gray-50 touch-manipulation" 
              title="Thông báo"
            >
              <BellIcon />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 sm:h-5 sm:w-5 rounded-full bg-red-500 text-white text-[10px] sm:text-xs font-bold flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            <NotificationListDialog 
              open={showNotifications} 
              onClose={() => setShowNotifications(false)} 
            />
          </div>

          {/* Global Search - hidden on small screens */}
          <div className="hidden sm:block">
            <GlobalSearch onUserProfileClick={handleUserProfileClick} />
          </div>

          {/* User profile and logout */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Profile button */}
            <button
              onClick={() => setShowProfile(true)}
              className="inline-flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 h-8 sm:h-9 rounded-full border border-gray-300 bg-white hover:bg-gray-50 transition-colors touch-manipulation"
            >
              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] sm:text-xs font-bold flex-shrink-0">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <span className="hidden md:inline text-sm font-medium text-gray-800 truncate max-w-[100px]">{user.name}</span>
            </button>

            {/* Logout button */}
            <button 
              onClick={handleLogout}
              className="inline-flex items-center gap-2 px-2 sm:px-3 h-8 sm:h-9 rounded-md border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 touch-manipulation"
              title="Đăng xuất"
            >
              <LogoutIcon />
              <span className="hidden md:inline text-sm font-medium">Đăng xuất</span>
            </button>
          </div>
        </div>
      </div>

      <ProfileDialog open={showProfile} onClose={() => setShowProfile(false)} />
      <UserProfileDialog 
        open={showUserProfile} 
        onClose={() => setShowUserProfile(false)} 
        user={selectedUser} 
      />
    </div>
  );
};

export default Header;
