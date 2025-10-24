import React, { useState, useEffect } from "react";
import PageLayout from "../../../components/UI/PageLayout";
import PageToolbar from "../../../components/UI/PageToolbar";
import FilterButtonGroup from "../../../components/UI/FilterButtonGroup";
import SearchInput from "../../../components/UI/SearchInput";
import Pagination from "../../../components/UI/Pagination";
import ViewReportDialog from "./ViewReportDialog";

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

interface Statistics {
  total: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
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
  const [reports, setReports] = useState<Report[]>([]);
  const [statistics, setStatistics] = useState<Statistics>({
    total: 0,
    byStatus: {},
    byType: {}
  });
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Report["status"]>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | Report["reportType"]>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [viewingReport, setViewingReport] = useState<Report | null>(null);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter, typeFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20"
      });
      
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (typeFilter !== "all") params.append("reportType", typeFilter);

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/reports/pdt/statistics?${params}`,
        { credentials: "include" }
      );

      if (!response.ok) throw new Error("Failed to load reports");

      const data = await response.json();
      setReports(data.reports);
      setStatistics(data.statistics);
      setTotalPages(data.pagination.pages);
    } catch (error) {
      console.error("Load reports error:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredReports = reports.filter(report =>
    searchQuery === "" ||
    report.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    report.instructor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    report.internshipSubject.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
    const rows = filteredReports.map(r => [
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
    <PageLayout
      title="Quản lý tổng kết"
      breadcrumb={[
        { label: "Trang chủ", path: "/pdt" },
        { label: "Quản lý tổng kết" }
      ]}
    >
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-600">Tổng báo cáo</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{statistics.total}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-600">Đã duyệt</div>
          <div className="text-2xl font-bold text-green-600 mt-1">
            {statistics.byStatus.approved || 0}
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-600">Đang chờ xét</div>
          <div className="text-2xl font-bold text-blue-600 mt-1">
            {statistics.byStatus.submitted || 0}
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-600">Bị từ chối</div>
          <div className="text-2xl font-bold text-red-600 mt-1">
            {statistics.byStatus.rejected || 0}
          </div>
        </div>
      </div>

      <PageToolbar>
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Tìm theo tiêu đề, giảng viên, môn..."
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
              { key: "submitted", label: "Đã gửi" },
              { key: "reviewed", label: "Đã xem xét" },
              { key: "approved", label: "Đã duyệt" },
              { key: "rejected", label: "Bị từ chối" }
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
              { key: "tuan", label: "Tuần" },
              { key: "thang", label: "Tháng" },
              { key: "quy", label: "Quý" },
              { key: "nam", label: "Năm" }
            ]}
            value={typeFilter}
            onChange={(v) => {
              setTypeFilter(v as typeof typeFilter);
              setPage(1);
            }}
          />
        </div>
      </div>

      {/* Reports Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mã BC</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tiêu đề</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Loại</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Giảng viên</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Môn TT</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngày tạo</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thao tác</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  Đang tải...
                </td>
              </tr>
            ) : filteredReports.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  Không có báo cáo nào
                </td>
              </tr>
            ) : (
              filteredReports.map((report) => (
                <tr key={report._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{report.id}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">
                    {report.title}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {ReportTypeLabels[report.reportType]}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">{report.instructor.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                    {report.internshipSubject.title}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(report.status)}`}>
                      {StatusLabels[report.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {new Date(report.createdAt).toLocaleDateString("vi-VN")}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setViewingReport(report)}
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

      {viewingReport && (
        <ViewReportDialog
          open={!!viewingReport}
          report={viewingReport}
          onClose={() => setViewingReport(null)}
        />
      )}
    </PageLayout>
  );
};

export default ReportSummaryManagement;
