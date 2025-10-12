import React from "react";
import Modal from "../../../util/Modal";
import type { GVStudent } from "./StudentManagement";

interface Props {
  open: boolean;
  onClose: () => void;
  student?: GVStudent;
  subjectInfo?: { id: string; title: string };
}

const GVViewStudentDialog: React.FC<Props> = ({ open, onClose, student, subjectInfo }) => {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Thông tin sinh viên"
      widthClass="max-w-2xl"
      actions={<button className="h-10 px-4 rounded-md bg-blue-600 text-white hover:bg-blue-700" onClick={onClose}>Đóng</button>}
    >
      {!student ? (
        <div className="text-gray-500">Không tìm thấy thông tin sinh viên.</div>
      ) : (
        <div className="space-y-4">
          <div className="text-center">
            <h2 className="text-2xl font-extrabold text-blue-600">{student.name}</h2>
            <div className="inline-block mt-2 rounded-full bg-blue-100 px-4 py-1 text-sm text-blue-800">{student.id}</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Thông tin cá nhân</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Email:</span>
                  <span className="font-medium">{student.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Lớp:</span>
                  <span className="font-medium">{student.studentClass || 'Chưa cập nhật'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Năm:</span>
                  <span className="font-medium">{student.year}</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Thông tin thực tập</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Trạng thái:</span>
                  <span className="font-medium">{student.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Môn thực tập:</span>
                  <span className="font-medium">
                    {student.internshipSubject ? student.internshipSubject.title : 
                     subjectInfo ? subjectInfo.title : 'Chưa đăng ký'}
                  </span>
                </div>
                {(student.internshipSubject || subjectInfo) && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Mã môn:</span>
                    <span className="font-medium font-mono">
                      {student.internshipSubject?.id || subjectInfo?.id}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default GVViewStudentDialog;
