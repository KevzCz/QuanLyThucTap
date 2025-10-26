import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../../contexts/UseNotifications";
import { apiClient } from "../../utils/api";
import { chatAPI } from "../../services/chatApi";
import type { ChatRequest as ApiChatRequest } from "../../services/chatApi";
import ChatRequestCard from "../../components/chat/ChatRequestCard";
import type { ChatRequest } from "../PDT/chat/ChatTypes";
import { useAuth } from "../../contexts/UseAuth";
import { useToast } from "../../components/UI/Toast";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/vi";

dayjs.extend(relativeTime);
dayjs.locale("vi");

interface Statistics {
  totalReports: number;
  pendingReports: number;
  totalStudents: number;
  activeSubjects: number;
  totalRequests: number;
  pendingRequests: number;
}

const BCNDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { notifications, isLoading: notificationsLoading } = useNotifications();
  const { showSuccess, showError } = useToast();
  
  const [statistics, setStatistics] = useState<Statistics>({
    totalReports: 0,
    pendingReports: 0,
    totalStudents: 0,
    activeSubjects: 0,
    totalRequests: 0,
    pendingRequests: 0,
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
      
      // Fetch reports
      const reportsResponse = await apiClient.request<{
        success: boolean;
        reports: Array<{ status: string }>;
      }>("/reports/bcn");
      
      const reports = reportsResponse.reports || [];
      const totalReports = reports.length;
      const pendingReports = reports.filter(r => r.status === "submitted").length;

      // Fetch students count from managed subjects
      const subjectsResponse = await apiClient.request<{
        success: boolean;
        subjects: Array<{ status: string; students: Array<{ id?: string; _id?: string }> }>;
      }>("/internship-subjects/bcn/managed");
      
      const subjects = subjectsResponse.subjects || [];
      const activeSubjects = subjects.filter(s => s.status === "open").length;
      
      // Count unique students from all subjects
      const studentIds = new Set<string>();
      subjects.forEach(subject => {
        if (subject.students && Array.isArray(subject.students)) {
          subject.students.forEach((student) => {
            if (student.id || student._id) {
              studentIds.add(student.id || student._id || '');
            }
          });
        }
      });
      const totalStudents = studentIds.size;

      // Fetch requests
      const requestsResponse = await apiClient.request<{
        success: boolean;
        requests: Array<{ status: string }>;
      }>("/requests/bcn/pending");
      
      const requests = requestsResponse.requests || [];
      const totalRequests = requests.length;
      const pendingRequests = requests.filter(r => r.status === "pending").length;

      setStatistics({
        totalReports,
        pendingReports,
        totalStudents,
        activeSubjects,
        totalRequests,
        pendingRequests,
      });
    } catch (error) {
      console.error("Error loading statistics:", error);
      showError("Không thể tải thống kê");
    }
  }, [showError]);

  // Load chat requests
  const loadChatRequests = useCallback(async () => {
    try {
      setLoadingRequests(true);
      const requests = await chatAPI.getChatRequests({ direction: "all", status: "pending" });
      const transformed = requests.map(transformApiRequestToLocal);
      setChatRequests(transformed);
    } catch (error) {
      console.error("Failed to load chat requests:", error);
      showError("Không thể tải yêu cầu chat");
    } finally {
      setLoadingRequests(false);
    }
  }, [transformApiRequestToLocal, showError]);

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
    } catch (error) {
      console.error("Failed to accept request:", error);
      showError("Không thể chấp nhận yêu cầu");
    }
  };

  // Handle decline chat request
  const handleDeclineRequest = async (request: ChatRequest) => {
    try {
      await chatAPI.declineChatRequest(request.id, "Ban chủ nhiệm đã từ chối yêu cầu");
      showSuccess("Đã từ chối yêu cầu chat");
      loadChatRequests();
    } catch (error) {
      console.error("Failed to decline request:", error);
      showError("Không thể từ chối yêu cầu");
    }
  };

  const CircleDiagram: React.FC<{ statistics: Statistics }> = ({ statistics }) => {
    const total = statistics.totalReports + statistics.totalStudents + statistics.activeSubjects;
    const reportPercentage = total > 0 ? (statistics.totalReports / total) * 100 : 0;
    const studentPercentage = total > 0 ? (statistics.totalStudents / total) * 100 : 0;
    const subjectPercentage = total > 0 ? (statistics.activeSubjects / total) * 100 : 0;

    return (
      <div className="flex flex-col items-center w-full">
        <svg width="160" height="160" viewBox="0 0 200 200" className="transform -rotate-90 sm:w-[180px] sm:h-[180px] lg:w-[200px] lg:h-[200px]">
          {/* Reports segment (blue) */}
          <circle
            cx="100"
            cy="100"
            r="70"
            fill="none"
            stroke="#3B82F6"
            strokeWidth="30"
            strokeDasharray={`${reportPercentage * 4.4} 440`}
            strokeDashoffset="0"
          />
          {/* Students segment (green) */}
          <circle
            cx="100"
            cy="100"
            r="70"
            fill="none"
            stroke="#10B981"
            strokeWidth="30"
            strokeDasharray={`${studentPercentage * 4.4} 440`}
            strokeDashoffset={`-${reportPercentage * 4.4}`}
          />
          {/* Subjects segment (purple) */}
          <circle
            cx="100"
            cy="100"
            r="70"
            fill="none"
            stroke="#8B5CF6"
            strokeWidth="30"
            strokeDasharray={`${subjectPercentage * 4.4} 440`}
            strokeDashoffset={`-${(reportPercentage + studentPercentage) * 4.4}`}
          />
        </svg>
        <div className="mt-3 sm:mt-4 grid grid-cols-3 gap-2 sm:gap-3 lg:gap-4 w-full">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 sm:gap-2 mb-1">
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-blue-500"></div>
              <span className="text-[10px] sm:text-xs text-gray-600">Báo cáo</span>
            </div>
            <div className="text-base sm:text-lg font-bold text-blue-600">{statistics.totalReports}</div>
            <div className="text-[10px] sm:text-xs text-gray-500">{statistics.pendingReports} chờ duyệt</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 sm:gap-2 mb-1">
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-green-500"></div>
              <span className="text-[10px] sm:text-xs text-gray-600">Sinh viên</span>
            </div>
            <div className="text-base sm:text-lg font-bold text-green-600">{statistics.totalStudents}</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 sm:gap-2 mb-1">
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-purple-500"></div>
              <span className="text-[10px] sm:text-xs text-gray-600">Môn TT</span>
            </div>
            <div className="text-base sm:text-lg font-bold text-purple-600">{statistics.activeSubjects}</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      {/* Notifications - Full Width */}
      <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-2 sm:mb-3">
          <h3 className="text-sm sm:text-base font-semibold text-gray-800 flex items-center gap-1.5 sm:gap-2">
            <span className="text-base sm:text-lg">🔔</span>
            Thông báo
          </h3>
          <button
            onClick={() => {/* Open notifications dialog */}}
            className="text-xs sm:text-sm text-blue-600 hover:text-blue-700 font-medium touch-manipulation"
          >
            Xem tất cả
          </button>
        </div>
        <div className="max-h-28 sm:max-h-32 overflow-y-auto">
          {notificationsLoading ? (
            <div className="py-4 sm:py-6 text-center">
              <div className="animate-spin rounded-full h-5 w-5 sm:h-6 sm:w-6 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-xs text-gray-500 mt-2">Đang tải...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-4 sm:py-6 text-center">
              <div className="text-2xl sm:text-3xl mb-2">📭</div>
              <p className="text-xs sm:text-sm text-gray-600">Chưa có thông báo</p>
            </div>
          ) : (
            <div className="space-y-1.5 sm:space-y-2">
              {notifications.slice(0, 3).map((notif) => (
                <div
                  key={notif._id}
                  onClick={() => notif.link && navigate(notif.link)}
                  className={`p-2.5 sm:p-3 rounded-lg border transition-all touch-manipulation ${
                    notif.isRead 
                      ? "bg-gray-50 border-gray-200" 
                      : "bg-blue-50 border-blue-200"
                  } ${notif.link ? "cursor-pointer hover:shadow-md" : ""}`}
                >
                  <div className="flex items-start gap-1.5 sm:gap-2">
                    <div className="text-base sm:text-lg">
                      {notif.type === "report-reviewed" ? "📊" :
                       notif.type === "chat-request" ? "💬" :
                       notif.type === "student-assigned" ? "👤" : "📢"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-medium text-xs sm:text-sm text-gray-900">{notif.title}</h4>
                        {!notif.isRead && (
                          <span className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1"></span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{notif.message}</p>
                      <span className="text-[10px] sm:text-xs text-gray-500 mt-1 inline-block">{dayjs(notif.createdAt).fromNow()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row: Statistics + Chat Requests */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        {/* Statistics */}
        <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-sm border border-gray-200 flex flex-col">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <h3 className="text-sm sm:text-base font-semibold text-gray-800">Thống kê</h3>
            <button
              onClick={() => navigate("/bcn-internship")}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium touch-manipulation"
            >
              Chi tiết
            </button>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center">
            <CircleDiagram statistics={statistics} />
          </div>
        </div>

        {/* Chat Requests */}
        <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 flex flex-col max-h-[400px] lg:max-h-full">
          <div className="p-3 sm:p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-sm sm:text-base font-semibold text-gray-800 flex items-center gap-1.5 sm:gap-2">
                <span className="text-base sm:text-lg">💬</span>
                Yêu cầu chat
              </h3>
              <button
                onClick={() => navigate("/chat")}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium touch-manipulation"
              >
                Tất cả
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loadingRequests ? (
              <div className="py-4 sm:py-6 text-center">
                <div className="animate-spin rounded-full h-5 w-5 sm:h-6 sm:w-6 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-xs text-gray-500 mt-2">Đang tải...</p>
              </div>
            ) : chatRequests.length === 0 ? (
              <div className="py-4 sm:py-6 text-center">
                <div className="text-2xl sm:text-3xl mb-2">✅</div>
                <p className="text-xs sm:text-sm text-gray-600">Không có yêu cầu</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {chatRequests.slice(0, 3).map((request) => (
                  <ChatRequestCard
                    key={request.id}
                    request={request}
                    currentUserId={user?.id || ""}
                    currentUserRole={user?.role || ""}
                    onAccept={handleAcceptRequest}
                    onDecline={handleDeclineRequest}
                    onClick={() => navigate("/chat")}
                    showActions={true}
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

export default BCNDashboard;
