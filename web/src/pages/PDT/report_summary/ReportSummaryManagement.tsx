import React, { useState, useEffect } from "react";
import PageLayout from "../../../components/UI/PageLayout";
import Pagination from "../../../components/UI/Pagination";
import ViewReportDialog from "./ViewReportDialog";
import { useToast } from "../../../components/UI/Toast";
import { useDebounce } from "../../../hooks/useDebounce";

interface Report {
  _id: string;
  id: string;
  title: string;
  content: string;
  reportType: "tuan" | "thang" | "quy" | "nam" | "khac";
  status: "draft" | "submitted" | "reviewed" | "approved" | "rejected";
  submittedAt?: string;
  reviewedAt?: string;
  reviewNote?: string;
  instructor: {
    id: string;
    name: string;
    email: string;
  };
  internshipSubject: {
    id: string;
    title: string;
  };
  reviewedBy?: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

const ReportTypeLabels: Record<Report["reportType"], string> = {
  tuan: "Tuần",
  thang: "Tháng",
  quy: "Quý",
  nam: "Năm",
  khac: "Khác"
};

const StatusLabels: Record<Report["status"], string> = {
  draft: "Bản nháp",
  submitted: "Đã gửi",
  reviewed: "Đã xem xét",
  approved: "Đã duyệt",
  rejected: "Bị từ chối"
};

const ReportSummaryManagement: React.FC = () => {
  const { showError } = useToast();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 500);
  const [statusFilter, setStatusFilter] = useState<"all" | Report["status"]>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | Report["reportType"]>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [viewingReport, setViewingReport] = useState<Report | null>(null);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter, typeFilter, debouncedSearch]);

  const loadData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10"
      });
      
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (typeFilter !== "all") params.append("reportType", typeFilter);
      if (debouncedSearch) params.append("search", debouncedSearch);

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/reports/pdt/statistics?${params}`,
        { credentials: "include" }
      );

      if (!response.ok) throw new Error("Failed to load reports");

      const data = await response.json();
      setReports(data.reports);
      setTotalPages(data.pagination.pages);
    } catch (error) {
      console.error("Load reports error:", error);
      showError("Không thể tải danh sách báo cáo");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: Report["status"]) => {
    const colors: Record<Report["status"], string> = {
      draft: "bg-gray-100 text-gray-700",
      submitted: "bg-blue-100 text-blue-700",
      reviewed: "bg-yellow-100 text-yellow-700",
      approved: "bg-green-100 text-green-700",
      rejected: "bg-red-100 text-red-700"
    };
    return colors[status];
  };

  const exportToCSV = () => {
    const headers = ["Mã BC", "Tiêu đề", "Loại", "Trạng thái", "Giảng viên", "Môn TT", "Ngày tạo"];
    const rows = reports.map(r => [
      r.id,
      r.title,
      ReportTypeLabels[r.reportType],
      StatusLabels[r.status],
      r.instructor.name,
      r.internshipSubject.title,
      new Date(r.createdAt).toLocaleDateString("vi-VN")
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `bao-cao-tong-ket-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <>
      {/* Search, Filters, and Export */}
      <div className="flex flex-col gap-3 mb-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
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
              placeholder="Tìm theo tiêu đề, giảng viên, môn..."
              className="w-full sm:w-[320px] h-10 rounded-lg border border-gray-300 bg-white pl-8 pr-3 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
          </div>

          <button
            onClick={exportToCSV}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-600 px-3 h-10 text-white text-sm hover:bg-emerald-700 disabled:opacity-50 touch-manipulation"
            title="Xuất CSV"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4">
              <path fill="currentColor" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6m4 18H6V4h7v5h5v11m-7-2v-2H9v2h2m4 0v-4h-2v4h2m-8-8v6h2v-6H7Z" />
            </svg>
            <span className="hidden sm:inline">Xuất CSV</span>
            <span className="sm:hidden">CSV</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as typeof statusFilter);
              setPage(1);
            }}
            disabled={loading}
            className="h-10 px-3 rounded-lg border border-gray-300 bg-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 touch-manipulation"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="submitted">Đã gửi</option>
            <option value="reviewed">Đã xem xét</option>
            <option value="approved">Đã duyệt</option>
            <option value="rejected">Bị từ chối</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value as typeof typeFilter);
              setPage(1);
            }}
            disabled={loading}
            className="h-10 px-3 rounded-lg border border-gray-300 bg-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 touch-manipulation"
          >
            <option value="all">Tất cả loại</option>
            <option value="tuan">Tuần</option>
            <option value="thang">Tháng</option>
            <option value="quy">Quý</option>
            <option value="nam">Năm</option>
          </select>
        </div>
      </div>

      <PageLayout>
      <div className="space-y-6">

      {/* Reports Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap w-[80px] sm:w-[100px]">Mã BC</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px]">Tiêu đề</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap w-[80px]">Loại</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap min-w-[120px]">Giảng viên</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[140px]">Môn TT</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap w-[110px] sm:w-[120px]">Trạng thái</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap w-[90px] sm:w-[100px]">Ngày tạo</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap w-[80px]"></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500 text-xs sm:text-sm">
                    Đang tải...
                  </td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500 text-xs sm:text-sm">
                    Không có báo cáo nào
                  </td>
                </tr>
              ) : (
                reports.map((report) => (
                  <tr key={report._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 sm:px-6 py-4 text-xs sm:text-sm font-medium text-gray-900 whitespace-nowrap">{report.id}</td>
                    <td className="px-3 sm:px-6 py-4 text-xs sm:text-sm text-gray-900 max-w-xs truncate">
                      {report.title}
                    </td>
                    <td className="px-3 sm:px-6 py-4 text-xs sm:text-sm text-gray-600 whitespace-nowrap">
                      {ReportTypeLabels[report.reportType]}
                    </td>
                    <td className="px-3 sm:px-6 py-4 text-xs sm:text-sm text-gray-900 whitespace-nowrap">{report.instructor.name}</td>
                    <td className="px-3 sm:px-6 py-4 text-xs sm:text-sm text-gray-600 max-w-xs truncate">
                      {report.internshipSubject.title}
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(report.status)}`}>
                        {StatusLabels[report.status]}
                      </span>
                    </td>
                    <td className="px-3 sm:px-6 py-4 text-xs sm:text-sm text-gray-600 whitespace-nowrap">
                      {new Date(report.createdAt).toLocaleDateString("vi-VN")}
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => setViewingReport(report)}
                        className="text-blue-600 hover:text-blue-800 text-xs sm:text-sm font-medium transition-colors touch-manipulation"
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

      {viewingReport && (
        <ViewReportDialog
          open={!!viewingReport}
          report={viewingReport}
          onClose={() => setViewingReport(null)}
        />
      )}
    </>
  );
};

export default ReportSummaryManagement;
