import React from 'react';
import { Link, useLocation } from 'react-router-dom';

interface SidebarProps {
  userRole: string;
}

const Sidebar: React.FC<SidebarProps> = ({ userRole }) => {
  const location = useLocation();

  const getMenuItems = () => {
    const commonItems = [
      { path: '/dashboard', label: 'Trang chủ', icon: '🏠' }
    ];

    switch (userRole) {
      case 'phong-dao-tao':
        return [
          ...commonItems,
          { path: '/menu-list', label: 'Quản lý thực tập', icon: '👥' }
        ];
      case 'sinh-vien':
        return [
          ...commonItems,
          { path: '/internship-registration', label: 'Đăng ký thực tập', icon: '📝' },
          { path: '/my-internship', label: 'Thực tập của tôi', icon: '📄' },
          { path: '/profile', label: 'Hồ sơ cá nhân', icon: '👤' }
        ];
      case 'doanh-nghiep':
        return [
          ...commonItems,
          { path: '/internship-posts', label: 'Đăng tin thực tập', icon: '📢' },
          { path: '/student-applications', label: 'Đơn ứng tuyển', icon: '📥' },
          { path: '/company-profile', label: 'Hồ sơ công ty', icon: '🏢' }
        ];
      case 'giang-vien':
        return [
          ...commonItems,
          { path: '/student-supervision', label: 'Hướng dẫn sinh viên', icon: '👨‍🏫' },
          { path: '/evaluation', label: 'Đánh giá', icon: '✅' },
          { path: '/schedule', label: 'Lịch trình', icon: '📅' }
        ];
      default:
        return commonItems;
    }
  };

  const menuItems = getMenuItems();

  return (
    <div className="w-full bg-white rounded-2xl flex flex-col shadow-lg border border-gray-200 flex-1">
      <div className="p-5 border-b border-gray-200 text-center rounded-t-2xl">
        <h2 className="text-lg font-semibold text-gray-800 m-0 text-center">Quản lý thực tập</h2>
      </div>
      
      <nav className="flex-1 p-0 rounded-b-2xl">
        <div className="p-6">
          <ul className="list-none p-0 m-0">
            {menuItems.map((item) => (
              <li key={item.path} className="mb-1">
                <Link 
                  to={item.path} 
                  className={`flex items-center px-4 py-3 no-underline rounded-lg transition-all duration-200 ${
                    location.pathname === item.path 
                      ? 'bg-blue-50 text-blue-600 font-medium' 
                      : 'text-gray-600 hover:bg-gray-50 hover:text-blue-600'
                  }`}
                >
                  <span className="mr-3 text-base">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </div>
  );
};

export default Sidebar;
