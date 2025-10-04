import React from 'react';

interface DashboardProps {
  userRole: string;
}

const Dashboard: React.FC<DashboardProps> = ({ userRole }) => {
  return (
    <>
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
        <h3 className="text-base font-semibold text-gray-800 mb-4">Thông báo:</h3>
        <div className="flex flex-col gap-2">
          <div className="text-gray-600 text-sm leading-6 py-1">
            - 22/09/2025 tại 11:50 PM: TenPDT/TenBCN/TenGV đã...
          </div>
          <div className="text-gray-600 text-sm leading-6 py-1">
            - 22/09/2025 tại 11:50 PM: TenPDT/TenBCN/TenGV đã...
          </div>
          <div className="text-gray-600 text-sm leading-6 py-1">
            - 22/09/2025 tại 11:50 PM: TenPDT/TenBCN/TenGV đã...
          </div>
          <div className="text-gray-600 text-sm leading-6 py-1">
            - 22/09/2025 tại 11:50 PM: TenPDT/TenBCN/TenGV đã...
          </div>
          <div className="text-gray-600 text-sm leading-6 py-1">
            - 22/09/2025 tại 11:50 PM: TenPDT/TenBCN/TenGV đã...
          </div>
        </div>
      </div>

      {userRole === 'phong-dao-tao' && (
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
          <h3 className="text-base font-semibold text-gray-800 mb-4">Chat hỗ trợ:</h3>
          <div className="flex flex-col gap-2 bg-gray-50 p-3 border border-gray-200 rounded-md">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">- Sinh viên A</span>
              <div className="flex gap-2">
                <button className="bg-white border border-gray-300 px-2 py-1.5 rounded cursor-pointer text-sm transition-all duration-200 hover:bg-gray-100 hover:border-gray-400">
                  💬
                </button>
                <button className="bg-white border border-gray-300 px-2 py-1.5 rounded cursor-pointer text-sm transition-all duration-200 hover:bg-gray-100 hover:border-gray-400">
                  📋
                </button>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">- Sinh viên B</span>
              <div className="flex gap-2">
                <button className="bg-white border border-gray-300 px-2 py-1.5 rounded cursor-pointer text-sm transition-all duration-200 hover:bg-gray-100 hover:border-gray-400">
                  💬
                </button>
                <button className="bg-white border border-gray-300 px-2 py-1.5 rounded cursor-pointer text-sm transition-all duration-200 hover:bg-gray-100 hover:border-gray-400">
                  📋
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Dashboard;

