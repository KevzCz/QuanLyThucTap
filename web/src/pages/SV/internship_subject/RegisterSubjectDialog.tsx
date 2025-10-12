import React, { useState } from "react";
import Modal from "../../../util/Modal";
import type { InternshipSubject, StudentRegistration } from "./InternshipSubjectTypes";

interface Props {
  open: boolean;
  onClose: () => void;
  subject: InternshipSubject | null;
  onSuccess: (registration: StudentRegistration) => void;
}

const RegisterSubjectDialog: React.FC<Props> = ({ open, onClose, subject, onSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);

  if (!subject) return null;

  const handleRegister = async () => {
    if (!agreed) return;
    
    setIsLoading(true);
    
    try {
      const registration: StudentRegistration = {
        studentId: "current-user", // This will be handled by server
        subjectId: subject.id,
        registeredAt: new Date().toISOString(),
      };
      
      onSuccess(registration);
    } catch (error) {
      console.error('Registration error:', error);
      alert('Đăng ký thất bại. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
      setAgreed(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Xác nhận đăng ký"
      widthClass="max-w-md"
      actions={
        <div className="flex gap-3">
          <button
            className="h-10 px-4 rounded-md text-gray-700 border border-gray-300 hover:bg-gray-50"
            onClick={onClose}
            disabled={isLoading}
          >
            Hủy
          </button>
          <button
            className="h-10 px-5 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400"
            onClick={handleRegister}
            disabled={!agreed || isLoading}
          >
            {isLoading ? "Đang đăng ký..." : "Xác nhận đăng ký"}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Đăng ký môn thực tập
          </h3>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="font-medium text-blue-900">{subject.title || subject.name}</div>
            <div className="text-sm text-blue-700 mt-1">{subject.id}</div>
          </div>
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Ban chủ nhiệm:</span>
            <span className="font-medium">{subject.manager?.name || subject.bcnManager?.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Thời gian:</span>
            <span className="font-medium">{subject.duration || '8 tuần'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Số tín chỉ:</span>
            <span className="font-medium">{subject.credits || 4} tín chỉ</span>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <span className="text-amber-600 mt-0.5">⚠️</span>
            <div className="text-sm text-amber-800">
              <div className="font-medium mb-1">Lưu ý quan trọng:</div>
              <ul className="space-y-1 text-xs">
                <li>• Sau khi đăng ký, bạn sẽ tham gia môn thực tập ngay lập tức</li>
                <li>• Bạn không thể thay đổi môn thực tập sau khi đăng ký</li>
                <li>• Trạng thái ban đầu sẽ là "Chưa được hướng dẫn" cho đến khi được phân công giảng viên</li>
              </ul>
            </div>
          </div>
        </div>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">
            Tôi đã đọc và hiểu các yêu cầu, đồng ý đăng ký môn thực tập này
          </span>
        </label>
      </div>
    </Modal>
  );
};

export default RegisterSubjectDialog;

