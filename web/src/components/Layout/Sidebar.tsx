import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Icons } from "../UI/Icons";

type Role = "phong-dao-tao" | "ban-chu-nhiem" | "giang-vien" | "sinh-vien";

interface SidebarProps { userRole: Role; }

type Item = { path: string; label: string; icon: React.ReactNode };
const baseHome: Item = { path: "/dashboard", label: "Trang chủ", icon: <Icons.home /> };

const ROLE_MENUS: Record<Role, Item[]> = {
  "phong-dao-tao": [
    baseHome,
    { path: "/accounts", label: "Quản lý tài khoản", icon: <Icons.users /> },
    { path: "/menu-list", label: "Quản lý môn thực tập", icon: <Icons.book /> },
    { path: "/summary", label: "Quản lý tổng kết", icon: <Icons.file /> },
    { path: "/stats", label: "Thống kê điểm thực tập", icon: <Icons.file /> },
    { path: "/chat", label: "Chat hỗ trợ", icon: <Icons.chat /> },
  ],
  "ban-chu-nhiem": [
    baseHome,
    { path: "/bcn-internship", label: "Quản lý môn thực tập", icon: <Icons.book /> },
    { path: "/bcn-page", label: "Quản lý trang khoa", icon: <Icons.page /> },
    { path: "/request", label: "Quản lý yêu cầu", icon: <Icons.file /> },
    { path: "/bcn-reports", label: "Quản lý báo cáo", icon: <Icons.file /> },
    { path: "/chat", label: "Chat hỗ trợ", icon: <Icons.chat /> },
  ],
  "giang-vien": [
    baseHome,
    { path: "/teacher-students", label: "Quản lý sinh viên", icon: <Icons.users /> },
    { path: "/docs-dept", label: "Xem tài liệu khoa", icon: <Icons.file /> },
    { path: "/teacher-page", label: "Quản lý trang giảng viên", icon: <Icons.page /> },
    { path: "/teacher-internship-registration", label: "Đăng ký môn thực tập", icon: <Icons.book /> },
    { path: "/teacher-reports", label: "Quản lý báo cáo", icon: <Icons.file /> },
    { path: "/chat", label: "Chat hỗ trợ", icon: <Icons.chat /> },
  ],
  "sinh-vien": [
    baseHome,
    { path: "/docs-dept", label: "Xem tài liệu khoa", icon: <Icons.file /> },
    { path: "/docs-teacher", label: "Xem tài liệu giảng viên", icon: <Icons.file /> },
    { path: "/chat", label: "Chat hỗ trợ", icon: <Icons.chat /> },
    { path: "/internship-registration", label: "Đăng ký môn thực tập", icon: <Icons.book /> },
  ],
};

const Sidebar: React.FC<SidebarProps> = ({ userRole }) => {
  const location = useLocation();
  const items = ROLE_MENUS[userRole];

  return (
    <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-200">
      <div className="px-5 py-4 border-b border-gray-200 rounded-t-2xl text-center">
        <h2 className="text-base font-semibold text-gray-800">Quản lý thực tập</h2>
      </div>

      <nav className="p-4">
        <ul className="space-y-1">
          {items.map((item) => {
            const active =
              location.pathname === item.path || location.pathname.startsWith(item.path + "/");
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border transition
                    ${active
                      ? "bg-blue-50 text-blue-600 border-blue-200"
                      : "text-gray-600 border-transparent hover:bg-gray-50 hover:text-blue-600"}`}
                >
                  <span className="shrink-0">{item.icon}</span>
                  <span className="text-sm">{item.label}</span>
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
