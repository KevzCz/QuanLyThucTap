import React, { useState, useEffect, useMemo } from "react";
import Modal from "../../../util/Modal";
import { apiClient, type InstructorRequest } from "../../../utils/api";
import { useToast } from "../../../components/UI/Toast";
import Pagination from "../../../components/UI/Pagination";
import StandardDialog from "../../../components/UI/StandardDialog";
import { Icons } from "../../../components/UI/Icons";

interface Request {
  _id: string;
  students: Array<{ id: string; name: string }>;
  type: "add-student" | "remove-student";
  status: "pending" | "accepted" | "rejected";
  reviewNote?: string;
  reviewedBy?: { id: string; name: string; email: string };
  reviewedAt?: string;
  createdAt: string;
  khoa?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

const typeLabels = {
  "add-student": "Thêm sinh viên",
  "remove-student": "Xóa sinh viên"
};

const statusLabels = {
  "pending": "Chờ duyệt",
  "accepted": "Đã chấp nhận", 
  "rejected": "Đã từ chối"
};

const statusColors = {
  "pending": "bg-yellow-50 text-yellow-700 ring-yellow-200",
  "accepted": "bg-green-50 text-green-700 ring-green-200",
  "rejected": "bg-red-50 text-red-700 ring-red-200"
};

const GVRequestsDialog: React.FC<Props> = ({ open, onClose }) => {
  const { showSuccess, showError } = useToast();
  const [activeTab, setActiveTab] = useState<'student' | 'instructor'>('student');
  const [requests, setRequests] = useState<Request[]>([]);
  const [instructorRequests, setInstructorRequests] = useState<InstructorRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "accepted" | "rejected">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "add-student" | "remove-student">("all");
  const [page, setPage] = useState(1);
  const [reviewingRequest, setReviewingRequest] = useState<InstructorRequest | null>(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve');
  const [responseMessage, setResponseMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const pageSize = 5;

  useEffect(() => {
    if (open) {
      loadRequests();
      loadInstructorRequests();
    }
  }, [open]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const response = await apiClient.request<{
        success: boolean;
        requests: Request[];
        pagination: { page: number; pages: number; total: number };
      }>('/requests/my-requests');
      
      if (response.success) {
        setRequests(response.requests);
      }
    } catch (error) {
      console.error('Error loading requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadInstructorRequests = async () => {
    try {
      const response = await apiClient.getInstructorRequestsForMe();
      setInstructorRequests(response.requests);
    } catch (error) {
      console.error('Error loading instructor requests:', error);
    }
  };

  const handleReviewClick = (request: InstructorRequest, action: 'approve' | 'reject') => {
    setReviewingRequest(request);
    setReviewAction(action);
    setResponseMessage('');
    setShowReviewDialog(true);
  };

  const handleSubmitReview = async () => {
    if (!reviewingRequest) return;

    try {
      setSubmitting(true);
      if (reviewAction === 'approve') {
        await apiClient.approveInstructorRequest(reviewingRequest._id, responseMessage);
        showSuccess('Đã chấp nhận yêu cầu thành công!');
      } else {
        await apiClient.rejectInstructorRequest(reviewingRequest._id, responseMessage);
        showSuccess('Đã từ chối yêu cầu.');
      }
      setShowReviewDialog(false);
      setReviewingRequest(null);
      setResponseMessage('');
      await loadInstructorRequests();
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Không thể xử lý yêu cầu';
      showError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const deleteRequest = async (requestId: string) => {
    try {
      await apiClient.request(`/requests/${requestId}`, { method: 'DELETE' });
      setRequests(prev => prev.filter(r => r._id !== requestId));
    } catch (error) {
      console.error('Error deleting request:', error);
      showError('Không thể xóa yêu cầu');
    }
  };

  const filtered = useMemo(() => {
    return requests.filter(req => {
      const byStatus = filter === "all" || req.status === filter;
      const byType = typeFilter === "all" || req.type === typeFilter;
      return byStatus && byType;
    });
  }, [requests, filter, typeFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = filtered.slice((page - 1) * pageSize, page * pageSize);

  const pendingInstructorReqs = instructorRequests.filter(r => r.status === 'pending');

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Quản lý yêu cầu"
      widthClass="max-w-5xl"
      actions={
        <button className="h-10 px-4 rounded-md bg-blue-600 text-white hover:bg-blue-700" onClick={onClose}>
          Đóng
        </button>
      }
    >
      <div className="space-y-4">
        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex gap-6">
            <button
              onClick={() => setActiveTab('student')}
              className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'student'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Yêu cầu thêm/xóa sinh viên
            </button>
            <button
              onClick={() => setActiveTab('instructor')}
              className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors relative ${
                activeTab === 'instructor'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Yêu cầu hướng dẫn
              {pendingInstructorReqs.length > 0 && (
                <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
                  {pendingInstructorReqs.length}
                </span>
              )}
            </button>
          </nav>
        </div>

        {/* Student Management Requests Tab */}
        {activeTab === 'student' && (
          <>
            {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as typeof filter)}
              className="h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm"
            >
              <option value="all">Tất cả</option>
              <option value="pending">Chờ duyệt</option>
              <option value="accepted">Đã chấp nhận</option>
              <option value="rejected">Đã từ chối</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Loại yêu cầu</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
              className="h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm"
            >
              <option value="all">Tất cả</option>
              <option value="add-student">Thêm sinh viên</option>
              <option value="remove-student">Xóa sinh viên</option>
            </select>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-8">
            <div className="text-gray-500">Đang tải...</div>
          </div>
        ) : current.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">📝</div>
            <div className="font-medium">Chưa có yêu cầu nào</div>
            <div className="text-sm">Các yêu cầu bạn gửi sẽ hiển thị ở đây</div>
          </div>
        ) : (
          <div className="space-y-3">
            {current.map((request) => (
              <div key={request._id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-gray-900">
                      {typeLabels[request.type]}
                    </span>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${statusColors[request.status]}`}>
                      {statusLabels[request.status]}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">
                      {new Date(request.createdAt).toLocaleDateString('vi-VN')}
                    </span>
                    {request.status === "pending" && (
                      <button
                        onClick={() => deleteRequest(request._id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                        title="Xóa yêu cầu"
                      >
                        <svg viewBox="0 0 24 24" className="h-4 w-4">
                          <path fill="currentColor" d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12z"/>
                        </svg>
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm">
                    <span className="text-gray-500">Khoa:</span>{" "}
                    <span className="font-medium">{request.khoa || "Chưa có thông tin khoa"}</span>
                  </div>
                  
                  <div className="text-sm">
                    <span className="text-gray-500">Sinh viên:</span>{" "}
                    <span className="font-medium">
                      {request.students.map(s => `${s.name} (${s.id})`).join(", ")}
                    </span>
                  </div>

                  {request.reviewNote && (
                    <div className="text-sm">
                      <span className="text-gray-500">Ghi chú:</span>{" "}
                      <span className="text-gray-800">{request.reviewNote}</span>
                    </div>
                  )}

                  {request.reviewedBy && request.reviewedAt && (
                    <div className="text-sm text-gray-500">
                      Xử lý bởi {request.reviewedBy.name} vào {new Date(request.reviewedAt).toLocaleString('vi-VN')}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

            <Pagination
              currentPage={page}
              totalPages={pageCount}
              onPageChange={setPage}
            />
          </>
        )}

        {/* Instructor Requests Tab */}
        {activeTab === 'instructor' && (
          <div className="space-y-4">
            {instructorRequests.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <div className="text-4xl mb-2">👨‍🏫</div>
                <div className="font-medium">Chưa có yêu cầu nào</div>
                <div className="text-sm">Các yêu cầu hướng dẫn từ sinh viên sẽ hiển thị ở đây</div>
              </div>
            ) : (
              <>
                {/* Pending Requests */}
                {pendingInstructorReqs.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Yêu cầu chờ xử lý ({pendingInstructorReqs.length})</h3>
                    <div className="space-y-3">
                      {pendingInstructorReqs.map((request) => (
                        <div key={request._id} className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                {Icons.users({ className: "w-8 h-8 text-gray-400" })}
                                <div>
                                  <h4 className="font-semibold text-gray-900">{request.student.name}</h4>
                                  <p className="text-sm text-gray-600">{request.student.id} • {request.student.email}</p>
                                </div>
                              </div>
                              {request.message && (
                                <div className="bg-white rounded p-3 text-sm text-gray-700 italic mt-2">
                                  "{request.message}"
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2 mt-3">
                            <button
                              onClick={() => handleReviewClick(request, 'approve')}
                              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
                            >
                              {Icons.check({ className: "w-4 h-4" })}
                              Chấp nhận
                            </button>
                            <button
                              onClick={() => handleReviewClick(request, 'reject')}
                              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center gap-2"
                            >
                              {Icons.close({ className: "w-4 h-4" })}
                              Từ chối
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Processed Requests */}
                {instructorRequests.filter(r => r.status !== 'pending').length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Lịch sử</h3>
                    <div className="space-y-3">
                      {instructorRequests.filter(r => r.status !== 'pending').map((request) => (
                        <div key={request._id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h4 className="font-medium text-gray-900">{request.student.name}</h4>
                              <p className="text-sm text-gray-600">{request.student.id}</p>
                            </div>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              request.status === 'approved'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {request.status === 'approved' ? 'Đã chấp nhận' : 'Đã từ chối'}
                            </span>
                          </div>
                          {request.responseMessage && (
                            <p className="text-sm text-gray-600 mt-2">
                              <span className="font-medium">Phản hồi:</span> {request.responseMessage}
                            </p>
                          )}
                          <p className="text-xs text-gray-500 mt-2">
                            {new Date(request.updatedAt).toLocaleString('vi-VN')}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Review Dialog */}
      <StandardDialog
        open={showReviewDialog}
        onClose={() => setShowReviewDialog(false)}
        title={reviewAction === 'approve' ? 'Chấp nhận yêu cầu' : 'Từ chối yêu cầu'}
        size="md"
        primaryAction={{
          label: submitting ? 'Đang xử lý...' : (reviewAction === 'approve' ? 'Chấp nhận' : 'Từ chối'),
          onClick: handleSubmitReview,
          variant: reviewAction === 'approve' ? 'primary' : 'danger',
          loading: submitting
        }}
        secondaryAction={{
          label: 'Hủy',
          onClick: () => setShowReviewDialog(false)
        }}
      >
        {reviewingRequest && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Thông tin sinh viên</h4>
              <p className="text-sm"><span className="font-medium">Tên:</span> {reviewingRequest.student.name}</p>
              <p className="text-sm"><span className="font-medium">MSSV:</span> {reviewingRequest.student.id}</p>
              <p className="text-sm"><span className="font-medium">Email:</span> {reviewingRequest.student.email}</p>
              {reviewingRequest.message && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-sm font-medium mb-1">Lời nhắn:</p>
                  <p className="text-sm text-gray-700 italic">"{reviewingRequest.message}"</p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phản hồi {reviewAction === 'reject' && <span className="text-red-500">*</span>}
              </label>
              <textarea
                value={responseMessage}
                onChange={(e) => setResponseMessage(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                placeholder={
                  reviewAction === 'approve'
                    ? 'Lời chào hoặc hướng dẫn cho sinh viên (tùy chọn)...'
                    : 'Lý do từ chối (bắt buộc)...'
                }
                maxLength={500}
              />
              <p className="text-xs text-gray-500 mt-1">{responseMessage.length}/500 ký tự</p>
            </div>

            {reviewAction === 'approve' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  ℹ️ Sau khi chấp nhận, sinh viên sẽ được gán vào danh sách quản lý của bạn.
                </p>
              </div>
            )}
          </div>
        )}
      </StandardDialog>
    </Modal>
  );
};

export default GVRequestsDialog;
