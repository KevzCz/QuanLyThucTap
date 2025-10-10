import React from "react";
import type { Role } from "../../App";

interface HeaderProps {
  user: { name: string; role: Role };
  onLogout: () => void;
}

const BellIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5"><path fill="currentColor" d="M12 2a6 6 0 0 0-6 6v3.28l-1.62 3.24A1 1 0 0 0 5.28 16h13.44a1 1 0 0 0 .9-1.48L18 11.28V8a6 6 0 0 0-6-6zm0 20a3 3 0 0 0 2.995-2.824L15 19h-6a3 3 0 0 0 2.824 2.995L12 22z"/></svg>
);
const UserIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5"><path fill="currentColor" d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5zm0 2c-5 0-9 2.5-9 5.5V22h18v-2.5C21 16.5 17 14 12 14z"/></svg>
);
const SearchIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4 text-gray-400"><path fill="currentColor" d="M10 2a8 8 0 1 1-5.3 13.9l-3.4 3.4 1.4 1.4 3.4-3.4A8 8 0 0 1 10 2m0 2a6 6 0 1 0 0 12A6 6 0 0 0 10 4z"/></svg>
);

function roleName(role: Role) {
  switch (role) {
    case "phong-dao-tao": return "Phòng Đào Tạo";
    case "ban-chu-nhiem": return "Ban Chủ Nhiệm (Khoa)";
    case "giang-vien": return "Giảng viên";
    case "sinh-vien": return "Sinh viên";
  }
}

const Header: React.FC<HeaderProps> = ({ user, onLogout }) => {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
      <div className="px-6 py-4 flex items-center justify-between">
        <div>
          <div className="text-sm text-gray-500">{roleName(user.role)} / Trang chủ</div>
          <h1 className="text-[15px] font-semibold text-gray-800 mt-1">Trang chủ</h1>
        </div>

        <div className="flex items-center gap-3">
          <button className="h-9 w-9 rounded-md border border-gray-300 bg-white text-gray-700 flex items-center justify-center hover:bg-gray-50" title="Thông báo">
            <BellIcon />
          </button>

          <div className="relative">
            <span className="absolute left-3 top-2.5"><SearchIcon /></span>
            <input
              type="text"
              placeholder="Tìm kiếm"
              className="pl-8 pr-3 py-2 w-[320px] rounded-md border border-gray-300 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button onClick={onLogout} className="inline-flex items-center gap-2 px-3 h-9 rounded-md border border-gray-300 bg-white text-gray-800 hover:bg-gray-50">
            <UserIcon />
            <span className="text-sm font-medium">Đăng xuất</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Header;
