import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../../contexts/UseNotifications";
import { apiClient } from "../../utils/api";
import { chatAPI } from "../../services/chatApi";
import type { ChatRequest as ApiChatRequest } from "../../services/chatApi";
import ChatRequestCard from "../../components/chat/ChatRequestCard";
import type { ChatRequest } from "./chat/ChatTypes";
import { useAuth } from "../../contexts/UseAuth";
import { useToast } from "../../components/UI/Toast";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/vi";

dayjs.extend(relativeTime);
dayjs.locale("vi");

interface Statistics {
  totalAccounts: number;
  activeAccounts: number;
  totalSubjects: number;
  activeSubjects: number;
  totalReports: number;
  totalGrades: number;
  averageGrade: number;
  pendingChatRequests: number;
}

const PDTDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { notifications, isLoading: notificationsLoading } = useNotifications();
  const { showSuccess, showError } = useToast();
  
  const [statistics, setStatistics] = useState<Statistics>({
    totalAccounts: 0,
    activeAccounts: 0,
    totalSubjects: 0,
    activeSubjects: 0,
    totalReports: 0,
    totalGrades: 0,
    averageGrade: 0,
    pendingChatRequests: 0,
  });
  const [chatRequests, setChatRequests] = useState<ChatRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);

  // Transform API request to local format
  const transformApiRequestToLocal = useCallback((apiReq: ApiChatRequest): ChatRequest => ({
    id: apiReq.requestId || String(apiReq.createdAt),
    fromUser: {
      id: apiReq.fromUser.userId,
      name: apiReq.fromUser.name,
      role: apiReq.fromUser.role,
      isOnline: apiReq.fromUser.isOnline || false,
    },
    toUser: apiReq.toUser ? {
      id: apiReq.toUser.userId,
      name: apiReq.toUser.name,
      role: apiReq.toUser.role,
      isOnline: apiReq.toUser.isOnline || false,
    } : undefined,
    subject: apiReq.subject,
    message: apiReq.message,
    timestamp: apiReq.createdAt,
    status: (apiReq.status === "expired" || apiReq.status === "cancelled" ? "declined" : apiReq.status) as "pending" | "accepted" | "declined",
    isAssigned: apiReq.isAssigned,
    assignedTo: apiReq.assignedTo ? {
      id: apiReq.assignedTo.userId,
      name: apiReq.assignedTo.name,
      role: apiReq.assignedTo.role as "sinh-vien" | "giang-vien" | "ban-chu-nhiem" | "phong-dao-tao",
      isOnline: false,
    } : undefined,
  }), []);

  // Load statistics
  const loadStatistics = useCallback(async () => {
    try {
      // Fetch accounts
      const accountsResponse = await apiClient.request<{
        success: boolean;
        accounts: Array<{ status: string }>;
      }>("/accounts");
      
      const accounts = accountsResponse.accounts || [];
      const totalAccounts = accounts.length;
      const activeAccounts = accounts.filter(a => a.status === "open").length;

      // Fetch internship subjects
      const subjectsResponse = await apiClient.request<{
        success: boolean;
        subjects: Array<{ status: string }>;
      }>("/internship-subjects");
      
      const subjects = subjectsResponse.subjects || [];
      const totalSubjects = subjects.length;
      const activeSubjects = subjects.filter(s => s.status === "open").length;

      // Fetch reports statistics
      const reportsStatsResponse = await apiClient.request<{
        success: boolean;
        statistics: {
          total: number;
        };
      }>("/reports/pdt/statistics?limit=1");
      
      const totalReports = reportsStatsResponse.statistics?.total || 0;

      // Fetch grades statistics
      const gradesStatsResponse = await apiClient.request<{
        success: boolean;
        statistics: {
          total: number;
          averageGrade: number;
        };
      }>("/grades/pdt/statistics?limit=1");
      
      const totalGrades = gradesStatsResponse.statistics?.total || 0;
      const averageGrade = gradesStatsResponse.statistics?.averageGrade || 0;

      // Fetch pending chat requests
      const chatRequestsResponse = await chatAPI.getChatRequests({ direction: "all", status: "pending" });
      const pendingChatRequests = chatRequestsResponse.length;

      setStatistics({
        totalAccounts,
        activeAccounts,
        totalSubjects,
        activeSubjects,
        totalReports,
        totalGrades,
        averageGrade,
        pendingChatRequests,
      });
    } catch (error) {
      console.error("Error loading statistics:", error);
    }
  }, []);

  // Load chat requests
  const loadChatRequests = useCallback(async () => {
    try {
      setLoadingRequests(true);
      const requests = await chatAPI.getChatRequests({ direction: "all", status: "pending" });
      const transformed = requests.map(transformApiRequestToLocal);
      setChatRequests(transformed);
    } catch (error) {
      console.error("Failed to load chat requests:", error);
    } finally {
      setLoadingRequests(false);
    }
  }, [transformApiRequestToLocal]);

  useEffect(() => {
    loadStatistics();
    loadChatRequests();
  }, [loadStatistics, loadChatRequests]);

  // Handle accept chat request
  const handleAcceptRequest = async (request: ChatRequest) => {
    try {
      await chatAPI.acceptChatRequest(request.id);
      showSuccess("Đã chấp nhận yêu cầu chat");
      loadChatRequests();
      loadStatistics();
    } catch (error) {
      console.error("Failed to accept request:", error);
      showError("Không thể chấp nhận yêu cầu");
    }
  };

  // Handle decline chat request
  const handleDeclineRequest = async (request: ChatRequest) => {
    try {
      await chatAPI.declineChatRequest(request.id, "Phòng đào tạo đã từ chối yêu cầu");
      showSuccess("Đã từ chối yêu cầu chat");
      loadChatRequests();
      loadStatistics();
    } catch (error) {
      console.error("Failed to decline request:", error);
      showError("Không thể từ chối yêu cầu");
    }
  };

  const CircleDiagram: React.FC<{ statistics: Statistics }> = ({ statistics }) => {
    const total = statistics.totalAccounts + statistics.totalSubjects + statistics.totalReports + statistics.totalGrades;
    const accountPercentage = total > 0 ? (statistics.totalAccounts / total) * 100 : 0;
    const subjectPercentage = total > 0 ? (statistics.totalSubjects / total) * 100 : 0;
    const reportPercentage = total > 0 ? (statistics.totalReports / total) * 100 : 0;
    const gradePercentage = total > 0 ? (statistics.totalGrades / total) * 100 : 0;

    return (
      <div className="flex flex-col items-center">
        <svg width="200" height="200" viewBox="0 0 200 200" className="transform -rotate-90">
          {/* Accounts segment (blue) */}
          <circle
            cx="100"
            cy="100"
            r="70"
            fill="none"
            stroke="#3B82F6"
            strokeWidth="30"
            strokeDasharray={`${accountPercentage * 4.4} 440`}
            strokeDashoffset="0"
          />
          {/* Subjects segment (green) */}
          <circle
            cx="100"
            cy="100"
            r="70"
            fill="none"
            stroke="#10B981"
            strokeWidth="30"
            strokeDasharray={`${subjectPercentage * 4.4} 440`}
            strokeDashoffset={`-${accountPercentage * 4.4}`}
          />
          {/* Reports segment (purple) */}
          <circle
            cx="100"
            cy="100"
            r="70"
            fill="none"
            stroke="#8B5CF6"
            strokeWidth="30"
            strokeDasharray={`${reportPercentage * 4.4} 440`}
            strokeDashoffset={`-${(accountPercentage + subjectPercentage) * 4.4}`}
          />
          {/* Grades segment (orange) */}
          <circle
            cx="100"
            cy="100"
            r="70"
            fill="none"
            stroke="#F59E0B"
            strokeWidth="30"
            strokeDasharray={`${gradePercentage * 4.4} 440`}
            strokeDashoffset={`-${(accountPercentage + subjectPercentage + reportPercentage) * 4.4}`}
          />
        </svg>
        <div className="mt-4 grid grid-cols-2 gap-4 w-full">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className="text-xs text-gray-600">Tài khoản</span>
            </div>
            <div className="text-lg font-bold text-blue-600">{statistics.totalAccounts}</div>
            <div className="text-xs text-gray-500">{statistics.activeAccounts} hoạt động</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-xs text-gray-600">Môn TT</span>
            </div>
            <div className="text-lg font-bold text-green-600">{statistics.totalSubjects}</div>
            <div className="text-xs text-gray-500">{statistics.activeSubjects} đang mở</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-full bg-purple-500"></div>
              <span className="text-xs text-gray-600">Báo cáo</span>
            </div>
            <div className="text-lg font-bold text-purple-600">{statistics.totalReports}</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-full bg-orange-500"></div>
              <span className="text-xs text-gray-600">Điểm</span>
            </div>
            <div className="text-lg font-bold text-orange-600">{statistics.totalGrades}</div>
            <div className="text-xs text-gray-500">TB: {statistics.averageGrade.toFixed(1)}</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4 max-h-[calc(100vh-180px)] overflow-hidden">
      {/* Notifications - Full Width */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
            <span className="text-lg">🔔</span>
            Thông báo
          </h3>
          <button
            onClick={() => {/* Open notifications dialog */}}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Xem tất cả
          </button>
        </div>
        {notificationsLoading ? (
          <div className="text-center py-4 text-gray-500">Đang tải...</div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-4 text-gray-500">Không có thông báo mới</div>
        ) : (
          <div className="space-y-2 max-h-[120px] overflow-y-auto">
            {notifications.slice(0, 3).map((notif) => (
              <div
                key={notif._id}
                className="flex items-start gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors"
                onClick={() => {
                  if (notif.link) navigate(notif.link);
                }}
              >
                <span className="text-lg flex-shrink-0">
                  {notif.type === "system" ? "📢" : 
                   notif.type === "deadline-reminder" ? "⏰" : 
                   notif.type === "file-submitted" ? "📤" : "📄"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 font-medium">{notif.title}</p>
                  {notif.message && (
                    <p className="text-xs text-gray-600 mt-0.5 line-clamp-1">{notif.message}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">{dayjs(notif.createdAt).fromNow()}</p>
                </div>
                {!notif.isRead && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1"></div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 overflow-hidden">
        {/* Left Column - Statistics Cards */}
        <div className="lg:col-span-1 overflow-y-auto">
          {/* Quick Stats */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 h-full">
            <div className="space-y-3">
              <div 
                className="flex items-center justify-between p-3 bg-blue-50 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors"
                onClick={() => navigate("/accounts")}
              >
                <div>
                  <div className="text-xs text-blue-600 font-medium">Tài khoản</div>
                  <div className="text-2xl font-bold text-blue-700">{statistics.totalAccounts}</div>
                  <div className="text-xs text-blue-600 mt-1">{statistics.activeAccounts} hoạt động</div>
                </div>
                <span className="text-3xl">👥</span>
              </div>

              <div 
                className="flex items-center justify-between p-3 bg-green-50 rounded-lg cursor-pointer hover:bg-green-100 transition-colors"
                onClick={() => navigate("/menu-list")}
              >
                <div>
                  <div className="text-xs text-green-600 font-medium">Môn thực tập</div>
                  <div className="text-2xl font-bold text-green-700">{statistics.totalSubjects}</div>
                  <div className="text-xs text-green-600 mt-1">{statistics.activeSubjects} đang mở</div>
                </div>
                <span className="text-3xl">📚</span>
              </div>

              <div 
                className="flex items-center justify-between p-3 bg-purple-50 rounded-lg cursor-pointer hover:bg-purple-100 transition-colors"
                onClick={() => navigate("/summary")}
              >
                <div>
                  <div className="text-xs text-purple-600 font-medium">Báo cáo</div>
                  <div className="text-2xl font-bold text-purple-700">{statistics.totalReports}</div>
                </div>
                <span className="text-3xl">📋</span>
              </div>

              <div 
                className="flex items-center justify-between p-3 bg-orange-50 rounded-lg cursor-pointer hover:bg-orange-100 transition-colors"
                onClick={() => navigate("/stats")}
              >
                <div>
                  <div className="text-xs text-orange-600 font-medium">Điểm thực tập</div>
                  <div className="text-2xl font-bold text-orange-700">{statistics.totalGrades}</div>
                  <div className="text-xs text-orange-600 mt-1">TB: {statistics.averageGrade.toFixed(1)}/10</div>
                </div>
                <span className="text-3xl">🎯</span>
              </div>
            </div>
          </div>
        </div>

        {/* Middle Column - Chart */}
        <div className="lg:col-span-1 overflow-y-auto">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 h-full flex items-center justify-center">
            <CircleDiagram statistics={statistics} />
          </div>
        </div>

        {/* Right Column - Chat Requests */}
        <div className="lg:col-span-1 overflow-y-auto">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                <span className="text-lg">💬</span>
                Yêu cầu chat hỗ trợ
                {statistics.pendingChatRequests > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-600 text-xs font-bold rounded-full">
                    {statistics.pendingChatRequests}
                  </span>
                )}
              </h3>
              <button
                onClick={() => navigate("/chat")}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Xem tất cả
              </button>
            </div>
            {loadingRequests ? (
              <div className="text-center py-8 text-gray-500">Đang tải...</div>
            ) : chatRequests.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">✅</div>
                <p>Không có yêu cầu đang chờ</p>
              </div>
            ) : (
              <div className="space-y-3 flex-1 overflow-y-auto">
                {chatRequests.slice(0, 5).map((request) => (
                  <ChatRequestCard
                    key={request.id}
                    request={request}
                    currentUserId={user?.id || ""}
                    currentUserRole="phong-dao-tao"
                    onAccept={handleAcceptRequest}
                    onDecline={handleDeclineRequest}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PDTDashboard;
