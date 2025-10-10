import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import KhoaPageManagement from "./KhoaPageManagement";
import KhoaSubRegular from "../khoa_page/KhoaSubRegular";
import KhoaSubUpload from "../khoa_page/KhoaSubUpload";

/**
 * Mount this under your app router, e.g.
 * <Route path="/BCN/khoa_page/*" element={<KhoaPageRoutes/>} />
 */
const KhoaPageRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Main Khoa page (inline editor) */}
      <Route index element={<KhoaPageManagement />} />

      {/* Sub header pages */}
      <Route path="sub/:subId" element={<KhoaSubRegular />} />
      <Route path="sub/:subId/upload" element={<KhoaSubUpload />} />

      {/* Safety fallback */}
      <Route path="*" element={<Navigate to="." replace />} />
    </Routes>
  );
};

export default KhoaPageRoutes;
