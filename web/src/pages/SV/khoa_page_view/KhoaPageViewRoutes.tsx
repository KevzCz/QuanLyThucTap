import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import KhoaPageView from "./KhoaPageView";
import KhoaSubViewRegular from "./KhoaSubViewRegular";
import KhoaSubViewUpload from "./KhoaSubViewUpload";

const KhoaPageViewRoutes: React.FC = () => {
  return (
    <Routes>
      <Route index element={<KhoaPageView />} />
      <Route path="sub/:subId" element={<KhoaSubViewRegular />} />
      <Route path="sub/:subId/upload" element={<KhoaSubViewUpload />} />
      <Route path="*" element={<Navigate to="." replace />} />
    </Routes>
  );
};

export default KhoaPageViewRoutes;
