import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/UseAuth";
import EmptyState from "../components/UI/EmptyState";
import { apiClient } from "../utils/api";

const ChatIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4"><path fill="currentColor" d="M4 4h16v12H7l-3 3V4z"/></svg>
);
const InfoIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4"><path fill="currentColor" d="M11 9h2v8h-2zm1-6a2 2 0 1 1-2 2 2 2 0 0 1 2-2z"/></svg>
);

const lightBtn =
  "inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white text-gray-800 text-sm px-3 py-1.5 hover:bg-gray-100 active:bg-gray-200 shadow-sm";

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Array<{ id: string; message: string; createdAt: string }>>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(true);

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        setLoadingNotifications(true);
        const response = await apiClient.getNotifications();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const formattedNotifs = (response.notifications || []).map((n: any, idx: number) => ({
          id: n._id || n.id || `notif-${idx}`,
          message: n.message || n.title || '',
          createdAt: n.createdAt || new Date().toISOString()
        }));
        setNotifications(formattedNotifs);
      } catch (error) {
        console.error('Failed to load notifications:', error);
        setNotifications([]);
      } finally {
        setLoadingNotifications(false);
      }
    };

    loadNotifications();
  }, []);

  if (!user) return null;

  return (
    <div className="space-y-4">

      {/* Thông báo */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
        <h3 className="text-base font-semibold text-gray-800 mb-3">Thông báo:</h3>
        <div className="flex flex-col">
          {loadingNotifications ? (
            <div className="py-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-sm text-gray-500 mt-2">Đang tải thông báo...</p>
            </div>
          ) : notifications.length === 0 ? (
            <EmptyState
              icon="📭"
              title="Chưa có thông báo"
              description="Bạn sẽ nhận được thông báo khi có cập nhật mới từ hệ thống"
            />
          ) : (
            notifications.slice(0, 5).map((notif, i) => (
              <div key={notif.id || i} className="text-gray-600 text-sm leading-6 py-1">
                - {new Date(notif.createdAt).toLocaleString('vi-VN')}: {notif.message}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat hỗ trợ */}
      {user.role === "phong-dao-tao" && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-base font-semibold text-gray-800 mb-3">Chat hỗ trợ:</h3>

          <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
            {["Sinh viên A", "Sinh viên B"].map((name) => (
              <div key={name} className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-700">- {name}</span>
                <div className="flex gap-2">
                  <button className={lightBtn}>
                    <ChatIcon />
                    <span>Mở chat</span>
                  </button>
                  <button className={lightBtn}>
                    <InfoIcon />
                    <span>Chi tiết</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
