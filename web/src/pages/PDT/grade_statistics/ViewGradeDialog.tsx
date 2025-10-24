import React from "react";
import StandardDialog from "../../../components/UI/StandardDialog";

interface Grade {
  id: string;
  student: {
    id: string;
    name: string;
    email: string;
  };
  supervisor: {
    id: string;
    name: string;
  };
  subject: {
    id: string;
    title: string;
  };
  workType: "thuc_tap" | "do_an";
  status: "not_started" | "in_progress" | "draft_completed" | "submitted" | "approved" | "rejected";
  finalGrade?: number;
  letterGrade?: string;
  progressPercentage: number;
  submittedToBCN: boolean;
  startDate: string;
  endDate: string;
  updatedAt: string;
}

interface Props {
  open: boolean;
  grade: Grade;
  onClose: () => void;
}

const WorkTypeLabels: Record<Grade["workType"], string> = {
  thuc_tap: "Thực tập",
  do_an: "Đồ án"
};

const StatusLabels: Record<Grade["status"], string> = {
  not_started: "Chưa bắt đầu",
  in_progress: "Đang thực hiện",
  draft_completed: "Hoàn thành bản nháp",
  submitted: "Đã nộp",
  approved: "Đã duyệt",
  rejected: "Bị từ chối"
};

const ViewGradeDialog: React.FC<Props> = ({ open, grade, onClose }) => {
  const getStatusColor = (status: Grade["status"]) => {
    const colors: Record<Grade["status"], string> = {
      not_started: "bg-gray-100 text-gray-700",
      in_progress: "bg-blue-100 text-blue-700",
      draft_completed: "bg-yellow-100 text-yellow-700",
      submitted: "bg-purple-100 text-purple-700",
      approved: "bg-green-100 text-green-700",
      rejected: "bg-red-100 text-red-700"
    };
    return colors[status];
  };

  const getGradeColor = (gradeValue?: number) => {
    if (!gradeValue) return "text-gray-400";
    if (gradeValue >= 8.5) return "text-green-600";
    if (gradeValue >= 7.0) return "text-blue-600";
    if (gradeValue >= 5.5) return "text-yellow-600";
    if (gradeValue >= 5.0) return "text-orange-600";
    return "text-red-600";
  };

  return (
    <StandardDialog
      open={open}
      title={`Chi tiết điểm - ${grade.student.name}`}
      onClose={onClose}
    >
      <div className="space-y-4">
        {/* Status and Type */}
        <div className="flex items-center gap-4">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(grade.status)}`}>
            {StatusLabels[grade.status]}
          </span>
          <span className="text-sm text-gray-600">
            Loại: {WorkTypeLabels[grade.workType]}
          </span>
        </div>

        {/* Student Info */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sinh viên</label>
            <div className="text-sm font-semibold text-gray-900">{grade.student.name}</div>
            <div className="text-xs text-gray-500">{grade.student.id}</div>
            <div className="text-xs text-gray-500">{grade.student.email}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Giảng viên hướng dẫn</label>
            <div className="text-sm font-semibold text-gray-900">{grade.supervisor.name}</div>
            <div className="text-xs text-gray-500">{grade.supervisor.id}</div>
          </div>
        </div>

        {/* Subject */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Môn thực tập</label>
          <div className="text-sm text-gray-900">{grade.subject.title}</div>
          <div className="text-xs text-gray-500">{grade.subject.id}</div>
        </div>

        {/* Timeline */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ngày bắt đầu</label>
            <div className="text-sm text-gray-900">
              {new Date(grade.startDate).toLocaleDateString("vi-VN")}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ngày kết thúc</label>
            <div className="text-sm text-gray-900">
              {new Date(grade.endDate).toLocaleDateString("vi-VN")}
            </div>
          </div>
        </div>

        {/* Progress */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tiến độ</label>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all"
                style={{ width: `${grade.progressPercentage}%` }}
              />
            </div>
            <span className="text-sm font-medium text-gray-900">{grade.progressPercentage}%</span>
          </div>
        </div>

        {/* Grades */}
        {grade.finalGrade !== undefined && grade.finalGrade !== null ? (
          <div className="border-t pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-3">Điểm số</label>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="text-sm text-gray-600 mb-1">Điểm số</div>
                <div className={`text-3xl font-bold ${getGradeColor(grade.finalGrade)}`}>
                  {grade.finalGrade.toFixed(1)}
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="text-sm text-gray-600 mb-1">Xếp loại</div>
                <div className={`text-3xl font-bold ${getGradeColor(grade.finalGrade)}`}>
                  {grade.letterGrade || "—"}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="border-t pt-4">
            <div className="text-center py-4 text-gray-500">
              Chưa có điểm cuối cùng
            </div>
          </div>
        )}

        {/* Submission Status */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Đã nộp cho BCN:</span>
            <span className={`font-medium ${grade.submittedToBCN ? "text-green-600" : "text-gray-400"}`}>
              {grade.submittedToBCN ? "Đã nộp" : "Chưa nộp"}
            </span>
          </div>
        </div>

        {/* Last Update */}
        <div className="text-xs text-gray-500 border-t pt-2">
          Cập nhật lần cuối: {new Date(grade.updatedAt).toLocaleString("vi-VN")}
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-6">
        <button
          onClick={onClose}
          className="h-9 px-4 rounded-md border border-gray-300 bg-white hover:bg-gray-50 text-sm font-medium"
        >
          Đóng
        </button>
      </div>
    </StandardDialog>
  );
};

export default ViewGradeDialog;
