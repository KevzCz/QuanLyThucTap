import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../../contexts/UseNotifications";
import { Icons } from "../../components/UI/Icons";
import { getStudentProgress, type InternshipGrade } from "../../services/gradeApi";
import { apiClient } from "../../utils/api";
import { useToast } from "../../components/UI/Toast";
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
  type: "milestone" | "submission";
  status: string;
}

const SVDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { notifications, isLoading: notificationsLoading } = useNotifications();
  const { showError } = useToast();
  
  const [currentDate, setCurrentDate] = useState(dayjs());
  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs | null>(null);
  const [grade, setGrade] = useState<InternshipGrade | null>(null);
  const [deadlines, setDeadlines] = useState<DeadlineItem[]>([]);
  const [loadingProgress, setLoadingProgress] = useState(true);
  const [showDeadlineModal, setShowDeadlineModal] = useState(false);

  // Load student progress
  const loadProgress = useCallback(async () => {
    try {
      setLoadingProgress(true);
      const response = await getStudentProgress();
      setGrade(response.grade);

      // Extract deadlines from milestones
      const milestoneDeadlines: DeadlineItem[] = [];
      if (response.grade && response.grade.milestones) {
        response.grade.milestones
          .filter(m => m.status === "pending" || m.status === "in_progress")
          .forEach(m => {
            milestoneDeadlines.push({
              id: m.id,
              title: m.title,
              dueDate: m.dueDate,
              type: "milestone" as const,
              status: m.status,
            });
          });
      }

      // Fetch file submission deadlines
      const fileSubmissionsResponse = await apiClient.request<{
        success: boolean;
        deadlines: Array<{ id: string; title: string; dueDate: string; type: string; status: string }>;
      }>("/pages/deadlines/sinh-vien");

      const submissionDeadlines: DeadlineItem[] = (fileSubmissionsResponse.deadlines || []).map(d => ({
        id: d.id,
        title: d.title,
        dueDate: d.dueDate,
        type: "submission" as const,
        status: d.status,
      }));

      setDeadlines([...milestoneDeadlines, ...submissionDeadlines]);
    } catch (error) {
      console.error("Failed to load progress:", error);
      showError("Không thể tải lịch trình và tiến độ");
    } finally {
      setLoadingProgress(false);
    }
  }, [showError]);

  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  // Calendar logic
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

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return "bg-green-500";
    if (percentage >= 50) return "bg-blue-500";
    if (percentage >= 30) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getGradeStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      not_started: "Chưa bắt đầu",
      in_progress: "Đang thực hiện",
      draft_completed: "Hoàn thành nháp",
      submitted: "Đã nộp",
      approved: "Đã duyệt",
      rejected: "Bị từ chối",
    };
    return statusMap[status] || status;
  };

  const getGradeStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      not_started: "bg-gray-100 text-gray-700",
      in_progress: "bg-blue-100 text-blue-700",
      draft_completed: "bg-yellow-100 text-yellow-700",
      submitted: "bg-purple-100 text-purple-700",
      approved: "bg-green-100 text-green-700",
      rejected: "bg-red-100 text-red-700",
    };
    return colorMap[status] || "bg-gray-100 text-gray-700";
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
        </div>
        <div className="max-h-28 sm:max-h-32 overflow-y-auto touch-manipulation">
          {notificationsLoading ? (
            <div className="py-4 sm:py-6 text-center">
              <div className="animate-spin rounded-full h-5 w-5 sm:h-6 sm:w-6 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-[10px] sm:text-xs text-gray-500 mt-2">Đang tải...</p>
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
                      {notif.type === "chat-message" ? "💬" :
                       notif.type === "report-reviewed" ? "📊" :
                       notif.type === "deadline-reminder" ? "⏰" : "📢"}
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

      {/* Bottom Row: Progress + Calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        {/* Progress Summary */}
        <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-sm border border-gray-200 flex flex-col max-h-[400px] lg:max-h-full">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <h3 className="text-sm sm:text-base font-semibold text-gray-800 flex items-center gap-1.5 sm:gap-2">
              <span className="text-base sm:text-lg">📊</span>
              Tiến độ
            </h3>
            <button
              onClick={() => navigate("/my-internship")}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium touch-manipulation"
            >
              Chi tiết
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loadingProgress ? (
              <div className="flex-1 flex items-center justify-center py-6 sm:py-8">
                <div className="animate-spin rounded-full h-7 w-7 sm:h-8 sm:w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : !grade ? (
              <div className="flex-1 flex items-center justify-center text-center p-3 sm:p-4">
                <div>
                  <div className="text-3xl sm:text-4xl mb-2">📝</div>
                  <p className="text-xs sm:text-sm text-gray-600">Chưa có thông tin</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5 sm:space-y-3">
              {/* Progress bar */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-700">Hoàn thành</span>
                  <span className="text-base sm:text-lg font-bold text-gray-900">{grade.progressPercentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 sm:h-2.5 overflow-hidden">
                  <div
                    className={`h-full ${getProgressColor(grade.progressPercentage)} transition-all duration-500 rounded-full`}
                    style={{ width: `${grade.progressPercentage}%` }}
                  ></div>
                </div>
              </div>

              {/* Status */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 sm:p-2.5">
                <div className="text-[10px] sm:text-xs text-blue-600 font-medium mb-1">Trạng thái</div>
                <div className={`inline-flex px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium ${getGradeStatusColor(grade.status)}`}>
                  {getGradeStatusText(grade.status)}
                </div>
              </div>

              {/* Milestones */}
              {grade.milestones && grade.milestones.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-700 mb-1.5 sm:mb-2">Các mốc</h4>
                  <div className="space-y-1 sm:space-y-1.5">
                    {grade.milestones.slice(0, 2).map((milestone) => (
                      <div
                        key={milestone.id}
                        className={`p-2 rounded-lg border text-xs ${
                          milestone.status === "completed"
                            ? "bg-green-50 border-green-200"
                            : milestone.status === "in_progress"
                            ? "bg-blue-50 border-blue-200"
                            : "bg-gray-50 border-gray-200"
                        }`}
                      >
                        <div className="font-medium text-gray-900 text-[11px] sm:text-xs">{milestone.title}</div>
                        <div className="text-gray-600 mt-0.5 text-[10px] sm:text-xs">
                          {dayjs(milestone.dueDate).format("DD/MM/YYYY")}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Final grade */}
              {grade.finalGrade !== undefined && grade.finalGrade !== null && (
                <div className="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-lg p-2.5 sm:p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] sm:text-xs text-emerald-600 font-medium">Điểm cuối</div>
                    <div className="text-lg sm:text-xl font-bold text-emerald-600">{grade.finalGrade.toFixed(1)}</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

        {/* Calendar */}
        <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 flex flex-col max-h-[400px] lg:max-h-full">
          <div className="p-3 sm:p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-sm sm:text-base font-semibold text-gray-800">📅 Lịch</h3>
              <div className="flex items-center gap-1 sm:gap-2">
                <button
                  onClick={() => setCurrentDate(currentDate.subtract(1, "month"))}
                  className="p-1 sm:p-1.5 hover:bg-gray-100 rounded-lg transition-colors touch-manipulation"
                >
                  <Icons.chevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-600" />
                </button>
                <span className="text-xs sm:text-sm font-medium text-gray-700 min-w-[80px] sm:min-w-[100px] text-center">
                  {currentDate.format("MMMM YYYY")}
                </span>
                <button
                  onClick={() => setCurrentDate(currentDate.add(1, "month"))}
                  className="p-1 sm:p-1.5 hover:bg-gray-100 rounded-lg transition-colors touch-manipulation"
                >
                  <Icons.chevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-600" />
                </button>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 sm:p-3">
            <div className="flex flex-col">
              <div className="grid grid-cols-7 gap-0.5 sm:gap-1 mb-1">
                {["CN", "T2", "T3", "T4", "T5", "T6", "T7"].map((day) => (
                  <div key={day} className="text-center text-[10px] sm:text-xs font-medium text-gray-600 py-0.5 sm:py-1">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
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
                        relative p-0.5 sm:p-1 rounded-md text-[10px] sm:text-xs transition-all min-h-[28px] sm:min-h-[36px] flex flex-col items-center justify-center touch-manipulation
                        ${!isCurrentMonth ? "text-gray-400" : "text-gray-700"}
                        ${isToday ? "bg-blue-100 font-bold" : ""}
                        ${hasDeadlines && isCurrentMonth ? "bg-purple-50 hover:bg-purple-100 cursor-pointer border border-purple-200" : ""}
                        ${!hasDeadlines ? "cursor-default" : ""}
                      `}
                    >
                      <span>{date.date()}</span>
                      {hasDeadlines && isCurrentMonth && (
                        <div className="absolute bottom-0.5 left-1/2 transform -translate-x-1/2 flex gap-0.5">
                          {deadlinesForDay.slice(0, 3).map((_, i) => (
                            <div key={i} className="w-0.5 h-0.5 sm:w-1 sm:h-1 rounded-full bg-purple-600"></div>
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
      </div>

      {/* Deadline Modal */}
      {showDeadlineModal && selectedDate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowDeadlineModal(false)}>
          <div className="bg-white rounded-2xl p-4 sm:p-6 max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4">
              Công việc - {selectedDate.format("DD/MM/YYYY")}
            </h3>
            <div className="space-y-2.5 sm:space-y-3 max-h-80 sm:max-h-96 overflow-y-auto">
              {getDeadlinesForDate(selectedDate).map((deadline) => (
                <div key={deadline.id} className="p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className="text-xl sm:text-2xl">🎯</div>
                    <div className="flex-1">
                      <h4 className="font-medium text-sm sm:text-base text-gray-900">{deadline.title}</h4>
                      <div className="text-xs text-gray-600 mt-1">
                        Mốc thời gian
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowDeadlineModal(false)}
              className="mt-3 sm:mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm touch-manipulation"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SVDashboard;
