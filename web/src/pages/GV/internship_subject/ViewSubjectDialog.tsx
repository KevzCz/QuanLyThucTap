import React from "react";
import Modal from "../../../util/Modal";
import type { InternshipSubject } from "./InternshipSubjectTypes";
import dayjs from "dayjs";

interface Props {
  open: boolean;
  onClose: () => void;
  subject: InternshipSubject | null;
  onRegister: (subject: InternshipSubject) => void;
  canRegister: boolean;
}

const ViewSubjectDialog: React.FC<Props> = ({ open, onClose, subject, onRegister, canRegister }) => {
  if (!subject) return null;

  const remainingSpots = subject.maxStudents - subject.currentStudents;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Chi tiết môn thực tập"
      widthClass="max-w-4xl"
      actions={
        <div className="flex gap-3">
          <button
            className="h-10 px-4 rounded-md text-gray-700 border border-gray-300 hover:bg-gray-50"
            onClick={onClose}
          >
            Đóng
          </button>
          {subject.status === "open" && canRegister && (
            <button
              className="h-10 px-5 rounded-md bg-blue-600 text-white hover:bg-blue-700"
              onClick={() => onRegister(subject)}
            >
              Tham gia giảng dạy
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">{subject.title || subject.name}</h2>
          <p className="text-gray-600 font-mono mt-1">{subject.id}</p>
          <div className="mt-2">
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ring-1 ring-inset ${
              subject.status === "open" ? "bg-green-50 text-green-700 ring-green-200" :
              subject.status === "locked" ? "bg-red-50 text-red-700 ring-red-200" :
              "bg-gray-50 text-gray-700 ring-gray-200"
            }`}>
              {subject.status === "open" ? "Đang mở đăng ký" :
               subject.status === "locked" ? "Đã khóa" : "Đã đóng"}
            </span>
          </div>
        </div>

        {/* Basic Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">Ban chủ nhiệm</dt>
              <dd className="text-sm text-gray-900">{subject.manager?.name || subject.bcnManager?.name}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Thời gian thực tập</dt>
              <dd className="text-sm text-gray-900">{subject.duration || '8 tuần'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Sức chứa sinh viên</dt>
              <dd className="text-sm text-gray-900">
                {subject.currentStudents}/{subject.maxStudents} sinh viên ({remainingSpots} chỗ trống)
              </dd>
            </div>
          </div>
          
          <div className="space-y-3">
            {subject.registrationStartDate && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Bắt đầu đăng ký</dt>
                <dd className="text-sm text-gray-900">{dayjs(subject.registrationStartDate).format("DD/MM/YYYY")}</dd>
              </div>
            )}
            {subject.registrationEndDate && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Hết hạn đăng ký</dt>
                <dd className="text-sm text-gray-900">{dayjs(subject.registrationEndDate).format("DD/MM/YYYY")}</dd>
              </div>
            )}
            <div>
              <dt className="text-sm font-medium text-gray-500">Số giảng viên</dt>
              <dd className="text-sm text-gray-900">{subject.lecturers?.length || 0} người</dd>
            </div>
          </div>
        </div>

        {/* Capacity clarification */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <span className="text-blue-600 mt-0.5">ℹ️</span>
            <div className="text-sm text-blue-800">
              <div className="font-medium mb-1">Về sức chứa môn học:</div>
              <p className="text-xs">
                • Sức chứa {subject.maxStudents} là dành cho <strong>sinh viên</strong><br/>
                • Số lượng giảng viên không bị giới hạn bởi sức chứa này<br/>
                • Giảng viên sẽ được phân công hướng dẫn sinh viên sau khi tham gia
              </p>
            </div>
          </div>
        </div>

        {/* Description */}
        {subject.description && (
          <div>
            <dt className="text-sm font-medium text-gray-500 mb-2">Mô tả</dt>
            <dd className="text-sm text-gray-900 leading-relaxed bg-gray-50 rounded-lg p-4">
              {subject.description}
            </dd>
          </div>
        )}

        {/* Lecturers */}
        <div>
          <dt className="text-sm font-medium text-gray-500 mb-3">
            Giảng viên tham gia ({subject.lecturers?.length || 0})
          </dt>
          <div className="space-y-2">
            {subject.lecturers && subject.lecturers.length > 0 ? (
              subject.lecturers.map((lecturer) => (
                <div key={lecturer.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div>
                    <div className="font-medium text-blue-900">{lecturer.name}</div>
                    <div className="text-sm text-blue-700">ID: {lecturer.id}</div>
                    {lecturer.email && (
                      <div className="text-sm text-blue-600">{lecturer.email}</div>
                    )}
                  </div>
                  <div className="text-sm text-blue-800">
                    {lecturer.managedStudents?.length || 0} sinh viên
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-lg">
                Chưa có giảng viên nào tham gia
              </div>
            )}
          </div>
        </div>

        {/* Students */}
        <div>
          <dt className="text-sm font-medium text-gray-500 mb-3">
            Sinh viên đã đăng ký ({subject.students?.length || 0})
          </dt>
          <div className="max-h-60 overflow-y-auto">
            {subject.students && subject.students.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {subject.students.map((student) => (
                  <div key={student.id} className="flex items-center justify-between p-2 bg-green-50 rounded-lg border border-green-200">
                    <div>
                      <div className="font-medium text-green-900 text-sm">{student.name}</div>
                      <div className="text-xs text-green-700">ID: {student.id}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-lg">
                Chưa có sinh viên nào đăng ký
              </div>
            )}
          </div>
        </div>

        {/* Status warnings */}
        {subject.status === "locked" && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-800">
              <span>⚠️</span>
              <span className="font-medium">Môn này đã bị khóa</span>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ViewSubjectDialog;
