import React from 'react';

interface HeaderProps {
  user: {
    name: string;
    role: string;
  };
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, onLogout }) => {
  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'phong-dao-tao': return 'Phòng đào tạo';
      case 'sinh-vien': return 'Sinh viên';
      case 'doanh-nghiep': return 'Doanh nghiệp';
      case 'giang-vien': return 'Giảng viên';
      default: return 'Người dùng';
    }
  };

  return (
    <header className="main-header">
      <div className="header-content">
        <div className="breadcrumb-section">
          <div className="breadcrumb">
            <span className="breadcrumb-text">{getRoleDisplayName(user.role)} / Trang chủ</span>
          </div>
          <h1 className="page-title">Trang chủ (PDT)</h1>
        </div>
        
        <div className="header-actions">
          <div className="search-container">
            <input 
              type="text" 
              placeholder="Tìm kiếm" 
              className="search-input"
            />
          </div>
          
          <div className="user-section">
            <button className="notification-btn">🔔</button>
            <button className="user-btn" onClick={onLogout}>
              👤 Đăng xuất
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
