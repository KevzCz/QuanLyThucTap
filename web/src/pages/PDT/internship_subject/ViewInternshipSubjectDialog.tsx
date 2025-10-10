import React from "react";
import Modal from "../../../util/Modal";
import type { InternshipSubject } from "./InternshipSubjectTypes";

interface Props {
  open: boolean;
  onClose: () => void;
  internshipSubject?: InternshipSubject;
}

const ViewInternshipSubjectDialog: React.FC<Props> = ({ open, onClose, internshipSubject }) => {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Xem môn thực tập"
      widthClass="max-w-2xl"
      actions={<button className="h-10 px-4 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700" onClick={onClose}>Đóng</button>}
    >
      {!internshipSubject ? (
        <div className="text-gray-500">Không tìm thấy môn thực tập.</div>
      ) : (
        <div className="space-y-4">
          <div className="text-center">
            <h2 className="text-2xl font-extrabold text-blue-600">{internshipSubject.title}</h2>
            <div className="inline-block mt-2 rounded-full bg-gray-100 px-4 py-1 text-sm text-gray-800">
              {internshipSubject.departmentLead || "Chưa chỉ định"}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 p-4">
            <div className="text-gray-700">
              <div className="py-1"><span className="text-gray-500">Mã:</span> <span className="font-medium">{internshipSubject.id}</span></div>
              <div className="py-1"><span className="text-gray-500">Max sinh viên:</span> <span className="font-medium">{internshipSubject.maxStudents}</span></div>
              <div className="py-1"><span className="text-gray-500">Trạng thái:</span> <span className="font-medium">{internshipSubject.status === "open" ? "Mở" : "Khóa"}</span></div>
            </div>
          </div>

          {/* Placeholder list of students (mock) */}
          <div className="rounded-xl border border-gray-200 p-4">
            <div className="text-gray-700 font-medium mb-2">Sinh viên đã đăng ký:</div>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between py-2 text-sm">
                <span className="text-blue-700">- Sinh viên A{i + 1}</span>
                <div className="flex gap-3 text-gray-600">
                  <span title="Chi tiết">⋯</span>
                  <span title="Chat">💬</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
};

export default ViewInternshipSubjectDialog;
