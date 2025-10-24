import React from "react";
import StandardDialog from "../../../components/UI/StandardDialog";

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

interface Props {
  open: boolean;
  report: Report;
  onClose: () => void;
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

const ViewReportDialog: React.FC<Props> = ({ open, report, onClose }) => {
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

  return (
    <StandardDialog
      open={open}
      title={`Chi tiết báo cáo - ${report.id}`}
      onClose={onClose}
    >
      <div className="space-y-4">
        {/* Status and Type */}
        <div className="flex items-center gap-4">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(report.status)}`}>
            {StatusLabels[report.status]}
          </span>
          <span className="text-sm text-gray-600">
            Loại: {ReportTypeLabels[report.reportType]}
          </span>
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tiêu đề</label>
          <div className="text-base font-semibold text-gray-900">{report.title}</div>
        </div>

        {/* Instructor and Subject */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Giảng viên</label>
            <div className="text-sm text-gray-900">{report.instructor.name}</div>
            <div className="text-xs text-gray-500">{report.instructor.email}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Môn thực tập</label>
            <div className="text-sm text-gray-900">{report.internshipSubject.title}</div>
            <div className="text-xs text-gray-500">{report.internshipSubject.id}</div>
          </div>
        </div>

        {/* Content */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nội dung</label>
          <div 
            className="prose max-w-none text-sm text-gray-900 p-4 bg-gray-50 rounded-lg border border-gray-200"
            dangerouslySetInnerHTML={{ __html: report.content }}
          />
        </div>

        {/* Review Information */}
        {(report.status === "reviewed" || report.status === "approved" || report.status === "rejected") && (
          <div className="border-t pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Thông tin xét duyệt</label>
            {report.reviewedBy && (
              <div className="text-sm text-gray-600 mb-2">
                Người xét: <span className="font-medium text-gray-900">{report.reviewedBy.name}</span>
              </div>
            )}
            {report.reviewedAt && (
              <div className="text-sm text-gray-600 mb-2">
                Ngày xét: {new Date(report.reviewedAt).toLocaleString("vi-VN")}
              </div>
            )}
            {report.reviewNote && (
              <div className="mt-2">
                <div className="text-sm font-medium text-gray-700 mb-1">Nhận xét:</div>
                <div className="text-sm text-gray-900 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  {report.reviewNote}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Timestamps */}
        <div className="text-xs text-gray-500 border-t pt-2">
          <div>Ngày tạo: {new Date(report.createdAt).toLocaleString("vi-VN")}</div>
          {report.submittedAt && (
            <div>Ngày gửi: {new Date(report.submittedAt).toLocaleString("vi-VN")}</div>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-6">
        <button
          onClick={onClose}
          className="h-9 px-4 rounded-md border border-gray-300 bg-white hover:bg-gray-50 text-sm font-medium"
        >
          Đóng
        </button>
      </div>
    </StandardDialog>
  );
};

export default ViewReportDialog;
