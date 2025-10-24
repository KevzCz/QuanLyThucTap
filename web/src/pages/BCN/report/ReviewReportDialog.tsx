import React, { useState } from "react";
import Modal from "../../../util/Modal";
import type { KhoaReport } from "./KhoaReportManagement";
import { useToast } from "../../../components/UI/Toast";

interface Props {
  open: boolean;
  onClose: () => void;
  report: KhoaReport | null;
  onSubmit: (reportId: string, status: "reviewed" | "approved" | "rejected", reviewNote?: string) => void;
}

const ReviewReportDialog: React.FC<Props> = ({ open, onClose, report, onSubmit }) => {
  const [reviewStatus, setReviewStatus] = useState<"reviewed" | "approved" | "rejected">("reviewed");
  const [reviewNote, setReviewNote] = useState("");
  const { showWarning } = useToast();

  const handleSubmit = () => {
    if (!report) return;

    if (!reviewNote.trim() && reviewStatus === "rejected") {
      showWarning("Thiếu thông tin", "Vui lòng nhập lý do từ chối");
      return;
    }

    onSubmit(report._id, reviewStatus, reviewNote.trim() || undefined);
    
    // Reset form
    setReviewStatus("reviewed");
    setReviewNote("");
  };

  const handleClose = () => {
    setReviewStatus("reviewed");
    setReviewNote("");
    onClose();
  };

  if (!report) return null;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Xem xét báo cáo"
      widthClass="max-w-2xl"
      actions={
        <>
          <button
            className="h-10 px-4 rounded-md text-gray-600 border border-gray-300 hover:bg-gray-50"
            onClick={handleClose}
          >
            Hủy
          </button>
          <button
            className={`h-10 px-5 rounded-md text-white hover:opacity-90 ${
              reviewStatus === "approved" ? "bg-green-600" :
              reviewStatus === "rejected" ? "bg-red-600" :
              "bg-yellow-600"
            }`}
            onClick={handleSubmit}
          >
            {reviewStatus === "approved" ? "Duyệt báo cáo" :
             reviewStatus === "rejected" ? "Từ chối báo cáo" :
             "Đánh dấu đã xem"}
          </button>
        </>
      }
    >
      <div className="space-y-6">
        {/* Report info */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="text-lg font-semibold text-gray-900 mb-2">{report.title}</div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Giảng viên:</span> {report.instructor.name}
            </div>
            <div>
              <span className="font-medium text-gray-700">Loại báo cáo:</span> {
                report.reportType === "tuan" ? "Tuần" :
                report.reportType === "thang" ? "Tháng" :
                report.reportType === "quy" ? "Quý" :
                report.reportType === "nam" ? "Năm" : "Khác"
              }
            </div>
            <div>
              <span className="font-medium text-gray-700">Môn thực tập:</span> {report.internshipSubject.title}
            </div>
            <div>
              <span className="font-medium text-gray-700">Ngày gửi:</span> {
                report.submittedAt ? new Date(report.submittedAt).toLocaleDateString("vi-VN") : "-"
              }
            </div>
          </div>
        </div>

        {/* Content preview */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Nội dung báo cáo (xem trước)</label>
          <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-3 bg-gray-50 text-sm">
            <div dangerouslySetInnerHTML={{ 
              __html: report.content.length > 500 
                ? report.content.substring(0, 500) + "..." 
                : report.content 
            }} />
          </div>
        </div>

        {/* Attachments info */}
        {report.attachments && report.attachments.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="text-sm text-blue-800">
              📎 Có {report.attachments.length} file đính kèm
            </div>
          </div>
        )}

        {/* Review status selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Trạng thái xem xét <span className="text-red-500">*</span>
          </label>
          <div className="space-y-3">
            <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
              <input
                type="radio"
                name="reviewStatus"
                value="reviewed"
                checked={reviewStatus === "reviewed"}
                onChange={(e) => setReviewStatus(e.target.value as "reviewed")}
                className="text-yellow-600 focus:ring-yellow-500"
              />
              <div>
                <div className="font-medium text-gray-900">Đã xem</div>
                <div className="text-sm text-gray-500">Đánh dấu báo cáo đã được xem xét</div>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
              <input
                type="radio"
                name="reviewStatus"
                value="approved"
                checked={reviewStatus === "approved"}
                onChange={(e) => setReviewStatus(e.target.value as "approved")}
                className="text-green-600 focus:ring-green-500"
              />
              <div>
                <div className="font-medium text-gray-900">Duyệt</div>
                <div className="text-sm text-gray-500">Phê duyệt nội dung báo cáo</div>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
              <input
                type="radio"
                name="reviewStatus"
                value="rejected"
                checked={reviewStatus === "rejected"}
                onChange={(e) => setReviewStatus(e.target.value as "rejected")}
                className="text-red-600 focus:ring-red-500"
              />
              <div>
                <div className="font-medium text-gray-900">Từ chối</div>
                <div className="text-sm text-gray-500">Yêu cầu giảng viên chỉnh sửa</div>
              </div>
            </label>
          </div>
        </div>

        {/* Review note */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nhận xét {reviewStatus === "rejected" && <span className="text-red-500">*</span>}
          </label>
          <textarea
            className="w-full h-32 rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            value={reviewNote}
            onChange={(e) => setReviewNote(e.target.value)}
            placeholder={
              reviewStatus === "approved" ? "Nhập nhận xét (không bắt buộc)..." :
              reviewStatus === "rejected" ? "Vui lòng nêu rõ lý do từ chối và hướng dẫn chỉnh sửa..." :
              "Nhập nhận xét (không bắt buộc)..."
            }
          />
          <div className="text-xs text-gray-500 mt-1">
            {reviewStatus === "rejected" 
              ? "Bắt buộc nhập lý do từ chối"
              : "Có thể để trống nếu không có nhận xét"
            }
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ReviewReportDialog;
