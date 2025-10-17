import React, { useState } from "react";
import Modal from "../../../util/Modal";
import type { RequestRow } from "./RequestManagement";

interface Props {
  open: boolean;
  onClose: () => void;
  request?: RequestRow;
  onConfirm: (reviewNote?: string) => void;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ConfirmDeleteDialog: React.FC<Props> = ({ open, onClose, request, onConfirm }) => {
  const [reviewNote, setReviewNote] = useState("");

  const handleConfirm = () => {
    onConfirm(reviewNote.trim() || undefined);
    setReviewNote("");
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Từ chối yêu cầu"
      widthClass="max-w-md"
      actions={
        <>
          <button className="h-10 px-4 rounded-md text-gray-700 border border-gray-300 hover:bg-gray-50" onClick={onClose}>
            Hủy
          </button>
          <button className="h-10 px-5 rounded-md bg-rose-600 text-white hover:bg-rose-700" onClick={handleConfirm}>
            Từ chối
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-gray-700">Bạn có chắc muốn từ chối yêu cầu này?</p>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Lý do từ chối (tùy chọn)
          </label>
          <textarea
            value={reviewNote}
            onChange={(e) => setReviewNote(e.target.value)}
            placeholder="Nhập lý do từ chối yêu cầu..."
            className="w-full h-20 rounded-lg border border-gray-300 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-rose-500"
          />
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmDeleteDialog;
