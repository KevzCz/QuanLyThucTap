import React, { useState } from "react";
import Modal from "../../../util/Modal";
import type { RequestRow } from "./RequestManagement";

interface Props {
  open: boolean;
  onClose: () => void;
  request?: RequestRow;
  onConfirm: (reviewNote?: string) => void;
}

const ConfirmApproveDialog: React.FC<Props> = ({ open, onClose, request, onConfirm }) => {
  const [reviewNote, setReviewNote] = useState("");

  const handleConfirm = () => {
    onConfirm(reviewNote.trim() || undefined);
    setReviewNote("");
  };

  const getActionText = () => {
    if (!request) return "thao tác";
    return request.kind === "add-student" ? "thêm sinh viên vào danh sách hướng dẫn" : "xóa sinh viên khỏi danh sách hướng dẫn";
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Xác nhận chấp nhận yêu cầu"
      widthClass="max-w-md"
      actions={
        <>
          <button className="h-10 px-4 rounded-md text-gray-700 border border-gray-300 hover:bg-gray-50" onClick={onClose}>
            Hủy
          </button>
          <button className="h-10 px-5 rounded-md bg-emerald-600 text-white hover:bg-emerald-700" onClick={handleConfirm}>
            Chấp nhận
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-gray-700">
          Bạn có chắc muốn chấp nhận yêu cầu này? Thao tác sẽ {getActionText()}.
        </p>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Ghi chú (tùy chọn)
          </label>
          <textarea
            value={reviewNote}
            onChange={(e) => setReviewNote(e.target.value)}
            placeholder="Nhập ghi chú cho yêu cầu..."
            className="w-full h-20 rounded-lg border border-gray-300 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmApproveDialog;
