import React, { useState, useEffect } from "react";
import PageLayout from "../../../components/UI/PageLayout";
import PageToolbar from "../../../components/UI/PageToolbar";
import FilterButtonGroup from "../../../components/UI/FilterButtonGroup";
import SearchInput from "../../../components/UI/SearchInput";
import Pagination from "../../../components/UI/Pagination";
import ViewGradeDialog from "./ViewGradeDialog";

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
    <PageLayout
      title="Thống kê điểm thực tập"
      breadcrumb={[
        { label: "Trang chủ", path: "/pdt" },
        { label: "Thống kê điểm" }
      ]}
    >
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-600">Tổng sinh viên</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{statistics.total}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-600">Điểm trung bình</div>
          <div className={`text-2xl font-bold mt-1 ${getGradeColor(statistics.averageGrade)}`}>
            {statistics.averageGrade > 0 ? statistics.averageGrade.toFixed(2) : "—"}
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-600">Tỷ lệ đạt</div>
          <div className="text-2xl font-bold text-green-600 mt-1">
            {statistics.passRate}%
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-600">Đã hoàn thành</div>
          <div className="text-2xl font-bold text-blue-600 mt-1">
            {statistics.totalFinalized}
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-600">Đã duyệt</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">
            {statistics.approvedCount}
          </div>
        </div>
      </div>

      {/* Letter Grade Distribution */}
      {statistics.totalFinalized > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Phân bố xếp loại</h3>
          <div className="flex items-end gap-3 h-48">
            {letterGradeData.map(({ grade, count }) => {
              const maxCount = Math.max(...letterGradeData.map(d => d.count), 1);
              const height = (count / maxCount) * 100;
              return (
                <div key={grade} className="flex-1 flex flex-col items-center">
                  <div className="w-full flex flex-col items-center justify-end" style={{ height: '150px' }}>
                    {count > 0 && (
                      <>
                        <div className="text-xs font-medium text-gray-700 mb-1">{count}</div>
                        <div
                          className="w-full bg-blue-500 rounded-t transition-all duration-500 hover:bg-blue-600"
                          style={{ height: `${height}%` }}
                        />
                      </>
                    )}
                  </div>
                  <div className="text-sm font-medium text-gray-900 mt-2">{grade}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <PageToolbar>
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Tìm theo sinh viên, giảng viên, môn..."
        />
        <div className="flex gap-2">
          <button
            onClick={exportToCSV}
            className="h-9 px-4 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 text-sm font-medium"
          >
            📊 Xuất CSV
          </button>
        </div>
      </PageToolbar>

      {/* Filters */}
      <div className="flex gap-4 mb-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Trạng thái</label>
          <FilterButtonGroup
            options={[
              { key: "all", label: "Tất cả" },
              { key: "in_progress", label: "Đang làm" },
              { key: "submitted", label: "Đã nộp" },
              { key: "approved", label: "Đã duyệt" }
            ]}
            value={statusFilter}
            onChange={(v) => {
              setStatusFilter(v as typeof statusFilter);
              setPage(1);
            }}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Loại</label>
          <FilterButtonGroup
            options={[
              { key: "all", label: "Tất cả" },
              { key: "thuc_tap", label: "Thực tập" },
              { key: "do_an", label: "Đồ án" }
            ]}
            value={workTypeFilter}
            onChange={(v) => {
              setWorkTypeFilter(v as typeof workTypeFilter);
              setPage(1);
            }}
          />
        </div>
      </div>

      {/* Grades Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mã SV</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sinh viên</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Giảng viên</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Môn TT</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Loại</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Điểm</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Xếp loại</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tiến độ</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thao tác</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                  Đang tải...
                </td>
              </tr>
            ) : filteredGrades.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                  Không có dữ liệu điểm
                </td>
              </tr>
            ) : (
              filteredGrades.map((grade) => (
                <tr key={grade.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{grade.student.id}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{grade.student.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{grade.supervisor.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                    {grade.subject.title}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {WorkTypeLabels[grade.workType]}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(grade.status)}`}>
                      {StatusLabels[grade.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-sm font-semibold ${getGradeColor(grade.finalGrade)}`}>
                      {grade.finalGrade ? grade.finalGrade.toFixed(1) : "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {grade.letterGrade || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 transition-all"
                          style={{ width: `${grade.progressPercentage}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-600">{grade.progressPercentage}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setViewingGrade(grade)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
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
        <div className="mt-4">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      )}

      {viewingGrade && (
        <ViewGradeDialog
          open={!!viewingGrade}
          grade={viewingGrade}
          onClose={() => setViewingGrade(null)}
        />
      )}
    </PageLayout>
  );
};

export default GradeStatistics;
