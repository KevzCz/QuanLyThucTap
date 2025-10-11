import React from "react";
import { useNavigate } from "react-router-dom";
import Modal from "../../../util/Modal";
import type { InternshipSubject, StudentRegistration } from "./InternshipSubjectTypes";

interface Props {
  open: boolean;
  onClose: () => void;
  currentRegistration: StudentRegistration | null;
  subjects: InternshipSubject[];
}

const AlreadyRegisteredDialog: React.FC<Props> = ({ 
  open, 
  onClose, 
  currentRegistration, 
  subjects 
}) => {
  const navigate = useNavigate();
  
  if (!currentRegistration) return null;

  const registeredSubject = subjects.find(s => s.id === currentRegistration.subjectId);

  const handleGoBack = () => {
    onClose();
    // Navigate back to where they came from, or to dashboard if no history
    navigate(-1);
  };


  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Thông báo"
      widthClass="max-w-md"
      actions={
        <div className="flex gap-3">
          <button
            className="h-10 px-4 rounded-md text-gray-700 border border-gray-300 hover:bg-gray-50"
            onClick={onClose}
          >
            Ở lại trang này
          </button>
          <button
            className="h-10 px-4 rounded-md bg-blue-600 text-white hover:bg-blue-700"
            onClick={handleGoBack}
          >
            Quay lại
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="text-center">
          <div className="text-6xl mb-4">📚</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Bạn đã đăng ký môn thực tập
          </h3>
          <p className="text-gray-600 text-sm">
            Mỗi sinh viên chỉ được đăng ký một môn thực tập trong một kỳ
          </p>
        </div>

        {registeredSubject && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="font-medium text-gray-900 mb-1">
              {registeredSubject.name}
            </div>
            <div className="text-sm text-gray-600 mb-2">
              {registeredSubject.code} • Đăng ký ngày {new Date(currentRegistration.registeredAt).toLocaleDateString('vi-VN')}
            </div>
            <div className="text-sm text-gray-500">
              Ban chủ nhiệm: {registeredSubject.bcnManager.name}
            </div>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <span className="text-blue-600 mt-0.5">ℹ️</span>
            <div className="text-sm text-blue-800">
              <div className="font-medium mb-1">Để thay đổi môn thực tập:</div>
              <p className="text-xs">
                Vui lòng liên hệ với Ban chủ nhiệm khoa để được hỗ trợ hủy đăng ký hiện tại 
                trước khi đăng ký môn mới.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default AlreadyRegisteredDialog;
