import React from "react";
import Modal from "../../../util/Modal";
import type { TeacherReport } from "./ReportManagement";
import { resolveFileHref } from "../../../utils/fileLinks";
import dayjs from "dayjs";

interface Props {
  open: boolean;
  onClose: () => void;
  report: TeacherReport | null;
  onSubmit?: () => void;
}

const StatusLabels = {
  "draft": "Bản nháp",
  "submitted": "Đã gửi",
  "reviewed": "Đã xem",
  "approved": "Đã duyệt",
  "rejected": "Từ chối"
};

const ReportTypeLabels = {
  "tuan": "Báo cáo tuần",
  "thang": "Báo cáo tháng", 
  "quy": "Báo cáo quý",
  "nam": "Báo cáo năm",
  "khac": "Báo cáo khác"
} as const;

const ViewReportDialog: React.FC<Props> = ({ open, onClose, report, onSubmit }) => {
  if (!report) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Chi tiết báo cáo"
      widthClass="max-w-4xl"
      actions={
        <>
          <button
            className="h-10 px-4 rounded-md text-gray-600 border border-gray-300 hover:bg-gray-50"
            onClick={onClose}
          >
            Đóng
          </button>
          {onSubmit && report.status === "draft" && (
            <button
              className="h-10 px-5 rounded-md bg-orange-600 text-white hover:bg-orange-700"
              onClick={onSubmit}
            >
              Gửi báo cáo
            </button>
          )}
        </>
      }
    >
      <div className="space-y-6">
        {/* Header info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tiêu đề</label>
            <div className="text-lg font-semibold text-gray-900">{report.title}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Loại báo cáo</label>
            <span className="inline-flex items-center rounded-full bg-blue-100 text-blue-700 px-3 py-1 text-sm font-medium">
              {ReportTypeLabels[report.reportType] || "Không xác định"}
            </span>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
              report.status === "approved" ? "bg-green-100 text-green-700" :
              report.status === "rejected" ? "bg-red-100 text-red-700" :
              report.status === "submitted" ? "bg-blue-100 text-blue-700" :
              report.status === "reviewed" ? "bg-yellow-100 text-yellow-700" :
              "bg-gray-100 text-gray-700"
            }`}>
              {StatusLabels[report.status]}
            </span>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ngày tạo</label>
            <div className="text-gray-600">{dayjs(report.createdAt).format("DD/MM/YYYY HH:mm")}</div>
          </div>
        </div>

        {/* Subject info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-sm text-blue-800">
            <span className="font-medium">Môn thực tập:</span> {report.internshipSubject.title}
          </div>
          <div className="text-sm text-blue-600 mt-1">
            <span className="font-medium">Giảng viên:</span> {report.instructor.name}
          </div>
        </div>

        {/* Submission/Review info */}
        {report.submittedAt && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ngày gửi</label>
              <div className="text-gray-600">{dayjs(report.submittedAt).format("DD/MM/YYYY HH:mm")}</div>
            </div>
            {report.reviewedAt && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ngày xem xét</label>
                <div className="text-gray-600">{dayjs(report.reviewedAt).format("DD/MM/YYYY HH:mm")}</div>
              </div>
            )}
          </div>
        )}

        {/* Review note */}
        {report.reviewNote && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nhận xét từ khoa</label>
            <div className={`p-4 rounded-lg border ${
              report.status === "approved" ? "bg-green-50 border-green-200" :
              report.status === "rejected" ? "bg-red-50 border-red-200" :
              "bg-yellow-50 border-yellow-200"
            }`}>
              <div className="text-sm text-gray-700 whitespace-pre-wrap">{report.reviewNote}</div>
            </div>
          </div>
        )}

        {/* Content */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Nội dung báo cáo</label>
          <div className="prose max-w-none border border-gray-200 rounded-lg p-4 bg-gray-50 whitespace-pre-wrap">
            <div dangerouslySetInnerHTML={{ __html: report.content }} />
          </div>
        </div>

        {/* Attachments */}
        {report.attachments && report.attachments.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">File đính kèm</label>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 font-semibold text-sm">
                {report.attachments.length} file đính kèm
              </div>
              <div className="divide-y divide-gray-100">
                {report.attachments.map((file, index) => (
                  <div key={index} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 0v12h8V6H8a2 2 0 01-2-2z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{file.fileName}</div>
                        <div className="text-sm text-gray-500">
                          {(file.fileSize / 1024).toFixed(1)} KB
                        </div>
                      </div>
                    </div>
                    <a
                      href={resolveFileHref(file.fileUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                      Tải xuống
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ViewReportDialog;
