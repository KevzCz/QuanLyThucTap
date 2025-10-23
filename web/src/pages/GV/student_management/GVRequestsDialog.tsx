import React, { useState, useEffect, useMemo } from "react";
import Modal from "../../../util/Modal";
import { apiClient } from "../../../utils/api";
import { useToast } from "../../../components/UI/Toast";

interface Request {
  _id: string;
  students: Array<{ id: string; name: string }>;
  type: "add-student" | "remove-student";
  status: "pending" | "accepted" | "rejected";
  reviewNote?: string;
  reviewedBy?: { id: string; name: string; email: string };
  reviewedAt?: string;
  createdAt: string;
  internshipSubject: { id: string; title: string };
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
  const { showError } = useToast();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "accepted" | "rejected">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "add-student" | "remove-student">("all");
  const [page, setPage] = useState(1);
  const pageSize = 5;

  useEffect(() => {
    if (open) {
      loadRequests();
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

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Yêu cầu đã gửi"
      widthClass="max-w-4xl"
      actions={
        <button className="h-10 px-4 rounded-md bg-blue-600 text-white hover:bg-blue-700" onClick={onClose}>
          Đóng
        </button>
      }
    >
      <div className="space-y-4">
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
                    <span className="text-gray-500">Môn thực tập:</span>{" "}
                    <span className="font-medium">{request.internshipSubject.title}</span>
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

        {/* Pagination */}
        {pageCount > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4">
            <button
              className="h-8 w-8 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40"
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              ‹
            </button>
            <span className="text-sm text-gray-700">
              <span className="font-semibold">{page}</span> / {pageCount}
            </span>
            <button
              className="h-8 w-8 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40"
              disabled={page === pageCount}
              onClick={() => setPage(p => Math.min(pageCount, p + 1))}
            >
              ›
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default GVRequestsDialog;
