import React from "react";
import { useAuth } from "../contexts/UseAuth";
import { Dashboard as BCNDashboard } from "./BCN";
import { Dashboard as GVDashboard } from "./GV";
import { Dashboard as SVDashboard } from "./SV";
import { PDTDashboard } from "./PDT";

const Dashboard: React.FC = () => {
  const { user } = useAuth();

  if (!user) return null;

  // Route to role-specific dashboard
  switch (user.role) {
    case "ban-chu-nhiem":
      return <BCNDashboard />;
    case "giang-vien":
      return <GVDashboard />;
    case "sinh-vien":
      return <SVDashboard />;
    case "phong-dao-tao":
      return <PDTDashboard />;
    default:
      return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
          <div className="text-center py-12">
            <div className="text-6xl mb-4">❓</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Không xác định vai trò
            </h3>
            <p className="text-gray-600">
              Vui lòng liên hệ quản trị viên để được hỗ trợ
            </p>
          </div>
        </div>
      );
  }
};

export default Dashboard;

