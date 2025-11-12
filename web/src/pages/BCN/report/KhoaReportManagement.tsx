import React, { useState, useEffect, useMemo } from "react";
import { apiClient } from "../../../utils/api";
import SearchInput from "../../../components/UI/SearchInput";
import Pagination from "../../../components/UI/Pagination";
import ViewKhoaReportDialog from "./ViewKhoaReportDialog";
import dayjs from "dayjs";
import { useDebounce } from "../../../hooks/useDebounce";
import EmptyState from "../../../components/UI/EmptyState";

export interface KhoaReport {
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
  khoa: string;
  instructor: {
    id: string;
    name: string;
    email: string;
  };
  reviewedBy?: {
    id: string;
    name: string;
    email: string;
  };
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

const KhoaReportManagement: React.FC = () => {
  const [reports, setReports] = useState<KhoaReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [managedSubject, setManagedSubject] = useState<{
    id: string;
    title: string;
  } | null>(null);

  // Filters and pagination
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);
  const [statusFilter, setStatusFilter] = useState<"all" | KhoaReport["status"]>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | KhoaReport["reportType"]>("all");
  const [instructorFilter, setInstructorFilter] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Dialogs
  const [viewingReport, setViewingReport] = useState<KhoaReport | null>(null);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get BCN's managed khoa and its reports
      const [khoaResponse, reportsResponse] = await Promise.all([
        apiClient.getBCNManagedSubject(),
        apiClient.getBCNReports()
      ]);

      if (!khoaResponse.success || !khoaResponse.khoa) {
        setError("Bạn chưa được phân công quản lý khoa nào");
        return;
      }

      setManagedSubject({
        id: khoaResponse.khoa.id,
        title: khoaResponse.khoa.title
      });

      setReports((reportsResponse.reports || []) as KhoaReport[]);

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
      const byInstructor = !instructorFilter || report.instructor.name.toLowerCase().includes(instructorFilter.toLowerCase());
      const byQuery = !q || 
        report.title.toLowerCase().includes(q) ||
        report.content.toLowerCase().includes(q) ||
        report.instructor.name.toLowerCase().includes(q);
      return byStatus && byType && byInstructor && byQuery;
    });
  }, [reports, statusFilter, typeFilter, instructorFilter, debouncedQuery]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = filtered.slice((page - 1) * pageSize, page * pageSize);

// BCN can only VIEW reports, not approve/reject them - review functionality removed

  // Get unique instructors for filter
  const instructors = useMemo(() => {
    const unique = Array.from(new Set(reports.map(r => r.instructor.name))).sort();
    return unique;
  }, [reports]);

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

  if (error || !managedSubject) {
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
    <div className="space-y-3 sm:space-y-4">
      {/* Header and filters */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 flex-wrap sm:items-center">
        <SearchInput
          value={query}
          onChange={(value) => {
            setQuery(value);
            setPage(1);
          }}
          placeholder="Tìm kiếm báo cáo..."
          width="w-full sm:w-[280px]"
        />

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as "all" | KhoaReport["status"]);
            setPage(1);
          }}
          className="h-9 sm:h-10 rounded-lg border border-gray-300 bg-white px-3 pr-8 text-xs sm:text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none w-full sm:min-w-[140px] sm:w-auto touch-manipulation"
        >
          <option value="all">Tất cả trạng thái</option>
          {Object.entries(StatusLabels).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>

        <select
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value as "all" | KhoaReport["reportType"]);
            setPage(1);
          }}
          className="h-9 sm:h-10 rounded-lg border border-gray-300 bg-white px-3 pr-8 text-xs sm:text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none w-full sm:min-w-[140px] sm:w-auto touch-manipulation"
        >
          <option value="all">Tất cả loại</option>
          {Object.entries(ReportTypeLabels).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>

        <select
          value={instructorFilter}
          onChange={(e) => {
            setInstructorFilter(e.target.value);
            setPage(1);
          }}
          className="h-9 sm:h-10 rounded-lg border border-gray-300 bg-white px-3 pr-8 text-xs sm:text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none w-full sm:min-w-[160px] sm:w-auto touch-manipulation"
        >
          <option value="">Tất cả giảng viên</option>
          {instructors.map(instructor => (
            <option key={instructor} value={instructor}>{instructor}</option>
          ))}
        </select>
      </div>

      {/* Reports table */}
      <div className="overflow-hidden rounded-lg sm:rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr className="text-left text-xs font-semibold text-gray-600">
                <th className="px-3 sm:px-4 py-2.5 sm:py-3 min-w-[200px]">Báo cáo</th>
                <th className="px-3 sm:px-4 py-2.5 sm:py-3 min-w-[120px] sm:w-[140px]">Giảng viên</th>
                <th className="px-3 sm:px-4 py-2.5 sm:py-3 min-w-[100px] sm:w-[120px]">Loại</th>
                <th className="px-3 sm:px-4 py-2.5 sm:py-3 min-w-[100px] sm:w-[120px]">Trạng thái</th>
                <th className="px-3 sm:px-4 py-2.5 sm:py-3 min-w-[120px] sm:w-[140px]">Ngày gửi</th>
                <th className="px-3 sm:px-4 py-2.5 sm:py-3 min-w-[120px] sm:w-[140px]">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs sm:text-sm">
              {current.map((report) => (
                <tr key={report._id} className="hover:bg-gray-50/50">
                  <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                    <div className="font-medium text-gray-900">{report.title}</div>
                    <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                      {report.content ? report.content.replace(/<[^>]*>/g, '').slice(0, 100) + '...' : 'Không có nội dung'}
                    </div>
                  </td>
                  <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                    <div className="font-medium text-gray-900">{report.instructor.name}</div>
                    <div className="text-xs text-gray-500">{report.instructor.id}</div>
                  </td>
                  <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                    <span className="inline-flex items-center rounded-full bg-blue-100 text-blue-700 px-2 py-1 text-xs font-medium">
                      {ReportTypeLabels[report.reportType]}
                    </span>
                  </td>
                  <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${StatusColors[report.status]}`}>
                      {StatusLabels[report.status]}
                    </span>
                  </td>
                  <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-gray-500">
                    {report.submittedAt ? dayjs(report.submittedAt).format("DD/MM/YYYY") : "-"}
                  </td>
                  <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <button
                        onClick={() => setViewingReport(report)}
                        className="h-7 w-7 grid place-items-center rounded-md bg-blue-600 text-white hover:bg-blue-700 touch-manipulation"
                        title="Xem chi tiết"
                      >
                        <svg viewBox="0 0 24 24" className="h-4 w-4">
                          <path fill="currentColor" d="M12 5c-7 0-10 7-10 7s3 7 10 7 10-7 10-7-3-7-10-7Zm0 12a5 5 0 1 1 0-10a5 5 0 0 1 0 10Z"/>
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {current.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 sm:px-4 py-2">
                    <EmptyState
                      icon={reports.length === 0 ? "📋" : "🔍"}
                      title={reports.length === 0 ? "Chưa có báo cáo nào" : "Không tìm thấy báo cáo"}
                      description={
                        reports.length === 0
                          ? "Các báo cáo từ giảng viên sẽ xuất hiện ở đây"
                          : "Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm"
                      }
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={page}
          totalPages={pageCount}
          onPageChange={setPage}
        />
      </div>

      {/* Dialogs */}
      <ViewKhoaReportDialog
        open={!!viewingReport}
        onClose={() => setViewingReport(null)}
        report={viewingReport}
      />
    </div>
  );
};

export default KhoaReportManagement;
