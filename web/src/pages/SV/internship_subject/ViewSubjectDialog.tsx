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
      widthClass="max-w-2xl"
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
              Đăng ký ngay
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">{subject.name}</h2>
          <p className="text-gray-600 font-mono mt-1">{subject.code}</p>
          <div className="mt-2">
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ring-1 ring-inset ${
              subject.status === "open" ? "bg-green-50 text-green-700 ring-green-200" :
              subject.status === "full" ? "bg-red-50 text-red-700 ring-red-200" :
              "bg-gray-50 text-gray-700 ring-gray-200"
            }`}>
              {subject.status === "open" ? "Đang mở đăng ký" :
               subject.status === "full" ? "Đã đầy" : "Đã đóng"}
            </span>
          </div>
        </div>

        {/* Basic Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">Ban chủ nhiệm</dt>
              <dd className="text-sm text-gray-900">{subject.bcnManager.name}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Số tín chỉ</dt>
              <dd className="text-sm text-gray-900">{subject.credits} tín chỉ</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Thời gian thực tập</dt>
              <dd className="text-sm text-gray-900">{subject.duration}</dd>
            </div>
          </div>
          
          <div className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">Số lượng sinh viên</dt>
              <dd className="text-sm text-gray-900">
                {subject.currentStudents}/{subject.maxStudents} ({remainingSpots} chỗ trống)
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Thời gian bắt đầu</dt>
              <dd className="text-sm text-gray-900">{dayjs(subject.startDate).format("DD/MM/YYYY")}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Thời gian kết thúc</dt>
              <dd className="text-sm text-gray-900">{dayjs(subject.endDate).format("DD/MM/YYYY")}</dd>
            </div>
          </div>
        </div>

        {/* Instructors */}
        <div>
          <dt className="text-sm font-medium text-gray-500 mb-2">Giảng viên hướng dẫn</dt>
          <dd className="space-y-2">
            {subject.instructors.map((instructor) => (
              <div key={instructor.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900">{instructor.name}</div>
                  <div className="text-sm text-gray-500">ID: {instructor.id}</div>
                </div>
                <div className="text-sm text-gray-600">
                  {instructor.studentCount}/{instructor.maxStudents} sinh viên
                </div>
              </div>
            ))}
          </dd>
        </div>

        {/* Description */}
        <div>
          <dt className="text-sm font-medium text-gray-500 mb-2">Mô tả</dt>
          <dd className="text-sm text-gray-900 leading-relaxed">{subject.description}</dd>
        </div>

        {/* Requirements */}
        <div>
          <dt className="text-sm font-medium text-gray-500 mb-2">Yêu cầu</dt>
          <dd className="space-y-1">
            {subject.requirements.map((req, index) => (
              <div key={index} className="flex items-start gap-2 text-sm text-gray-900">
                <span className="text-blue-600 mt-1">•</span>
                <span>{req}</span>
              </div>
            ))}
          </dd>
        </div>

        {/* Status warning */}
        {subject.status === "full" && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-800">
              <span>⚠️</span>
              <span className="font-medium">Môn này đã đầy số lượng sinh viên</span>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ViewSubjectDialog;
