import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import reactLogo from '../../assets/react.svg';
import './DashboardLayout.css';

interface DashboardLayoutProps {
  user: {
    name: string;
    role: string;
  };
  onLogout: () => void;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ user, onLogout }) => {
  return (
    <div className="dashboard-layout">
      <div className="sidebar-container">
        <div className="dummy-logo">
          <img src={reactLogo} alt="Logo" className="logo-image" />
        </div>
        <Sidebar userRole={user.role} />
      </div>
      <div className="main-content">
        <Header user={user} onLogout={onLogout} />
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
