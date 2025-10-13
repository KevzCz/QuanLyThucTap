import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Modal from "../../../util/Modal";
import type { InternshipSubject, TeacherRegistration } from "./InternshipSubjectTypes";

interface Props {
  open: boolean;
  onClose: () => void;
  currentRegistration: TeacherRegistration | null;
  subjects: InternshipSubject[];
}

const AlreadyRegisteredDialog: React.FC<Props> = ({ 
  open, 
  onClose, 
  currentRegistration, 
  subjects 
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  if (!currentRegistration) return null;

  const registeredSubject = subjects.find(s => s.id === currentRegistration.subjectId);

  const handleGoBack = () => {
    onClose();
    
    // Get the previous location from the navigation state
    const state = location.state as { from?: string } | null;
    const previousPath = state?.from;
    
    // If there's a previous path and it's not the current registration page
    if (previousPath && !previousPath.includes('/teacher-internship-registration')) {
      navigate(previousPath, { replace: true });
    } else {
      // Check browser history
      if (window.history.length > 1) {
        // Try to go back, but set a fallback in case it fails
        const currentPath = location.pathname;
        navigate(-1);
        
        // Set a timeout to check if we're still on the same page after attempting to go back
        setTimeout(() => {
          if (window.location.pathname === currentPath) {
            // If we're still on the same page, navigate to dashboard
            navigate('/dashboard', { replace: true });
          }
        }, 100);
      } else {
        // No history available, go to dashboard
        navigate('/dashboard', { replace: true });
      }
    }
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
          <div className="text-6xl mb-4">👨‍🏫</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Bạn đã tham gia giảng dạy môn thực tập
          </h3>
          <p className="text-gray-600 text-sm">
            Mỗi giảng viên chỉ được tham gia một môn thực tập trong một kỳ
          </p>
        </div>

        {registeredSubject && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="font-medium text-gray-900 mb-1">
              {registeredSubject.title || registeredSubject.name}
            </div>
            <div className="text-sm text-gray-600 mb-2">
              {registeredSubject.id} • Tham gia ngày {currentRegistration.registeredAt ? new Date(currentRegistration.registeredAt).toLocaleDateString('vi-VN') : 'N/A'}
            </div>
            <div className="text-sm text-gray-500">
              Ban chủ nhiệm: {registeredSubject.manager?.name || registeredSubject.bcnManager?.name}
            </div>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <span className="text-blue-600 mt-0.5">ℹ️</span>
            <div className="text-sm text-blue-800">
              <div className="font-medium mb-1">Để thay đổi môn thực tập:</div>
              <p className="text-xs">
                Vui lòng liên hệ với Ban chủ nhiệm khoa để được hỗ trợ rời khỏi môn hiện tại 
                trước khi tham gia môn mới.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default AlreadyRegisteredDialog;
