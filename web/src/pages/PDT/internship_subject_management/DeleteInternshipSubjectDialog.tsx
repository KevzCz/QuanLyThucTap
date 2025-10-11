import React from "react";
import Modal from "../../../util/Modal";
import type { InternshipSubject } from "./InternshipSubjectTypes";

interface Props {
  open: boolean;
  onClose: () => void;
  internshipSubject?: InternshipSubject;
  onConfirm: () => void;
}

const DeleteInternshipSubjectDialog: React.FC<Props> = ({ open, onClose, internshipSubject, onConfirm }) => {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Xóa môn thực tập"
      widthClass="max-w-lg"
      actions={
        <>
          <button className="h-10 px-4 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50" onClick={onClose}>
            Hủy
          </button>
          <button className="h-10 px-5 rounded-md bg-rose-600 text-white font-medium hover:bg-rose-700" onClick={onConfirm}>
            Xóa
          </button>
        </>
      }
    >
      <p className="text-sm text-gray-700">
        Bạn có chắc muốn xóa môn thực tập <b>{internshipSubject?.title}</b> ({internshipSubject?.id})? Hành động này không thể hoàn tác.
      </p>
    </Modal>
  );
};

export default DeleteInternshipSubjectDialog;
