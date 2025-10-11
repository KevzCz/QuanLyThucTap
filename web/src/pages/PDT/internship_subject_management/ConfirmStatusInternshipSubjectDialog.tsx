import React from "react";
import Modal from "../../../util/Modal";
import type { InternshipSubject, InternshipStatus } from "./InternshipSubjectTypes";

interface Props {
  open: boolean;
  onClose: () => void;
  internshipSubject?: InternshipSubject;
  nextStatus: InternshipStatus;
  onConfirm: (id: string, next: InternshipStatus) => void;
}

const ConfirmStatusInternshipSubjectDialog: React.FC<Props> = ({ open, onClose, internshipSubject, nextStatus, onConfirm }) => {
  const isLock = nextStatus === "locked";
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isLock ? "Khóa môn thực tập" : "Mở môn thực tập"}
      widthClass="max-w-lg"
      actions={
        <>
          <button className="h-10 px-4 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50" onClick={onClose}>
            Hủy
          </button>
          <button
            className={`h-10 px-5 rounded-md text-white font-medium ${isLock ? "bg-amber-600 hover:bg-amber-700" : "bg-indigo-600 hover:bg-indigo-700"}`}
            onClick={() => internshipSubject && onConfirm(internshipSubject.id, nextStatus)}
          >
            {isLock ? "Khóa" : "Mở"}
          </button>
        </>
      }
    >
      <p className="text-sm text-gray-700">
        Bạn chắc chắn muốn {isLock ? <b>khóa</b> : <b>mở</b>} môn{" "}
        <span className="font-semibold">{internshipSubject?.title}</span> ({internshipSubject?.id})?
      </p>
    </Modal>
  );
};

export default ConfirmStatusInternshipSubjectDialog;
