import React, { useState, useEffect, useCallback } from 'react';
import StandardDialog from './UI/StandardDialog';
import { Icons } from './UI/Icons';
import { useToast } from './UI/Toast';
import { apiClient, type AvailableLecturer, type InstructorRequest } from '../utils/api';

interface InstructorSelectionDialogProps {
  open: boolean;
  onClose?: () => void;
  isForced?: boolean;
  onSuccess?: () => void;
}

const InstructorSelectionDialog: React.FC<InstructorSelectionDialogProps> = ({
  open,
  onClose,
  isForced = false,
  onSuccess
}) => {
  const { showSuccess, showError } = useToast();
  const [lecturers, setLecturers] = useState<AvailableLecturer[]>([]);
  const [pendingRequests, setPendingRequests] = useState<InstructorRequest[]>([]);
  const [selectedLecturer, setSelectedLecturer] = useState<string>('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingLecturers, setLoadingLecturers] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoadingLecturers(true);
      const [lecturersResponse, requestsResponse] = await Promise.all([
        apiClient.getAvailableLecturers(),
        apiClient.getMyInstructorRequests()
      ]);
      setLecturers(lecturersResponse.lecturers);
      setPendingRequests(requestsResponse.requests.filter(r => r.status === 'pending'));
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Không thể tải dữ liệu';
      showError(msg);
    } finally {
      setLoadingLecturers(false);
    }
  }, [showError]);

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open, loadData]);

  const handleCancelRequest = async (requestId: string) => {
    try {
      setCancelling(requestId);
      await apiClient.cancelInstructorRequest(requestId);
      showSuccess('Đã hủy yêu cầu thành công');
      await loadData(); // Reload data
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Không thể hủy yêu cầu';
      showError(msg);
    } finally {
      setCancelling(null);
    }
  };

  const handleSubmit = async () => {
    if (!selectedLecturer) {
      showError('Vui lòng chọn giảng viên hướng dẫn');
      return;
    }

    try {
      setLoading(true);
      await apiClient.createInstructorRequest(selectedLecturer, message);
      showSuccess('Đã gửi yêu cầu thành công! Vui lòng chờ giảng viên phản hồi.');
      
      // Reset form
      setSelectedLecturer('');
      setMessage('');
      
      if (onSuccess) {
        onSuccess();
      }
      
      if (onClose && !isForced) {
        onClose();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Không thể gửi yêu cầu. Vui lòng thử lại.';
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <StandardDialog
      open={open}
      onClose={isForced ? () => {} : (onClose || (() => {}))}
      title={isForced ? '👨‍🏫 Chọn giảng viên hướng dẫn' : 'Đăng ký giảng viên hướng dẫn'}
      size="lg"
      primaryAction={{
        label: loading ? 'Đang gửi...' : 'Đăng ký',
        onClick: handleSubmit,
        variant: 'primary',
        loading: loading
      }}
      secondaryAction={!isForced && onClose ? {
        label: 'Hủy',
        onClick: onClose
      } : undefined}
    >
      <div className="space-y-4">
        {isForced && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-start">
              <span className="text-2xl mr-3">ℹ️</span>
              <div>
                <h4 className="text-sm font-medium text-blue-900">Yêu cầu đăng ký</h4>
                <p className="text-sm text-blue-700 mt-1">
                  Bạn cần chọn giảng viên hướng dẫn để có thể tiếp tục sử dụng các tính năng của hệ thống.
                  Sau khi gửi yêu cầu, vui lòng chờ giảng viên phản hồi.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Pending Requests */}
        {pendingRequests.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-yellow-900 mb-2">Yêu cầu đang chờ xử lý</h4>
            <div className="space-y-2">
              {pendingRequests.map((request) => (
                <div key={request._id} className="flex items-center justify-between bg-white rounded p-3">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{request.requestedInstructor.name}</p>
                    <p className="text-sm text-gray-600">{request.requestedInstructor.id}</p>
                    {request.message && (
                      <p className="text-xs text-gray-500 mt-1 italic">"{request.message}"</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleCancelRequest(request._id)}
                    disabled={cancelling === request._id}
                    className="ml-4 px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {cancelling === request._id ? 'Đang hủy...' : 'Hủy'}
                  </button>
                </div>
              ))}
            </div>
            <p className="text-xs text-yellow-700 mt-2">
              Bạn có thể hủy yêu cầu để chọn giảng viên khác
            </p>
          </div>
        )}

        {/* Lecturers List */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Chọn giảng viên hướng dẫn <span className="text-red-500">*</span>
          </label>
          
          {loadingLecturers ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-600">Đang tải danh sách giảng viên...</p>
            </div>
          ) : lecturers.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
              <Icons.users className="w-12 h-12 mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-600">Không có giảng viên nào khả dụng</p>
            </div>
          ) : (
            <div className="border border-gray-300 rounded-lg max-h-96 overflow-y-auto">
              {lecturers.map((lecturer) => {
                const isFull = lecturer.currentStudentCount >= lecturer.maxStudents;
                return (
                  <div
                    key={lecturer._id}
                    onClick={() => !isFull && setSelectedLecturer(lecturer._id)}
                    className={`p-4 border-b last:border-b-0 cursor-pointer transition-colors ${
                      selectedLecturer === lecturer._id
                        ? 'bg-blue-50 border-l-4 border-l-blue-600'
                        : isFull
                        ? 'bg-gray-50 cursor-not-allowed opacity-60'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            checked={selectedLecturer === lecturer._id}
                            onChange={() => !isFull && setSelectedLecturer(lecturer._id)}
                            disabled={isFull}
                            className="mt-0.5"
                          />
                          <div>
                            <h4 className="font-medium text-gray-900">{lecturer.name}</h4>
                            <p className="text-sm text-gray-600">{lecturer.id} • {lecturer.email}</p>
                            <p className="text-xs text-gray-500 mt-1">Khoa: {lecturer.khoa}</p>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          isFull
                            ? 'bg-red-100 text-red-800'
                            : lecturer.currentStudentCount >= lecturer.maxStudents * 0.8
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {lecturer.currentStudentCount}/{lecturer.maxStudents} sinh viên
                        </span>
                        {isFull && (
                          <p className="text-xs text-red-600 mt-1">Đã đầy</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Message */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Lời nhắn (tùy chọn)
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows={3}
            placeholder="Giới thiệu bản thân hoặc lý do muốn đăng ký với giảng viên này..."
            maxLength={500}
          />
          <p className="text-xs text-gray-500 mt-1">{message.length}/500 ký tự</p>
        </div>
      </div>
    </StandardDialog>
  );
};

export default InstructorSelectionDialog;
