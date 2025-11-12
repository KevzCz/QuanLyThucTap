import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import AuthProvider from "./contexts/AuthProvider";
import { NotificationProvider } from "./contexts/NotificationContext";
import { useAuth } from "./contexts/UseAuth";
import DashboardLayout from "./components/Layout/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import AccountManagement from "./pages/PDT/account/AccountManagement";
import HocKyManagement from "./pages/PDT/hocky/HocKyManagement";
import BCNInternshipSubjectManagement from "./pages/BCN/khoa_management/KhoaManagement";
import KhoaPageManagement from "./pages/BCN/khoa_page/KhoaPageManagement";
import KhoaPageRoutes from "./pages/BCN/khoa_page/KhoaPageRoutes";
import RequestManagement from "./pages/BCN/request/RequestManagement";
import GradeManagementBCN from "./pages/BCN/grade_management/GradeManagementBCN";
import StudentManagement from "./pages/GV/student_management/StudentManagement";
import GradeManagement from "./pages/GV/grade_management/GradeManagement";
import StudentGradeDetail from "./pages/GV/grade_management/StudentGradeDetail";
import { TeacherPageRoutes, ReportManagement as GVReportManagement } from "./pages/GV";
import { KhoaPageViewRoutes, TeacherPageViewRoutes, StudentProgress } from "./pages/SV";
import { ChatManagement as PDTChatManagement, ReportSummaryManagement, GradeStatistics } from "./pages/PDT";
import { ChatManagement as BCNChatManagement } from "./pages/BCN";
import { ChatManagement as GVChatManagement } from "./pages/GV";
import { ChatManagement as SVChatManagement } from "./pages/SV";
import { KhoaPageViewRoutes as GVKhoaPageViewRoutes } from "./pages/GV";
import { ToastProvider } from './components/UI/Toast';
import KhoaReportManagement from "./pages/BCN/report/KhoaReportManagement";
import NotificationManagement from "./pages/NotificationManagement";
import ChangePasswordDialog from "./components/ChangePasswordDialog";

const AppRoutes: React.FC = () => {
  const { user, isAuthenticated, isLoading, refreshUser } = useAuth();
  const [showPasswordDialog, setShowPasswordDialog] = React.useState(false);

  // Check if user needs to change password
  React.useEffect(() => {
    if (isAuthenticated && user?.mustChangePassword) {
      setShowPasswordDialog(true);
    } else {
      setShowPasswordDialog(false);
    }
  }, [isAuthenticated, user?.mustChangePassword]);

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
    <>
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
        <Route path="notifications" element={<NotificationManagement />} />
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
            <Route path="hocky" element={<HocKyManagement />} />
            <Route path="summary" element={<ReportSummaryManagement />} />
            <Route path="stats" element={<GradeStatistics />} />
          </>
        )}

        {/* BCN - Only accessible by BCN role */}
        {user?.role === "ban-chu-nhiem" && (
          <>
            <Route path="bcn-internship" element={<BCNInternshipSubjectManagement />} />
            <Route path="bcn-page" element={<KhoaPageManagement />} />
            <Route path="bcn-page/*" element={<KhoaPageRoutes />} />
            <Route path="request" element={<RequestManagement />} />
            <Route path="bcn-reports" element={<KhoaReportManagement />}/>
            <Route path="grade-management" element={<GradeManagementBCN />} />
          </>
        )}

        {/* GV - Only accessible by GV role */}
        {user?.role === "giang-vien" && (
          <>
            <Route path="teacher-students" element={<StudentManagement />} />
            <Route path="docs-dept/*" element={<GVKhoaPageViewRoutes />} />
            <Route path="teacher-page/*" element={<TeacherPageRoutes />} />
            <Route path="teacher-reports" element={<GVReportManagement />} />
            <Route path="grade-management" element={<GradeManagement />} />
            <Route path="grade-management/:studentId" element={<StudentGradeDetail />} />
          </>
        )}

        {/* SV - Only accessible by SV role */}
        {user?.role === "sinh-vien" && (
          <>
            <Route path="docs-dept/*" element={<KhoaPageViewRoutes />} />
            <Route path="docs-teacher/*" element={<TeacherPageViewRoutes />} />
            <Route path="my-internship" element={<StudentProgress />} />
            <Route path="profile" element={Stub("Hồ sơ cá nhân")} />
          </>
        )}
      </Route>

      <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
    </Routes>

    {/* Password change dialog */}
    {isAuthenticated && (
      <ChangePasswordDialog
        open={showPasswordDialog}
        isForced={true}
        onSuccess={async () => {
          await refreshUser();
          setShowPasswordDialog(false);
        }}
      />
    )}
    </>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <ToastProvider>
          <Router>
            <AppRoutes />
          </Router>
        </ToastProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}
