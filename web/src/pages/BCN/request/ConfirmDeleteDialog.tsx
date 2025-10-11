import React from "react";
import Modal from "../../../util/Modal";

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const ConfirmDeleteDialog: React.FC<Props> = ({ open, onClose, onConfirm }) => {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Xóa yêu cầu"
      widthClass="max-w-md"
      actions={
        <>
          <button className="h-10 px-4 rounded-md text-gray-700 border border-gray-300 hover:bg-gray-50" onClick={onClose}>
            Hủy
          </button>
          <button className="h-10 px-5 rounded-md bg-rose-600 text-white hover:bg-rose-700" onClick={onConfirm}>
            Xóa
          </button>
        </>
      }
    >
      <p className="text-gray-700">Bạn có chắc muốn xóa yêu cầu này khỏi danh sách?</p>
    </Modal>
  );
};

export default ConfirmDeleteDialog;
