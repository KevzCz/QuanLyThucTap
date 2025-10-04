import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import DashboardLayout from "./components/Layout/DashboardLayout";
import Dashboard from "./pages/Dashboard";

export default function App() {
  // Mock user data - replace with actual authentication logic
  const [user, setUser] = useState({
    name: "Nguyễn Văn A",
    role: "phong-dao-tao", // Can be: 'phong-dao-tao', 'sinh-vien', 'doanh-nghiep', 'giang-vien'
  });

  const [isLoggedIn, setIsLoggedIn] = useState(true); // Mock login state

  const handleLogout = () => {
    setIsLoggedIn(false);
    console.log("Logging out...");
  };

  // Mock login page - you can replace this with actual login component later
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold mb-4">Đăng nhập</h2>
          <p className="text-gray-600 mb-4">Chọn vai trò để đăng nhập:</p>
          <div className="space-y-2">
            <button 
              onClick={() => { setUser({...user, role: 'phong-dao-tao'}); setIsLoggedIn(true); }}
              className="w-full p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Phòng Đào Tạo
            </button>
            <button 
              onClick={() => { setUser({...user, role: 'sinh-vien'}); setIsLoggedIn(true); }}
              className="w-full p-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Sinh Viên
            </button>
            <button 
              onClick={() => { setUser({...user, role: 'doanh-nghiep'}); setIsLoggedIn(true); }}
              className="w-full p-2 bg-purple-500 text-white rounded hover:bg-purple-600"
            >
              Doanh Nghiệp
            </button>
            <button 
              onClick={() => { setUser({...user, role: 'giang-vien'}); setIsLoggedIn(true); }}
              className="w-full p-2 bg-orange-500 text-white rounded hover:bg-orange-600"
            >
              Giảng Viên
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route
            path="/"
            element={<DashboardLayout user={user} onLogout={handleLogout} />}
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route
              path="dashboard"
              element={<Dashboard userRole={user.role} />}
            />
            {/* Add more routes here for different pages */}
            <Route path="menu-list" element={<div className="p-6">Quản lý thực tập</div>} />
            <Route path="students" element={<div className="p-6">Sinh viên</div>} />
            <Route path="companies" element={<div className="p-6">Doanh nghiệp</div>} />
            <Route path="reports" element={<div className="p-6">Báo cáo</div>} />
            <Route path="internship-registration" element={<div className="p-6">Đăng ký thực tập</div>} />
            <Route path="my-internship" element={<div className="p-6">Thực tập của tôi</div>} />
            <Route path="profile" element={<div className="p-6">Hồ sơ cá nhân</div>} />
            <Route path="internship-posts" element={<div className="p-6">Đăng tin thực tập</div>} />
            <Route path="student-applications" element={<div className="p-6">Đơn ứng tuyển</div>} />
            <Route path="company-profile" element={<div className="p-6">Hồ sơ công ty</div>} />
            <Route path="student-supervision" element={<div className="p-6">Hướng dẫn sinh viên</div>} />
            <Route path="evaluation" element={<div className="p-6">Đánh giá</div>} />
            <Route path="schedule" element={<div className="p-6">Lịch trình</div>} />
          </Route>
        </Routes>
      </div>
    </Router>
  );
}

