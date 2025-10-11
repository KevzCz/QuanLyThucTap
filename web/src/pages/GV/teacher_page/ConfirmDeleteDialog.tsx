import React from "react";
import Modal from "../../../util/Modal";

interface Props {
  open: boolean;
  title: string;
  message: string;
  dangerLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
}

const ConfirmDeleteDialog: React.FC<Props> = ({ open, title, message, dangerLabel = "Xóa", onCancel, onConfirm }) => {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      widthClass="max-w-md"
      actions={
        <>
          <button className="h-10 px-4 rounded-md text-gray-700 border border-gray-300 hover:bg-gray-50" onClick={onCancel}>Hủy</button>
          <button className="h-10 px-5 rounded-md bg-rose-600 text-white hover:bg-rose-700" onClick={onConfirm}>{dangerLabel}</button>
        </>
      }
    >
      <p className="text-gray-700">{message}</p>
    </Modal>
  );
};

export default ConfirmDeleteDialog;
