import React, { useState, useEffect } from "react";
import PageLayout from "../../../components/UI/PageLayout";
import Pagination from "../../../components/UI/Pagination";
import ViewGradeDialog from "./ViewGradeDialog";
import { useToast } from "../../../components/UI/Toast";

interface Grade {
  id: string;
  student: {
    id: string;
    name: string;
    email: string;
  };
  supervisor: {
    id: string;
    name: string;
  };
  subject: {
    id: string;
    title: string;
  };
  workType: "thuc_tap" | "do_an";
  status: "not_started" | "in_progress" | "draft_completed" | "submitted" | "approved" | "rejected";
  finalGrade?: number;
  letterGrade?: string;
  progressPercentage: number;
  submittedToBCN: boolean;
  startDate: string;
  endDate: string;
  updatedAt: string;
}

interface Statistics {
  total: number;
  byStatus: Record<string, number>;
  byWorkType: Record<string, number>;
  byLetterGrade: Record<string, number>;
  averageGrade: number;
  passRate: number;
  submittedCount: number;
  approvedCount: number;
  totalFinalized: number;
}

const WorkTypeLabels: Record<Grade["workType"], string> = {
  thuc_tap: "Thực tập",
  do_an: "Đồ án"
};

const StatusLabels: Record<Grade["status"], string> = {
  not_started: "Chưa bắt đầu",
  in_progress: "Đang thực hiện",
  draft_completed: "Hoàn thành bản nháp",
  submitted: "Đã nộp",
  approved: "Đã duyệt",
  rejected: "Bị từ chối"
};

const GradeStatistics: React.FC = () => {
  const { showError } = useToast();
  const [grades, setGrades] = useState<Grade[]>([]);
  const [statistics, setStatistics] = useState<Statistics>({
    total: 0,
    byStatus: {},
    byWorkType: {},
    byLetterGrade: {},
    averageGrade: 0,
    passRate: 0,
    submittedCount: 0,
    approvedCount: 0,
    totalFinalized: 0
  });
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Grade["status"]>("all");
  const [workTypeFilter, setWorkTypeFilter] = useState<"all" | Grade["workType"]>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [viewingGrade, setViewingGrade] = useState<Grade | null>(null);
  const [showChart, setShowChart] = useState(false);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter, workTypeFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20"
      });
      
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (workTypeFilter !== "all") params.append("workType", workTypeFilter);

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/grades/pdt/statistics?${params}`,
        { credentials: "include" }
      );

      if (!response.ok) throw new Error("Failed to load grades");

      const data = await response.json();
      setGrades(data.grades);
      setStatistics(data.statistics);
      setTotalPages(data.pagination.pages);
    } catch (error) {
      console.error("Load grades error:", error);
      showError("Không thể tải thống kê điểm");
    } finally {
      setLoading(false);
    }
  };

  const filteredGrades = grades.filter(grade =>
    searchQuery === "" ||
    grade.student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    grade.supervisor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    grade.subject.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: Grade["status"]) => {
    const colors: Record<Grade["status"], string> = {
      not_started: "bg-gray-100 text-gray-700",
      in_progress: "bg-blue-100 text-blue-700",
      draft_completed: "bg-yellow-100 text-yellow-700",
      submitted: "bg-purple-100 text-purple-700",
      approved: "bg-green-100 text-green-700",
      rejected: "bg-red-100 text-red-700"
    };
    return colors[status];
  };

  const getGradeColor = (grade?: number) => {
    if (!grade) return "text-gray-400";
    if (grade >= 8.5) return "text-green-600 font-bold";
    if (grade >= 7.0) return "text-blue-600 font-semibold";
    if (grade >= 5.5) return "text-yellow-600";
    if (grade >= 5.0) return "text-orange-600";
    return "text-red-600 font-semibold";
  };

  const exportToCSV = () => {
    const headers = ["Mã SV", "Sinh viên", "Giảng viên", "Môn TT", "Loại", "Trạng thái", "Điểm", "Xếp loại", "Tiến độ"];
    const rows = filteredGrades.map(g => [
      g.student.id,
      g.student.name,
      g.supervisor.name,
      g.subject.title,
      WorkTypeLabels[g.workType],
      StatusLabels[g.status],
      g.finalGrade?.toFixed(1) || "Chưa có",
      g.letterGrade || "Chưa có",
      `${g.progressPercentage}%`
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `thong-ke-diem-thuc-tap-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // Calculate letter grade distribution for chart
  const letterGradeOrder = ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D+', 'D', 'F'];
  const letterGradeData = letterGradeOrder.map(letter => ({
    grade: letter,
    count: statistics.byLetterGrade[letter] || 0
  }));

  return (
    <>
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
          <div className="text-sm font-medium text-gray-600 mb-1">Tổng sinh viên</div>
          <div className="text-3xl font-bold text-gray-900">{statistics.total}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
          <div className="text-sm font-medium text-gray-600 mb-1">Điểm trung bình</div>
          <div className={`text-3xl font-bold ${getGradeColor(statistics.averageGrade)}`}>
            {statistics.averageGrade > 0 ? statistics.averageGrade.toFixed(2) : "—"}
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
          <div className="text-sm font-medium text-gray-600 mb-1">Tỷ lệ đạt</div>
          <div className="text-3xl font-bold text-green-600">
            {statistics.passRate}%
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
          <div className="text-sm font-medium text-gray-600 mb-1">Đã hoàn thành</div>
          <div className="text-3xl font-bold text-blue-600">
            {statistics.totalFinalized}
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
          <div className="text-sm font-medium text-gray-600 mb-1">Đã duyệt</div>
          <div className="text-3xl font-bold text-emerald-600">
            {statistics.approvedCount}
          </div>
        </div>
      </div>

      {/* Letter Grade Distribution - Collapsible */}
      {statistics.totalFinalized > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-6">
          <button
            onClick={() => setShowChart(!showChart)}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
          >
            <h3 className="text-lg font-semibold text-gray-900">Phân bố xếp loại</h3>
            <svg
              className={`h-5 w-5 text-gray-500 transition-transform ${showChart ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showChart && (
            <div className="p-6 pt-0 border-t border-gray-200">
              <div className="flex items-end gap-4 h-48">
                {letterGradeData.map(({ grade, count }) => {
                  const maxCount = Math.max(...letterGradeData.map(d => d.count), 1);
                  const height = (count / maxCount) * 100;
                  return (
                    <div key={grade} className="flex-1 flex flex-col items-center">
                      <div className="w-full flex flex-col items-center justify-end" style={{ height: '160px' }}>
                        {count > 0 && (
                          <>
                            <div className="text-sm font-semibold text-gray-700 mb-2">{count}</div>
                            <div
                              className="w-full bg-blue-500 rounded-t transition-all duration-500 hover:bg-blue-600"
                              style={{ height: `${height}%` }}
                            />
                          </>
                        )}
                      </div>
                      <div className="text-sm font-semibold text-gray-900 mt-3">{grade}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Toolbar and Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="relative">
            <span className="absolute inset-y-0 left-3 flex items-center text-gray-400">
              <svg viewBox="0 0 24 24" className="h-4 w-4">
                <path
                  fill="currentColor"
                  d="M10 2a8 8 0 1 1-5.3 13.9l-3.4 3.4 1.4 1.4 3.4-3.4A8 8 0 0 1 10 2m0 2a6 6 0 1 0 0 12A6 6 0 0 0 10 4z"
                />
              </svg>
            </span>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo sinh viên, giảng viên, môn..."
              className="w-[320px] h-10 rounded-lg border border-gray-300 bg-white pl-8 pr-3 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
          </div>

          <div className="flex gap-2">
            {(["all", "in_progress", "submitted", "approved"] as const).map((k) => (
              <button
                key={k}
                onClick={() => {
                  setStatusFilter(k);
                  setPage(1);
                }}
                disabled={loading}
                className={`h-10 rounded-lg px-3 text-sm border transition disabled:opacity-50 ${
                  statusFilter === k
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                {k === "all" ? "Tất cả" : k === "in_progress" ? "Đang làm" : k === "submitted" ? "Đã nộp" : "Đã duyệt"}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            {(["all", "thuc_tap", "do_an"] as const).map((k) => (
              <button
                key={k}
                onClick={() => {
                  setWorkTypeFilter(k);
                  setPage(1);
                }}
                disabled={loading}
                className={`h-10 rounded-lg px-3 text-sm border transition disabled:opacity-50 ${
                  workTypeFilter === k
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                {k === "all" ? "Tất cả" : k === "thuc_tap" ? "Thực tập" : "Đồ án"}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={exportToCSV}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-3 h-10 text-white text-sm hover:bg-emerald-700 disabled:opacity-50"
          title="Xuất CSV"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4">
            <path fill="currentColor" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6m4 18H6V4h7v5h5v11m-7-2v-2H9v2h2m4 0v-4h-2v4h2m-8-8v6h2v-6H7Z" />
          </svg>
          Xuất CSV
        </button>
      </div>

      <PageLayout>
        <div className="space-y-6">

      {/* Grades Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã SV</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sinh viên</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Giảng viên</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Môn TT</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loại</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Điểm</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Xếp loại</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tiến độ</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thao tác</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={10} className="px-6 py-12 text-center text-gray-500 text-sm">
                  Đang tải...
                </td>
              </tr>
            ) : filteredGrades.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-6 py-12 text-center text-gray-500 text-sm">
                  Không có dữ liệu điểm
                </td>
              </tr>
            ) : (
              filteredGrades.map((grade) => (
                <tr key={grade.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">{grade.student.id}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">{grade.student.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{grade.supervisor.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                    {grade.subject.title}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                    {WorkTypeLabels[grade.workType]}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(grade.status)}`}>
                      {StatusLabels[grade.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-sm font-semibold ${getGradeColor(grade.finalGrade)}`}>
                      {grade.finalGrade ? grade.finalGrade.toFixed(1) : "—"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">
                    {grade.letterGrade || "—"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 transition-all"
                          style={{ width: `${grade.progressPercentage}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-600 w-10 text-right">{grade.progressPercentage}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => setViewingGrade(grade)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
                    >
                      Xem
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      )}
        </div>
      </PageLayout>

      {viewingGrade && (
        <ViewGradeDialog
          open={!!viewingGrade}
          grade={viewingGrade}
          onClose={() => setViewingGrade(null)}
        />
      )}
    </>
  );
};

export default GradeStatistics;
