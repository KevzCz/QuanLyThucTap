import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import TeacherPageView from "./TeacherPageView";
import TeacherSubViewRegular from "./TeacherSubViewRegular";
import TeacherSubViewUpload from "./TeacherSubViewUpload";

const TeacherPageViewRoutes: React.FC = () => {
  return (
    <Routes>
      <Route index element={<TeacherPageView />} />
      <Route path="sub/:subId" element={<TeacherSubViewRegular />} />
      <Route path="sub/:subId/upload" element={<TeacherSubViewUpload />} />
      <Route path="*" element={<Navigate to="." replace />} />
    </Routes>
  );
};

export default TeacherPageViewRoutes;
