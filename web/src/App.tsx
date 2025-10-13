import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import AuthProvider from "./contexts/AuthProvider";
import { useAuth } from "./contexts/UseAuth";
import DashboardLayout from "./components/Layout/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import AccountManagement from "./pages/PDT/account/AccountManagement";
import InternshipSubjectManagement from "./pages/PDT/internship_subject_management/InternshipSubjectManagement";
import BCNInternshipSubjectManagement from "./pages/BCN/internship_subject/InternshipSubjectManagement";
import KhoaPageManagement from "./pages/BCN/khoa_page/KhoaPageManagement";
import KhoaPageRoutes from "./pages/BCN/khoa_page/KhoaPageRoutes";
import RequestManagement from "./pages/BCN/request/RequestManagement";
import StudentManagement from "./pages/GV/student_management/StudentManagement";
import { TeacherPageRoutes } from "./pages/GV";
import { KhoaPageViewRoutes, TeacherPageViewRoutes, InternshipSubjectRegister as SVInternshipSubjectRegister } from "./pages/SV";
import { ChatManagement as PDTChatManagement } from "./pages/PDT";
import { ChatManagement as BCNChatManagement } from "./pages/BCN";
import { ChatManagement as GVChatManagement } from "./pages/GV";
import { ChatManagement as SVChatManagement } from "./pages/SV";
import { InternshipSubjectRegister as GVInternshipSubjectRegister, KhoaPageViewRoutes as GVKhoaPageViewRoutes } from "./pages/GV";

const AppRoutes: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Đang tải...</p>
        </div>
      </div>
    );
  }

  const Stub = (t: string) => <div className="p-6 text-gray-800">{t}</div>;

  return (
    <Routes>
      {/* Public */}
      <Route 
        path="/login" 
        element={!isAuthenticated ? <Login /> : <Navigate to="/dashboard" replace />} 
      />

      {/* Protected */}
      <Route
        path="/"
        element={
          isAuthenticated ? (
            <DashboardLayout />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />

        {/* Common */}
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="chat" element={
          user?.role === "phong-dao-tao" ? <PDTChatManagement /> :
          user?.role === "ban-chu-nhiem" ? <BCNChatManagement /> :
          user?.role === "giang-vien" ? <GVChatManagement /> :
          user?.role === "sinh-vien" ? <SVChatManagement /> :
          Stub("Chat hỗ trợ")
        } />

        {/* PDT - Only accessible by PDT role */}
        {user?.role === "phong-dao-tao" && (
          <>
            <Route path="accounts" element={<AccountManagement />} />
            <Route path="menu-list" element={<InternshipSubjectManagement />} />
            <Route path="summary" element={Stub("Quản lý tổng kết")} />
            <Route path="stats" element={Stub("Thống kê điểm thực tập")} />
          </>
        )}

        {/* BCN - Only accessible by BCN role */}
        {user?.role === "ban-chu-nhiem" && (
          <>
            <Route path="bcn-internship" element={<BCNInternshipSubjectManagement />} />
            <Route path="bcn-page" element={<KhoaPageManagement />} />
            <Route path="bcn-page/*" element={<KhoaPageRoutes />} />
            <Route path="request" element={<RequestManagement />} />
            <Route path="bcn-reports" element={Stub("Quản lý báo cáo (Khoa)")} />
          </>
        )}

        {/* GV - Only accessible by GV role */}
        {user?.role === "giang-vien" && (
          <>
            <Route path="teacher-students" element={<StudentManagement />} />
            <Route path="docs-dept/*" element={<GVKhoaPageViewRoutes />} />
            <Route path="teacher-page/*" element={<TeacherPageRoutes />} />
            <Route path="teacher-internship-registration" element={<GVInternshipSubjectRegister />} />
            <Route path="teacher-reports" element={Stub("Quản lý báo cáo (GV)")} />
          </>
        )}

        {/* SV - Only accessible by SV role */}
        {user?.role === "sinh-vien" && (
          <>
            <Route path="docs-dept/*" element={<KhoaPageViewRoutes />} />
            <Route path="docs-teacher/*" element={<TeacherPageViewRoutes />} />
            <Route path="internship-registration" element={<SVInternshipSubjectRegister />} />
            <Route path="my-internship" element={Stub("Thực tập của tôi")} />
            <Route path="profile" element={Stub("Hồ sơ cá nhân")} />
          </>
        )}
      </Route>

      <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
    </Routes>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}
