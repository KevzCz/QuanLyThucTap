import React, { type JSX } from "react";
import { Link, useLocation } from "react-router-dom";
import type { Role } from "../../App";

interface SidebarProps { userRole: Role; }

const I = {
  home: () => <svg viewBox="0 0 24 24" className="h-5 w-5"><path fill="currentColor" d="M12 3 3 10h3v9h5v-6h2v6h5v-9h3z"/></svg>,
  users: () => <svg viewBox="0 0 24 24" className="h-5 w-5"><path fill="currentColor" d="M16 11a4 4 0 1 0-3-6.9A6 6 0 0 1 20 10v1h-4zM8 13a4 4 0 1 0-3-6.9A6 6 0 0 1 12 12v1H8zM2 19a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v2H2zM14 21v-2a7 7 0 0 1 7-7h1v9z"/></svg>,
  book: () => <svg viewBox="0 0 24 24" className="h-5 w-5"><path fill="currentColor" d="M4 3h12a3 3 0 0 1 3 3v14H7a3 3 0 0 0-3 3zM7 5v12a5 5 0 0 1 5-5h7V6a1 1 0 0 0-1-1z"/></svg>,
  summary: () => <svg viewBox="0 0 24 24" className="h-5 w-5"><path fill="currentColor" d="M5 3h14v2H5zm0 4h14v2H5zm0 4h9v2H5zm0 4h9v2H5z"/></svg>,
  stats: () => <svg viewBox="0 0 24 24" className="h-5 w-5"><path fill="currentColor" d="M3 21V4h2v15h16v2zm4 0v-8h3v8zm5 0V8h3v13zm5 0V5h3v16z"/></svg>,
  chat: () => <svg viewBox="0 0 24 24" className="h-5 w-5"><path fill="currentColor" d="M4 4h16v11H7l-3 3z"/></svg>,
  file: () => <svg viewBox="0 0 24 24" className="h-5 w-5"><path fill="currentColor" d="M14 2H6a2 2 0 0 0-2 2v16l4-4h8a2 2 0 0 0 2-2V6z"/></svg>,
  page: () => <svg viewBox="0 0 24 24" className="h-5 w-5"><path fill="currentColor" d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6zM14 3v5h5"/></svg>,
  form: () => <svg viewBox="0 0 24 24" className="h-5 w-5"><path fill="currentColor" d="M4 3h16v18H4zM7 7h10v2H7zm0 4h10v2H7zm0 4h6v2H7z"/></svg>,
};

type Item = { path: string; label: string; icon: JSX.Element };
const baseHome: Item = { path: "/dashboard", label: "Trang chủ", icon: <I.home /> };

const ROLE_MENUS: Record<Role, Item[]> = {
  "phong-dao-tao": [
    baseHome,
    { path: "/accounts", label: "Quản lý tài khoản", icon: <I.users /> },
    { path: "/menu-list", label: "Quản lý môn thực tập", icon: <I.book /> },
    { path: "/summary", label: "Quản lý tổng kết", icon: <I.summary /> },
    { path: "/stats", label: "Thống kê điểm thực tập", icon: <I.stats /> },
    { path: "/chat", label: "Quản lý chat", icon: <I.chat /> },
  ],
  "ban-chu-nhiem": [
    baseHome,
    { path: "/bcn-internship", label: "Quản lý môn thực tập", icon: <I.book /> },
    { path: "/bcn-page", label: "Quản lý trang khoa", icon: <I.page /> },
    { path: "/bcn-reports", label: "Quản lý báo cáo", icon: <I.summary /> },
    { path: "/chat", label: "Chat hỗ trợ", icon: <I.chat /> },
  ],
  "giang-vien": [
    baseHome,
    { path: "/teacher-students", label: "Quản lý sinh viên", icon: <I.users /> },
    { path: "/teacher-page", label: "Quản lý trang giảng viên", icon: <I.page /> },
    { path: "/teacher-reports", label: "Quản lý báo cáo", icon: <I.summary /> },
    { path: "/chat", label: "Chat hỗ trợ", icon: <I.chat /> },
  ],
  "sinh-vien": [
    baseHome,
    { path: "/docs-dept", label: "Xem tài liệu khoa", icon: <I.file /> },
    { path: "/docs-teacher", label: "Xem tài liệu giảng viên", icon: <I.file /> },
    { path: "/chat", label: "Chat hỗ trợ", icon: <I.chat /> },
    { path: "/internship-registration", label: "Đăng ký môn thực tập", icon: <I.form /> },
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
