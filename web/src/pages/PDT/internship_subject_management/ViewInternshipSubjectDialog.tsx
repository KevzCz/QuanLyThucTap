import React, { useEffect, useState } from "react";
import Modal from "../../../util/Modal";
import type { InternshipSubject } from "./InternshipSubjectTypes";
import { apiClient } from "../../../utils/api";
import dayjs from "dayjs";

interface Props {
  open: boolean;
  onClose: () => void;
  internshipSubject?: InternshipSubject;
}

const ViewInternshipSubjectDialog: React.FC<Props> = ({ open, onClose, internshipSubject }) => {
  const [detailedSubject, setDetailedSubject] = useState<InternshipSubject | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open && internshipSubject) {
      loadDetailedSubject();
    }
  }, [open, internshipSubject]);

  const loadDetailedSubject = async () => {
    if (!internshipSubject) return;

    try {
      setLoading(true);
      setError("");
      
      const response = await apiClient.getInternshipSubject(internshipSubject.id);
      setDetailedSubject(response.subject);
    }  catch (err: Error | unknown) {
      console.error("Error loading detailed subject:", err);
      setError("Không thể tải thông tin chi tiết");
      setDetailedSubject(internshipSubject); // Fallback to basic data
    } finally {
      setLoading(false);
    }
  };

  const subject = detailedSubject || internshipSubject;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Xem môn thực tập"
      widthClass="max-w-4xl"
      actions={
        <button 
          className="h-10 px-4 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700" 
          onClick={onClose}
        >
          Đóng
        </button>
      }
    >
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="text-gray-500">Đang tải thông tin...</div>
        </div>
      ) : !subject ? (
        <div className="text-gray-500">Không tìm thấy môn thực tập.</div>
      ) : (
        <div className="space-y-6">
          {error && (
            <div className="rounded-md bg-amber-50 border border-amber-200 p-3">
              <p className="text-sm text-amber-700">{error}</p>
            </div>
          )}

          {/* Header */}
          <div className="text-center border-b border-gray-200 pb-4">
            <h2 className="text-2xl font-bold text-gray-900">{subject.title}</h2>
            <div className="flex items-center justify-center gap-4 mt-2 text-sm text-gray-600">
              <span className="font-mono bg-gray-100 px-2 py-1 rounded">{subject.id}</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                subject.status === "open" 
                  ? "bg-green-100 text-green-800" 
                  : "bg-red-100 text-red-800"
              }`}>
                {subject.status === "open" ? "Đang mở" : "Đã khóa"}
              </span>
            </div>
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Thông tin cơ bản</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Thời lượng:</span>
                  <span className="font-medium">{subject.duration || "8 tuần"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Số lượng tối đa:</span>
                  <span className="font-medium">{subject.maxStudents} sinh viên</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Đã đăng ký:</span>
                  <span className="font-medium">{subject.currentStudents} sinh viên</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Còn lại:</span>
                  <span className="font-medium">{subject.maxStudents - subject.currentStudents} chỗ</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Ngày tạo:</span>
                  <span className="font-medium">{dayjs(subject.createdAt).format("DD/MM/YYYY HH:mm")}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Ban chủ nhiệm</h3>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="font-medium text-blue-900">{subject.manager.name}</div>
                <div className="text-sm text-blue-700">{subject.manager.email}</div>
                <div className="text-xs text-blue-600 font-mono">{subject.manager.id}</div>
              </div>
            </div>
          </div>

          {/* Description */}
          {subject.description && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Mô tả</h3>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-gray-700 whitespace-pre-wrap">{subject.description}</p>
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Thời gian đăng ký</h3>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="text-sm text-amber-700 space-y-1">
                <div>Từ: {dayjs(subject.registrationStartDate).format("DD/MM/YYYY")}</div>
                <div>Đến: {dayjs(subject.registrationEndDate).format("DD/MM/YYYY")}</div>
              </div>
            </div>
          </div>

          {/* Lecturers */}
          {subject.lecturers && subject.lecturers.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Giảng viên ({subject.lecturers.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {subject.lecturers.map((lecturer) => (
                  <div key={lecturer.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="font-medium text-gray-900">{lecturer.name}</div>
                    <div className="text-sm text-gray-600">{lecturer.email}</div>
                    <div className="text-xs text-gray-500 font-mono">{lecturer.id}</div>
                    {lecturer.managedStudents && lecturer.managedStudents.length > 0 && (
                      <div className="mt-2 text-xs text-blue-600">
                        Quản lý {lecturer.managedStudents.length} sinh viên
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Students */}
          {subject.students && subject.students.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Sinh viên đã đăng ký ({subject.students.length})
              </h3>
              <div className="bg-gray-50 border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                <div className="divide-y divide-gray-200">
                  {subject.students.map((student) => (
                    <div key={student.id} className="p-3 flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900">{student.name}</div>
                        <div className="text-sm text-gray-600">{student.email}</div>
                      </div>
                      <div className="text-xs text-gray-500 font-mono">{student.id}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {(!subject.students || subject.students.length === 0) && (
            <div className="text-center py-8 text-gray-500">
              Chưa có sinh viên nào đăng ký
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};

export default ViewInternshipSubjectDialog;

