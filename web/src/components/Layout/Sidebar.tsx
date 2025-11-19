import React from "react";
import { Link, useLocation } from "react-router-dom";

type Role = "phong-dao-tao" | "ban-chu-nhiem" | "giang-vien" | "sinh-vien";

interface SidebarProps { 
  userRole: Role;
  onNavigate?: () => void;
}

type Item = { path: string; label: string; icon: React.ReactNode };
const baseHome: Item = { path: "/dashboard", label: "Trang chủ", icon: <span>🏠</span> };

const ROLE_MENUS: Record<Role, Item[]> = {
  "phong-dao-tao": [
    baseHome,
    { path: "/accounts", label: "Quản lý tài khoản", icon: <span>👥</span> },
    { path: "/hocky", label: "Quản lý học kỳ", icon: <span>📅</span> },
    { path: "/stats", label: "Thống kê điểm", icon: <span>📊</span> },
    { path: "/notifications", label: "Quản lý thông báo", icon: <span>🔔</span> },
    { path: "/chat", label: "Chat hỗ trợ", icon: <span>💬</span> },
  ],
  "ban-chu-nhiem": [
    baseHome,
    { path: "/bcn-internship", label: "Quản lý khoa", icon: <span>📚</span> },
    { path: "/bcn-page", label: "Quản lý trang khoa", icon: <span>🏫</span> },
    { path: "/request", label: "Quản lý yêu cầu", icon: <span>📝</span> },
    { path: "/bcn-reports", label: "Quản lý báo cáo", icon: <span>📄</span> },
    { path: "/notifications", label: "Quản lý thông báo", icon: <span>🔔</span> },
    { path: "/chat", label: "Chat hỗ trợ", icon: <span>💬</span> },
  ],
  "giang-vien": [
    baseHome,
    { path: "/teacher-students", label: "Quản lý sinh viên", icon: <span>👨‍🎓</span> },
    { path: "/docs-dept", label: "Xem tài liệu khoa", icon: <span>📖</span> },
    { path: "/teacher-page", label: "Quản lý trang gv", icon: <span>👨‍🏫</span> },
    { path: "/teacher-reports", label: "Quản lý báo cáo", icon: <span>📑</span> },
    { path: "/grade-management", label: "Quản lý điểm", icon: <span>🎯</span> },
    { path: "/notifications", label: "Quản lý thông báo", icon: <span>🔔</span> },
    { path: "/chat", label: "Chat hỗ trợ", icon: <span>💬</span> },
  ],
  "sinh-vien": [
    baseHome,
    { path: "/docs-dept", label: "Xem tài liệu khoa", icon: <span>📖</span> },
    { path: "/docs-teacher", label: "Xem tài liệu gv", icon: <span>👨‍🏫</span> },
    { path: "/my-internship", label: "Tiến độ thực tập", icon: <span>📊</span> },
    { path: "/notifications", label: "Quản lý thông báo", icon: <span>🔔</span> },
    { path: "/chat", label: "Chat hỗ trợ", icon: <span>💬</span> },
  ],
};

const Sidebar: React.FC<SidebarProps> = ({ userRole, onNavigate }) => {
  const location = useLocation();
  const items = ROLE_MENUS[userRole];

  return (
    <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-200">
      <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-gray-200 rounded-t-2xl text-center">
        <h2 className="text-sm sm:text-base font-semibold text-gray-800">Quản lý thực tập</h2>
      </div>

      <nav className="p-3 sm:p-4">
        <ul className="space-y-1">
          {items.map((item) => {
            const active =
              location.pathname === item.path || location.pathname.startsWith(item.path + "/");
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  onClick={onNavigate}
                  className={`flex items-center gap-3 px-3 sm:px-4 py-2.5 rounded-lg border transition touch-manipulation
                    ${active
                      ? "bg-blue-50 text-blue-600 border-blue-200"
                      : "text-gray-600 border-transparent hover:bg-gray-50 hover:text-blue-600 active:bg-gray-100"}`}
                >
                  <span className="shrink-0 text-base sm:text-lg">{item.icon}</span>
                  <span className="text-sm sm:text-base">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
};

export default Sidebar;
