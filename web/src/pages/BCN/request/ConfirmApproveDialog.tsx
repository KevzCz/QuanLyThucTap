import React from "react";
import Modal from "../../../util/Modal";

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const ConfirmApproveDialog: React.FC<Props> = ({ open, onClose, onConfirm }) => {
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
          <button className="h-10 px-5 rounded-md bg-emerald-600 text-white hover:bg-emerald-700" onClick={onConfirm}>
            Chấp nhận
          </button>
        </>
      }
    >
      <p className="text-gray-700">
        Bạn có chắc muốn chấp nhận yêu cầu này? Thao tác sẽ thêm sinh viên vào danh sách giảng viên tương ứng.
      </p>
    </Modal>
  );
};

export default ConfirmApproveDialog;
