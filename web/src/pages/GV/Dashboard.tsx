import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../../contexts/UseNotifications";
import { Icons } from "../../components/UI/Icons";
import { chatAPI } from "../../services/chatApi";
import type { ChatRequest as ApiChatRequest } from "../../services/chatApi";
import ChatRequestCard from "../../components/chat/ChatRequestCard";
import type { ChatRequest } from "../PDT/chat/ChatTypes";
import { useAuth } from "../../contexts/UseAuth";
import { useToast } from "../../components/UI/Toast";
import { apiClient } from "../../utils/api";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import isoWeek from "dayjs/plugin/isoWeek";
import "dayjs/locale/vi";

dayjs.extend(relativeTime);
dayjs.extend(isoWeek);
dayjs.locale("vi");

interface DeadlineItem {
  id: string;
  title: string;
  dueDate: string;
  type: "report" | "milestone" | "submission";
  status: string;
}

const GVDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { notifications, isLoading: notificationsLoading } = useNotifications();
  const { showSuccess, showError } = useToast();
  
  const [currentDate, setCurrentDate] = useState(dayjs());
  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs | null>(null);
  const [deadlines, setDeadlines] = useState<DeadlineItem[]>([]);
  const [showDeadlineModal, setShowDeadlineModal] = useState(false);
  const [chatRequests, setChatRequests] = useState<ChatRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);

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

  const loadDeadlines = useCallback(async () => {
    try {
      const reportsResponse = await apiClient.request<{
        success: boolean;
        reports: Array<{ _id: string; title: string; dueDate: string; status: string }>;
      }>("/reports/teacher");

      const reportDeadlines: DeadlineItem[] = (reportsResponse.reports || [])
        .filter(r => r.status === "submitted" || r.status === "pending")
        .map(r => ({
          id: r._id,
          title: r.title,
          dueDate: r.dueDate,
          type: "report" as const,
          status: r.status,
        }));

      const gradesResponse = await apiClient.request<{
        success: boolean;
        grades: Array<{
          _id: string;
          milestones?: Array<{ id: string; title: string; dueDate: string; status: string }>;
        }>;
      }>("/grades/supervisor/students");

      const milestoneDeadlines: DeadlineItem[] = [];
      (gradesResponse.grades || []).forEach(grade => {
        if (grade.milestones) {
          grade.milestones.forEach(m => {
            if (m.status === "pending" || m.status === "in_progress") {
              milestoneDeadlines.push({
                id: m.id,
                title: m.title,
                dueDate: m.dueDate,
                type: "milestone",
                status: m.status,
              });
            }
          });
        }
      });

      // Fetch file submission deadlines
      const fileSubmissionsResponse = await apiClient.request<{
        success: boolean;
        deadlines: Array<{ id: string; title: string; dueDate: string; type: string; status: string }>;
      }>("/pages/deadlines/giang-vien");

      const submissionDeadlines: DeadlineItem[] = (fileSubmissionsResponse.deadlines || []).map(d => ({
        id: d.id,
        title: d.title,
        dueDate: d.dueDate,
        type: "submission" as const,
        status: d.status,
      }));

      setDeadlines([...reportDeadlines, ...milestoneDeadlines, ...submissionDeadlines]);
    } catch (error) {
      console.error("Failed to load deadlines:", error);
    }
  }, []);

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
    loadDeadlines();
    loadChatRequests();
  }, [loadDeadlines, loadChatRequests]);

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

  const handleDeclineRequest = async (request: ChatRequest) => {
    try {
      await chatAPI.declineChatRequest(request.id, "Giảng viên đã từ chối yêu cầu");
      showSuccess("Đã từ chối yêu cầu chat");
      loadChatRequests();
    } catch (error) {
      console.error("Failed to decline request:", error);
      showError("Không thể từ chối yêu cầu");
    }
  };

  const startOfMonth = currentDate.startOf("month");
  const endOfMonth = currentDate.endOf("month");
  const startDate = startOfMonth.startOf("week");
  const endDate = endOfMonth.endOf("week");

  const calendarDays: dayjs.Dayjs[] = [];
  let day = startDate;
  while (day.isBefore(endDate) || day.isSame(endDate, "day")) {
    calendarDays.push(day);
    day = day.add(1, "day");
  }

  const getDeadlinesForDate = (date: dayjs.Dayjs): DeadlineItem[] => {
    return deadlines.filter(d => dayjs(d.dueDate).isSame(date, "day"));
  };

  const handleDateClick = (date: dayjs.Dayjs) => {
    const dayDeadlines = getDeadlinesForDate(date);
    if (dayDeadlines.length > 0) {
      setSelectedDate(date);
      setShowDeadlineModal(true);
    }
  };

  const handlePreviousMonth = () => setCurrentDate(currentDate.subtract(1, "month"));
  const handleNextMonth = () => setCurrentDate(currentDate.add(1, "month"));

  return (
    <div className="flex flex-col gap-4 max-h-[calc(100vh-180px)] overflow-hidden">
      {/* Notifications - Full Width */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
            <span className="text-lg">🔔</span>
            Thông báo
          </h3>
        </div>
        <div className="max-h-32 overflow-y-auto">
          {notificationsLoading ? (
            <div className="py-6 text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600 mx-auto"></div>
              <p className="text-xs text-gray-500 mt-2">Đang tải...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-6 text-center">
              <div className="text-3xl mb-2">📭</div>
              <p className="text-sm text-gray-600">Chưa có thông báo</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.slice(0, 3).map((notif) => (
                <div
                  key={notif._id}
                  className={`p-3 rounded-lg border transition-all ${
                    notif.isRead 
                      ? "bg-gray-50 border-gray-200" 
                      : "bg-emerald-50 border-emerald-200"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <div className="text-lg">
                      {notif.type === "report-reviewed" ? "📊" :
                       notif.type === "chat-request" ? "💬" :
                       notif.type === "student-assigned" ? "👤" : "📢"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-medium text-sm text-gray-900">{notif.title}</h4>
                        {!notif.isRead && (
                          <span className="w-2 h-2 bg-emerald-600 rounded-full flex-shrink-0 mt-1"></span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{notif.message}</p>
                      <span className="text-xs text-gray-500 mt-1 inline-block">{dayjs(notif.createdAt).fromNow()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row: Calendar + Chat Requests */}
      <div className="grid grid-cols-2 gap-4 flex-1 min-h-0 overflow-hidden">
        {/* Calendar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden max-h-full">
          <div className="p-4 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-800">📅 Lịch trình</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePreviousMonth}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Icons.chevronLeft className="w-4 h-4 text-gray-600" />
                </button>
                <span className="text-sm font-medium text-gray-700 min-w-[100px] text-center">
                  {currentDate.format("MMMM YYYY")}
                </span>
                <button
                  onClick={handleNextMonth}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Icons.chevronRight className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-hidden p-3 min-h-0">
            <div className="h-full flex flex-col">
              <div className="grid grid-cols-7 gap-1 mb-1 flex-shrink-0">
                {["CN", "T2", "T3", "T4", "T5", "T6", "T7"].map((day) => (
                  <div key={day} className="text-center text-xs font-medium text-gray-600 py-1">
                    {day}
                  </div>
                ))}
              </div>
              <div className="flex-1 grid grid-cols-7 gap-1 auto-rows-fr min-h-0">
                {calendarDays.map((date, index) => {
                  const deadlinesForDay = getDeadlinesForDate(date);
                  const hasDeadlines = deadlinesForDay.length > 0;
                  const isCurrentMonth = date.month() === currentDate.month();
                  const isToday = date.isSame(dayjs(), "day");

                  return (
                    <button
                      key={index}
                      onClick={() => hasDeadlines && handleDateClick(date)}
                      className={`
                        relative p-1 rounded-md text-xs transition-all min-h-[36px] flex flex-col items-center justify-center
                        ${!isCurrentMonth ? "text-gray-400" : "text-gray-700"}
                        ${isToday ? "bg-emerald-100 font-bold" : ""}
                        ${hasDeadlines && isCurrentMonth ? "bg-emerald-50 hover:bg-emerald-100 cursor-pointer border border-emerald-200" : ""}
                        ${!hasDeadlines ? "cursor-default" : ""}
                      `}
                    >
                      <span>{date.date()}</span>
                      {hasDeadlines && isCurrentMonth && (
                        <div className="absolute bottom-0.5 left-1/2 transform -translate-x-1/2 flex gap-0.5">
                          {deadlinesForDay.slice(0, 3).map((_, i) => (
                            <div key={i} className="w-1 h-1 rounded-full bg-emerald-600"></div>
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Chat Requests */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden max-h-full">
          <div className="p-4 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                <span className="text-lg">💬</span>
                Yêu cầu chat
              </h3>
              <button
                onClick={() => navigate("/chat")}
                className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
              >
                Tất cả
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto min-h-0">
            {loadingRequests ? (
              <div className="py-6 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600 mx-auto"></div>
                <p className="text-xs text-gray-500 mt-2">Đang tải...</p>
              </div>
            ) : chatRequests.length === 0 ? (
              <div className="py-6 text-center">
                <div className="text-3xl mb-2">✅</div>
                <p className="text-sm text-gray-600">Không có yêu cầu</p>
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

      {/* Deadline Modal */}
      {showDeadlineModal && selectedDate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowDeadlineModal(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Công việc - {selectedDate.format("DD/MM/YYYY")}
            </h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {getDeadlinesForDate(selectedDate).map((deadline) => (
                <div key={deadline.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">
                      {deadline.type === "report" ? "📊" : "🎯"}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{deadline.title}</h4>
                      <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          deadline.status === "completed" ? "bg-green-100 text-green-700" :
                          deadline.status === "in-progress" || deadline.status === "in_progress" ? "bg-blue-100 text-blue-700" :
                          "bg-yellow-100 text-yellow-700"
                        }`}>
                          {deadline.status === "completed" ? "Hoàn thành" :
                           deadline.status === "in-progress" || deadline.status === "in_progress" ? "Đang thực hiện" :
                           "Chưa bắt đầu"}
                        </span>
                        <span>•</span>
                        <span>{deadline.type === "report" ? "Báo cáo" : "Mốc tiến độ"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowDeadlineModal(false)}
              className="mt-4 w-full px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GVDashboard;
