import React from "react";
import Modal from "../../../util/Modal";
import type { GradeAppeal } from "../../../utils/api";
import dayjs from "dayjs";

interface Props {
  open: boolean;
  onClose: () => void;
  appeal?: GradeAppeal | null;
  onAccept: () => void;
  onReject: () => void;
}

const ViewAppealDialog: React.FC<Props> = ({ open, onClose, appeal, onAccept, onReject }) => {
  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      'pending': 'Chờ duyệt',
      'accepted': 'Đã chấp nhận',
      'rejected': 'Đã từ chối',
      'reviewing': 'Đang phúc khảo',
      'completed': 'Hoàn tất'
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'accepted': 'bg-blue-100 text-blue-800',
      'rejected': 'bg-red-100 text-red-800',
      'reviewing': 'bg-purple-100 text-purple-800',
      'completed': 'bg-green-100 text-green-800'
    };
    return colorMap[status] || 'bg-gray-100 text-gray-800';
  };

  const showActions = appeal?.status === 'pending';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Chi tiết yêu cầu phúc khảo"
      widthClass="max-w-2xl"
      actions={
        showActions ? (
          <>
            <button className="h-10 px-4 rounded-md text-rose-600 hover:bg-rose-50" onClick={onReject}>
              Từ chối
            </button>
            <button className="h-10 px-5 rounded-md bg-emerald-600 text-white hover:bg-emerald-700" onClick={onAccept}>
              Chấp nhận
            </button>
          </>
        ) : undefined
      }
    >
      {!appeal ? (
        <div className="text-gray-500">Không tìm thấy yêu cầu phúc khảo.</div>
      ) : (
        <div className="space-y-4">
          {/* Student Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mã sinh viên</label>
              <input
                disabled
                value={typeof appeal.student === 'object' ? appeal.student.id : ''}
                className="w-full h-11 rounded-lg border border-gray-200 px-3 bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tên sinh viên</label>
              <input
                disabled
                value={typeof appeal.student === 'object' ? appeal.student.name : ''}
                className="w-full h-11 rounded-lg border border-gray-200 px-3 bg-gray-50"
              />
            </div>
          </div>

          {/* Grade Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Loại TTTN/KLTN</label>
              <input
                disabled
                value={typeof appeal.internshipGrade === 'object' ? appeal.internshipGrade.workType : ''}
                className="w-full h-11 rounded-lg border border-gray-200 px-3 bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Điểm hiện tại</label>
              <input
                disabled
                value={typeof appeal.internshipGrade === 'object' ? 
                  `${appeal.internshipGrade.letterGrade || '—'} (${appeal.internshipGrade.finalGrade?.toFixed(1) || '—'})` : ''}
                className="w-full h-11 rounded-lg border border-gray-200 px-3 bg-gray-50"
              />
            </div>
          </div>

          {/* Original Supervisor */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Giảng viên chấm điểm ban đầu</label>
            <input
              disabled
              value={typeof appeal.originalSupervisor === 'object' ? 
                `${appeal.originalSupervisor.name} (${appeal.originalSupervisor.id})` : ''}
              className="w-full h-11 rounded-lg border border-gray-200 px-3 bg-gray-50"
            />
          </div>

          {/* Appeal Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Lý do phúc khảo</label>
            <textarea
              disabled
              value={appeal.appealReason}
              rows={4}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 bg-gray-50 resize-none"
            />
          </div>

          {/* Status and Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
              <div className="h-11 flex items-center">
                <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${getStatusColor(appeal.status)}`}>
                  {getStatusText(appeal.status)}
                </span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ngày tạo</label>
              <input
                disabled
                value={dayjs(appeal.createdAt).format('DD/MM/YYYY HH:mm')}
                className="w-full h-11 rounded-lg border border-gray-200 px-3 bg-gray-50"
              />
            </div>
          </div>

          {/* New Supervisor if assigned */}
          {appeal.newSupervisor && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Giảng viên phúc khảo</label>
              <input
                disabled
                value={typeof appeal.newSupervisor === 'object' ? 
                  `${appeal.newSupervisor.name} (${appeal.newSupervisor.id})` : ''}
                className="w-full h-11 rounded-lg border border-gray-200 px-3 bg-gray-50"
              />
            </div>
          )}

          {/* Review Note if exists */}
          {appeal.reviewNote && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú đánh giá</label>
              <textarea
                disabled
                value={appeal.reviewNote}
                rows={3}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 bg-gray-50 resize-none"
              />
            </div>
          )}

          {/* Completion date if completed */}
          {appeal.completedAt && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ngày hoàn tất</label>
              <input
                disabled
                value={dayjs(appeal.completedAt).format('DD/MM/YYYY HH:mm')}
                className="w-full h-11 rounded-lg border border-gray-200 px-3 bg-gray-50"
              />
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};

export default ViewAppealDialog;
