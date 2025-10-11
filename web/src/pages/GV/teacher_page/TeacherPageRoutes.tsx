import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import TeacherPageManagement from "./TeacherPageManagement";
import TeacherSubRegular from "./TeacherSubRegular";
import TeacherSubUpload from "./TeacherSubUpload";

const TeacherPageRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Main Teacher page */}
      <Route index element={<TeacherPageManagement />} />

      {/* Sub header pages */}
      <Route path="sub/:subId" element={<TeacherSubRegular />} />
      <Route path="sub/:subId/upload" element={<TeacherSubUpload />} />

      {/* Safety fallback */}
      <Route path="*" element={<Navigate to="." replace />} />
    </Routes>
  );
};

export default TeacherPageRoutes;
