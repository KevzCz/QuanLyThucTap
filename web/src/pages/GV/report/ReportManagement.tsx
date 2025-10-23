import React, { useState, useEffect, useMemo } from "react";
import { apiClient } from "../../../utils/api";
import SearchInput from "../../../components/UI/SearchInput";
import Pagination from "../../../components/UI/Pagination";
import CreateReportDialog from "./CreateReportDialog";
import ViewReportDialog from "./ViewReportDialog";
import EditReportDialog from "./EditReportDialog";
import DeleteReportDialog from "./DeleteReportDialog";
import { useToast } from "../../../components/UI/Toast";
import dayjs from "dayjs";
import { useDebounce } from "../../../hooks/useDebounce";
import EmptyState from "../../../components/UI/EmptyState";

export interface TeacherReport {
  _id: string;
  id: string;
  title: string;
  content: string;
  reportType: "tuan" | "thang" | "quy" | "nam" | "khac";
  status: "draft" | "submitted" | "reviewed" | "approved" | "rejected";
  submittedAt?: string;
  reviewedAt?: string;
  reviewNote?: string;
  attachments?: Array<{
    fileName: string;
    fileUrl: string;
    fileSize: number;
  }>;
  createdAt: string;
  updatedAt: string;
  internshipSubject: {
    id: string;
    title: string;
  };
  instructor: {
    id: string;
    name: string;
  };
}

export interface CreateReportData {
  title: string;
  content: string;
  reportType: "tuan" | "thang" | "quy" | "nam" | "khac";
  attachments?: Array<{
    fileName: string;
    fileUrl: string;
    fileSize: number;
  }>;
}

const ReportTypeLabels = {
  "tuan": "Báo cáo tuần",
  "thang": "Báo cáo tháng", 
  "quy": "Báo cáo quý",
  "nam": "Báo cáo năm",
  "khac": "Báo cáo khác"
};

const StatusLabels = {
  "draft": "Bản nháp",
  "submitted": "Đã gửi",
  "reviewed": "Đã xem",
  "approved": "Đã duyệt",
  "rejected": "Từ chối"
};

const StatusColors = {
  "draft": "bg-gray-100 text-gray-700 ring-gray-600/20",
  "submitted": "bg-blue-100 text-blue-700 ring-blue-600/20",
  "reviewed": "bg-yellow-100 text-yellow-700 ring-yellow-600/20",
  "approved": "bg-green-100 text-green-700 ring-green-600/20",
  "rejected": "bg-red-100 text-red-700 ring-red-600/20"
};

const ReportManagement: React.FC = () => {
  const { showSuccess, showError } = useToast();
  
  const [reports, setReports] = useState<TeacherReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentLecturer, setCurrentLecturer] = useState<{
    id: string;
    name: string;
    subjectId?: string;
    subjectTitle?: string;
  } | null>(null);

  // Filters and pagination
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);
  const [statusFilter, setStatusFilter] = useState<"all" | TeacherReport["status"]>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | TeacherReport["reportType"]>("all");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Dialogs
  const [openCreate, setOpenCreate] = useState(false);
  const [viewingReport, setViewingReport] = useState<TeacherReport | null>(null);
  const [editingReport, setEditingReport] = useState<TeacherReport | null>(null);
  const [deletingReport, setDeletingReport] = useState<TeacherReport | null>(null);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get teacher info and reports
      const [teacherResponse, reportsResponse] = await Promise.all([
        apiClient.getLecturerManagedStudents(),
        apiClient.getTeacherReports()
      ]);

      if (!teacherResponse.success || !teacherResponse.lecturer) {
        setError("Bạn chưa được phân công làm giảng viên hướng dẫn thực tập");
        return;
      }

      setCurrentLecturer(teacherResponse.lecturer);
      setReports((reportsResponse.reports || []) as TeacherReport[]);

    } catch (err) {
      console.error("Error loading reports:", err);
      setError("Không thể tải danh sách báo cáo");
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    return reports.filter((report) => {
      const byStatus = statusFilter === "all" || report.status === statusFilter;
      const byType = typeFilter === "all" || report.reportType === typeFilter;
      const byQuery = !q || 
        report.title.toLowerCase().includes(q) ||
        report.content.toLowerCase().includes(q);
      return byStatus && byType && byQuery;
    });
  }, [reports, statusFilter, typeFilter, debouncedQuery]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = filtered.slice((page - 1) * pageSize, page * pageSize);

  const handleCreateReport = async (reportData: CreateReportData) => {
    try {
      const response = await apiClient.createTeacherReport(reportData);
      setReports(prev => [response.report as TeacherReport, ...prev]);
      setOpenCreate(false);
      showSuccess("Tạo báo cáo thành công");
    } catch (err) {
      console.error("Error creating report:", err);
      showError("Không thể tạo báo cáo");
    }
  };

const handleUpdateReport = async (reportId: string, updates: CreateReportData) => {
    try {
        const response = await apiClient.updateTeacherReport(reportId, updates);
        setReports(prev => prev.map(r => r._id === reportId ? response.report as TeacherReport : r));
        setEditingReport(null);
        showSuccess("Cập nhật báo cáo thành công");
    } catch (err) {
        console.error("Error updating report:", err);
        showError("Không thể cập nhật báo cáo");
    }
};

  const handleDeleteReport = async (reportId: string) => {
    try {
      await apiClient.deleteTeacherReport(reportId);
      setReports(prev => prev.filter(r => r._id !== reportId));
      setDeletingReport(null);
      showSuccess("Xóa báo cáo thành công");
    } catch (err) {
      console.error("Error deleting report:", err);
      showError("Không thể xóa báo cáo");
    }
  };

  const handleSubmitReport = async (reportId: string) => {
    try {
      const response = await apiClient.submitTeacherReport(reportId);
      
      // Ensure we preserve all existing report data and only update what changed
setReports(prev => prev.map(r =>
        r._id === reportId
          ? {
        ...r,
        status: response.report.status as TeacherReport["status"],
        submittedAt: response.report.submittedAt ?? r.submittedAt,
        reviewedAt: response.report.reviewedAt ?? r.reviewedAt,
        reviewNote: response.report.reviewNote ?? r.reviewNote,
        updatedAt: response.report.updatedAt ?? r.updatedAt,
        } : r
      ));
      
      // Close view dialog if open for this report
      if (viewingReport?._id === reportId) {
        setViewingReport(null);
      }
      
      showSuccess("Gửi báo cáo thành công");
    } catch (err) {
      console.error("Error submitting report:", err);
      showError("Không thể gửi báo cáo");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-2">
          <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
          <span className="text-gray-500">Đang tải danh sách báo cáo...</span>
        </div>
      </div>
    );
  }

  if (error || !currentLecturer) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">📋</div>
        <div className="text-gray-700 font-medium mb-2">Không thể tải báo cáo</div>
        <div className="text-gray-500 text-sm mb-4">{error}</div>
        <button
          onClick={loadReports}
          className="text-blue-600 hover:text-blue-700 text-sm underline"
        >
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header and filters */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-1">
          <SearchInput
            value={query}
            onChange={(value) => {
              setQuery(value);
              setPage(1);
            }}
            placeholder="Tìm kiếm báo cáo..."
            width="w-[280px]"
          />

          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as "all" | TeacherReport["status"]);
                setPage(1);
              }}
              className="h-10 rounded-lg border border-gray-300 bg-white px-3 pr-8 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none min-w-[140px]"
            >
              <option value="all">Tất cả trạng thái</option>
              {Object.entries(StatusLabels).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>

            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value as "all" | TeacherReport["reportType"]);
                setPage(1);
              }}
              className="h-10 rounded-lg border border-gray-300 bg-white px-3 pr-8 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none min-w-[140px]"
            >
              <option value="all">Tất cả loại</option>
              {Object.entries(ReportTypeLabels).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="order-2 sm:order-1">
            <input
              disabled
              value={`${currentLecturer.subjectTitle || 'Chưa có môn thực tập'} (${currentLecturer.name})`}
              className="h-10 rounded-full border border-gray-300 bg-white px-6 text-sm text-gray-700 text-center min-w-[280px] max-w-[400px] w-full"
            />
          </div>

          <div className="order-1 sm:order-2">
            <button
              onClick={() => setOpenCreate(true)}
              className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 h-10 text-white text-sm hover:bg-emerald-700"
              disabled={!currentLecturer}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4">
                <path fill="currentColor" d="M19 11h-6V5h-2v6H5v2h6v6h2v-6h6z"/>
              </svg>
              Tạo báo cáo
            </button>
          </div>
        </div>
      </div>

      {/* Reports table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr className="text-left text-xs font-semibold text-gray-600">
              <th className="px-4 py-3">Tiêu đề</th>
              <th className="px-4 py-3 w-[120px]">Loại</th>
              <th className="px-4 py-3 w-[120px]">Trạng thái</th>
              <th className="px-4 py-3 w-[140px]">Ngày tạo</th>
              <th className="px-4 py-3 w-[140px]">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {current.map((report) => (
              <tr key={report._id} className="hover:bg-gray-50/50">
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{report.title}</div>
                  <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                    {report.content ? report.content.replace(/<[^>]*>/g, '').slice(0, 100) + '...' : 'Không có nội dung'}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center rounded-full bg-blue-100 text-blue-700 px-2 py-1 text-xs font-medium">
                    {ReportTypeLabels[report.reportType] || "Không xác định"}
                  </span>
                </td>
                                <td className="px-4 py-3">
                                  <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${StatusColors[report.status]}`}>
                                    {StatusLabels[report.status]}
                                  </span>
                                </td>
                                <td className="px-4 py-3">{dayjs(report.createdAt).format("DD/MM/YYYY")}</td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => setViewingReport(report)}
                                      className="h-7 w-7 grid place-items-center rounded-md bg-blue-600 text-white hover:bg-blue-700"
                                      title="Xem"
                                    >
                                      <svg viewBox="0 0 24 24" className="h-4 w-4">
                                        <path fill="currentColor" d="M12 5c-7 0-10 7-10 7s3 7 10 7 10-7 10-7-3-7-10-7Zm0 12a5 5 0 1 1 0-10a5 5 0 0 1 0 10Z"/>
                                      </svg>
                                    </button>
                
                                    {(report.status === "draft" || report.status === "rejected") && (
                                      <button
                                        onClick={() => setEditingReport(report)}
                                        className="h-7 w-7 grid place-items-center rounded-md bg-emerald-600 text-white hover:bg-emerald-700"
                                        title="Sửa"
                                      >
                                        <svg viewBox="0 0 24 24" className="h-4 w-4">
                                          <path fill="currentColor" d="M3 17.2V21h3.8l11-11L14 6.2l-11 11Z"/>
                                        </svg>
                                      </button>
                                    )}
                
                                    {report.status === "draft" && (
                                      <button
                                        onClick={() => handleSubmitReport(report._id)}
                                        className="h-7 w-7 grid place-items-center rounded-md bg-orange-600 text-white hover:bg-orange-700"
                                        title="Gửi báo cáo"
                                      >
                                        <svg viewBox="0 0 24 24" className="h-4 w-4">
                                          <path fill="currentColor" d="M2 21l21-9L2 3v7l15 2-15 2v7z"/>
                                        </svg>
                                      </button>
                                    )}
                
                                    {report.status === "draft" && (
                                      <button
                                        onClick={() => setDeletingReport(report)}
                                        className="h-7 w-7 grid place-items-center rounded-md bg-rose-600 text-white hover:bg-rose-700"
                                        title="Xóa"
                                      >
                                        <svg viewBox="0 0 24 24" className="h-4 w-4">
                                          <path fill="currentColor" d="M6 7h12v2H6zm2 3h8l-1 10H9L8 10Zm3-7h2l1 2h4v2H6V5h4l1-2Z"/>
                                        </svg>
                                      </button>
                                    )}
                                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {current.length === 0 && !loading && (
          <div className="py-12">
            <EmptyState
              icon={reports.length === 0 ? "📋" : "🔍"}
              title={reports.length === 0 ? "Chưa có báo cáo" : "Không tìm thấy báo cáo"}
              description={
                reports.length === 0
                  ? "Tạo báo cáo đầu tiên để ghi nhận hoạt động hướng dẫn."
                  : "Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc."
              }
              action={
                reports.length === 0 && currentLecturer
                  ? {
                      label: "Tạo báo cáo",
                      onClick: () => setOpenCreate(true),
                      icon: "➕"
                    }
                  : undefined
              }
              secondaryAction={
                reports.length > 0
                  ? {
                      label: "Xóa bộ lọc",
                      onClick: () => {
                        setQuery("");
                        setStatusFilter("all");
                        setTypeFilter("all");
                        setPage(1);
                      },
                    }
                  : undefined
              }
            />
          </div>
        )}

        <Pagination
          currentPage={page}
          totalPages={pageCount}
          onPageChange={setPage}
        />
      </div>

      {/* Dialogs */}
      <CreateReportDialog
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        onSubmit={handleCreateReport}
        currentLecturer={currentLecturer}
      />

      <ViewReportDialog
        open={!!viewingReport}
        onClose={() => setViewingReport(null)}
        report={viewingReport}
        onSubmit={viewingReport?.status === "draft" ? () => handleSubmitReport(viewingReport._id) : undefined}
      />

      <EditReportDialog
        open={!!editingReport}
        onClose={() => setEditingReport(null)}
        report={editingReport}
        onSubmit={(updates) => editingReport && handleUpdateReport(editingReport._id, updates)}
      />

      <DeleteReportDialog
        open={!!deletingReport}
        onClose={() => setDeletingReport(null)}
        report={deletingReport}
        onConfirm={() => deletingReport && handleDeleteReport(deletingReport._id)}
      />
    </div>
  );
};

export default ReportManagement;
