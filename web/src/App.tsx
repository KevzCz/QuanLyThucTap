import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import DashboardLayout from "./components/Layout/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import AccountManagement from "./pages/PDT/account/AccountManagement";
import InternshipSubjectManagement from "./pages/PDT/internship_subject_management/InternshipSubjectManagement";
import BCNInternshipSubjectManagement from "./pages/BCN/internship_subject/InternshipSubjectManagement";
import KhoaPageManagement  from "./pages/BCN/khoa_page/KhoaPageManagement";
export type Role = "phong-dao-tao" | "ban-chu-nhiem" | "giang-vien" | "sinh-vien";
import KhoaPageRoutes  from "./pages/BCN/khoa_page/KhoaPageRoutes";
import RequestManagement from "./pages/BCN/request/RequestManagement";
import StudentManagement from "./pages/GV/student_management/StudentManagement";
import { TeacherPageRoutes } from "./pages/GV";
import { KhoaPageViewRoutes, TeacherPageViewRoutes, InternshipSubjectRegister } from "./pages/SV";
import { ChatManagement as PDTChatManagement } from "./pages/PDT";
import { ChatManagement as BCNChatManagement } from "./pages/BCN";
import { ChatManagement as GVChatManagement } from "./pages/GV";
import { ChatManagement as SVChatManagement } from "./pages/SV";

<Route path="/BCN/khoa_page/*" element={<KhoaPageRoutes />} />
export default function App() {
  const [user, setUser] = useState({
    name: "Nguyễn Văn A",
    role: "phong-dao-tao" as Role,
  });
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleLogout = () => setIsLoggedIn(false);
  const handlePickRole = (role: Role) => {
    setUser((u) => ({ ...u, role }));
    setIsLoggedIn(true);
  };

  const Stub = (t: string) => <div className="p-6 text-gray-800">{t}</div>;

  return (
    <Router>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login onSelectRole={handlePickRole} />} />

        {/* Protected */}
        <Route
          path="/"
          element={
            isLoggedIn ? (
              <DashboardLayout user={user} onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />

          {/* Common */}
          <Route path="dashboard" element={<Dashboard userRole={user.role} />} />
          <Route path="chat" element={
            user.role === "phong-dao-tao" ? <PDTChatManagement /> :
            user.role === "ban-chu-nhiem" ? <BCNChatManagement /> :
            user.role === "giang-vien" ? <GVChatManagement /> :
            user.role === "sinh-vien" ? <SVChatManagement /> :
            Stub("Chat hỗ trợ")
          } />

          {/* ---- PĐT ---- */}
          <Route path="accounts" element={<AccountManagement />} />
          <Route path="menu-list" element={<InternshipSubjectManagement />} />
          <Route path="request" element={<RequestManagement />} />
          <Route path="summary" element={Stub("Quản lý tổng kết")} />
          <Route path="stats" element={Stub("Thống kê điểm thực tập")} />

          {/* ---- BCN ---- */}
          <Route path="bcn-internship" element={<BCNInternshipSubjectManagement />} />
          <Route path="bcn-page" element={<KhoaPageManagement />} />
          <Route path="bcn-page/*" element={<KhoaPageRoutes />} />
          <Route path="bcn-reports" element={Stub("Quản lý báo cáo (Khoa)")} />

          {/* ---- GV ---- */}
          <Route path="teacher-students" element={<StudentManagement />} />
          <Route path="teacher-page/*" element={<TeacherPageRoutes />} />
          <Route path="teacher-reports" element={Stub("Quản lý báo cáo (GV)")} />

          {/* ---- SV ---- */}
          <Route path="docs-dept/*" element={<KhoaPageViewRoutes />} />
          <Route path="docs-teacher/*" element={<TeacherPageViewRoutes />} />
          <Route path="internship-registration" element={<InternshipSubjectRegister />} />
          <Route path="my-internship" element={Stub("Thực tập của tôi")} />
          <Route path="profile" element={Stub("Hồ sơ cá nhân")} />
        </Route>

        <Route path="*" element={<Navigate to={isLoggedIn ? "/dashboard" : "/login"} replace />} />
      </Routes>
    </Router>
  );
}
