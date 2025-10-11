import React from "react";
import Modal from "../../../util/Modal";
import type { GVStudent } from "./StudentManagement";

interface Props {
  open: boolean;
  onClose: () => void;
  student?: GVStudent;
  subjectId: string;
}

const GVViewStudentDialog: React.FC<Props> = ({ open, onClose, student, subjectId }) => {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Xem sinh viên"
      widthClass="max-w-2xl"
      actions={<button className="h-10 px-4 rounded-md bg-blue-600 text-white hover:bg-blue-700" onClick={onClose}>Đóng</button>}
    >
      {!student ? (
        <div className="text-gray-500">Không tìm thấy.</div>
      ) : (
        <div className="space-y-4">
          <div className="text-center">
            <h2 className="text-2xl font-extrabold text-blue-600">{student.name}</h2>
            <div className="inline-block mt-2 rounded-full bg-blue-100 px-4 py-1 text-sm text-blue-800">{student.id}</div>
          </div>

          <div className="rounded-xl border border-gray-200 p-4 text-gray-700">
            <div className="py-1"><span className="text-gray-500">Môn thực tập:</span> <span className="font-medium">{subjectId}</span></div>
            <div className="py-1"><span className="text-gray-500">Trạng thái:</span> <span className="font-medium">{student.status}</span></div>
            <div className="py-1"><span className="text-gray-500">Giảng viên hướng dẫn:</span> <span className="font-medium">{student.advisorName}</span></div>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default GVViewStudentDialog;
