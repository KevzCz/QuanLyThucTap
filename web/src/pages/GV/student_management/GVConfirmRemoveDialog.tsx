import React from "react";
import Modal from "../../../util/Modal";
import type { GVStudent } from "./StudentManagement";

interface Props {
  open: boolean;
  onClose: () => void;
  student?: GVStudent;
  onConfirm: (sv: GVStudent) => void;
}

const GVConfirmRemoveDialog: React.FC<Props> = ({ open, onClose, student, onConfirm }) => {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Gửi yêu cầu xóa sinh viên"
      widthClass="max-w-md"
      actions={
        <>
          <button className="h-10 px-4 rounded-md text-gray-700 border border-gray-300 hover:bg-gray-50" onClick={onClose}>Hủy</button>
          <button className="h-10 px-5 rounded-md bg-rose-600 text-white hover:bg-rose-700" onClick={() => student && onConfirm(student)}>Gửi yêu cầu</button>
        </>
      }
    >
      {!student ? (
        <div className="text-gray-600">Không có sinh viên.</div>
      ) : (
        <p className="text-gray-700">
          Bạn có chắc muốn gửi yêu cầu xóa <span className="font-semibold">{student.name}</span> ({student.id}) khỏi danh sách hướng dẫn?
        </p>
      )}
    </Modal>
  );
};

export default GVConfirmRemoveDialog;
