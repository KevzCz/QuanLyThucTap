import React from "react";
import Modal from "../../../util/Modal";
import type { TeacherReport } from "./ReportManagement";

interface Props {
  open: boolean;
  onClose: () => void;
  report: TeacherReport | null;
  onConfirm: () => void;
}

const DeleteReportDialog: React.FC<Props> = ({ open, onClose, report, onConfirm }) => {
  if (!report) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Xác nhận xóa báo cáo"
      widthClass="max-w-md"
      actions={
        <>
          <button
            className="h-10 px-4 rounded-md text-gray-600 border border-gray-300 hover:bg-gray-50"
            onClick={onClose}
          >
            Hủy
          </button>
          <button
            className="h-10 px-5 rounded-md bg-red-600 text-white hover:bg-red-700"
            onClick={onConfirm}
          >
            Xóa báo cáo
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" clipRule="evenodd" />
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900">Xóa báo cáo</h3>
            <p className="text-sm text-gray-500">Hành động này không thể hoàn tác.</p>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-sm">
            <div className="font-medium text-gray-900 mb-1">{report.title}</div>
            <div className="text-gray-600">
              {report.reportType === "tuan" ? "Báo cáo tuần" :
               report.reportType === "thang" ? "Báo cáo tháng" :
               report.reportType === "quy" ? "Báo cáo quý" :
               report.reportType === "nam" ? "Báo cáo năm" : "Báo cáo khác"}
            </div>
          </div>
        </div>

        <p className="text-sm text-gray-600">
          Bạn có chắc chắn muốn xóa báo cáo này? Báo cáo sẽ bị xóa vĩnh viễn và không thể khôi phục.
        </p>
      </div>
    </Modal>
  );
};

export default DeleteReportDialog;
