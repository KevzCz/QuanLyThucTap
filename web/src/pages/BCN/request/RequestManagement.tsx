import React, { useMemo, useState, useEffect } from "react";
import SearchInput from "../../../components/UI/SearchInput";
import FilterButtonGroup from "../../../components/UI/FilterButtonGroup";
import SubjectPill from "../../../components/UI/SubjectPill";
import Pagination from "../../../components/UI/Pagination";
import ViewRequestDialog from "./ViewRequestDialog";
import ConfirmApproveDialog from "./ConfirmApproveDialog";
import ConfirmDeleteDialog from "./ConfirmDeleteDialog";
import ViewAppealDialog from "./ViewAppealDialog";
import AcceptAppealDialog from "./AcceptAppealDialog";
import RejectAppealDialog from "./RejectAppealDialog";
import { apiClient, type GradeAppeal } from "../../../utils/api";
import { useToast } from "../../../components/UI/Toast";
import { useDebounce } from "../../../hooks/useDebounce";
import EmptyState from "../../../components/UI/EmptyState";
import dayjs from "dayjs";

/** Types */
export type RequestKind = "add-student" | "remove-student";
export interface RequestRow {
  _id: string;
  name: string;
  idgv: string;
  kind: RequestKind;
  createdAt: string;
  students: Array<{ id: string; name: string }>;
  khoa?: string;
}

/** Helpers */
const kindText: Record<RequestKind, string> = {
  "add-student": "Thêm sinh viên",
  "remove-student": "Xóa sinh viên",
};

const IconBtn: React.FC<
  React.PropsWithChildren<{ title?: string; className?: string; onClick?: () => void }>
> = ({ title, className = "", onClick, children }) => (
  <button
    type="button"
    title={title}
    onClick={onClick}
    className={`inline-flex h-7 w-7 items-center justify-center rounded-md text-white shadow touch-manipulation ${className}`}
  >
    {children}
  </button>
);

const RequestManagement: React.FC = () => {
  const { showError, showSuccess } = useToast();
  const [activeTab, setActiveTab] = useState<'requests' | 'appeals'>('requests');
  const [subjectInfo, setSubjectInfo] = useState<{ id: string; title: string } | null>(null);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);
  const [filter, setFilter] = useState<"all" | RequestKind>("all");
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [appeals, setAppeals] = useState<GradeAppeal[]>([]);
  const [appealFilter, setAppealFilter] = useState<'all' | 'pending' | 'reviewing'>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  
  // Appeal dialog states
  const [selectedAppeal, setSelectedAppeal] = useState<GradeAppeal | null>(null);
  const [showAppealDialog, setShowAppealDialog] = useState(false);
  const [showAcceptAppealDialog, setShowAcceptAppealDialog] = useState(false);
  const [showRejectAppealDialog, setShowRejectAppealDialog] = useState(false);

  // Load requests on mount
  useEffect(() => {
    loadBCNManagedSubject();
    if (activeTab === 'requests') {
      loadRequests();
    } else {
      loadAppeals();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const loadBCNManagedSubject = async () => {
    try {
      const response = await apiClient.getBCNManagedSubject();
      if (response.success && response.khoa) {
        setSubjectInfo({
          id: response.khoa.id,
          title: response.khoa.title
        });
      }
    } catch (err) {
      console.error("Error loading BCN khoa:", err);
    }
  };

  const loadRequests = async () => {
    try {
      setLoading(true);
      setError("");
      
      const response = await apiClient.getBCNPendingRequests({
        search: query.trim() || undefined,
        type: filter !== "all" ? filter : undefined
      });
      
      if (response.success) {
        // Transform API response to match component expectations
        const transformedRequests: RequestRow[] = response.requests.map(req => ({
          _id: req._id,
          name: req.name,
          idgv: req.idgv,
          kind: req.type,
          createdAt: new Date(req.createdAt).toLocaleDateString('vi-VN'),
          students: req.students,
          khoa: req.khoa
        }));
        
        setRequests(transformedRequests);
      }
    } catch (err) {
      console.error("Error loading requests:", err);
      setError(err instanceof Error ? err.message : "Không thể tải danh sách yêu cầu");
    } finally {
      setLoading(false);
    }
  };

  const loadAppeals = async () => {
    try {
      setLoading(true);
      setError("");
      
      const status = appealFilter === 'all' ? undefined : appealFilter;
      const response = await apiClient.getBCNGradeAppeals(status);
      setAppeals(response.appeals);
    } catch (err) {
      console.error("Error loading appeals:", err);
      setError(err instanceof Error ? err.message : "Không thể tải danh sách phúc khảo");
    } finally {
      setLoading(false);
    }
  };

  // Reload when search/filter changes
  useEffect(() => {
    if (activeTab === 'requests') {
      loadRequests();
    } else {
      loadAppeals();
    }
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, filter, appealFilter]);

  const filtered = useMemo(() => {
    // Filtering is now done on the server side
    return requests;
  }, [requests]);

  const filteredAppeals = useMemo(() => {
    if (!debouncedQuery) return appeals;
    
    const lowerQuery = debouncedQuery.toLowerCase();
    return appeals.filter(appeal => {
      const studentName = typeof appeal.student === 'object' ? appeal.student.name?.toLowerCase() || '' : '';
      const studentId = typeof appeal.student === 'object' ? appeal.student.id?.toLowerCase() || '' : '';
      return studentName.includes(lowerQuery) || studentId.includes(lowerQuery);
    });
  }, [appeals, debouncedQuery]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = filtered.slice((page - 1) * pageSize, page * pageSize);

  /** dialogs state */
  const [viewing, setViewing] = useState<RequestRow | undefined>();
  const [openView, setOpenView] = useState(false);

  const [approving, setApproving] = useState<RequestRow | undefined>();
  const [openApprove, setOpenApprove] = useState(false);

  const [deleting, setDeleting] = useState<RequestRow | undefined>();
  const [openDelete, setOpenDelete] = useState(false);

  /** handlers */
  const approve = async (row: RequestRow, reviewNote?: string) => {
    try {
      await apiClient.acceptRequest(row._id, reviewNote);
      setRequests(prev => prev.filter(r => r._id !== row._id));
      setOpenApprove(false);
    } catch (err) {
      console.error("Error approving request:", err);
      showError("Không thể chấp nhận yêu cầu");
    }
  };

  const reject = async (row: RequestRow, reviewNote?: string) => {
    try {
      await apiClient.rejectRequest(row._id, reviewNote);
      setRequests(prev => prev.filter(r => r._id !== row._id));
      setOpenDelete(false);
    } catch (err) {
      console.error("Error rejecting request:", err);
      showError("Không thể từ chối yêu cầu");
    }
  };

  const handleAcceptAppeal = async (newSupervisorId: string, reviewNote?: string) => {
    if (!selectedAppeal) return;
    
    try {
      await apiClient.acceptGradeAppeal(selectedAppeal._id, newSupervisorId, reviewNote);
      setAppeals(prev => prev.filter(a => a._id !== selectedAppeal._id));
      setShowAcceptAppealDialog(false);
      setSelectedAppeal(null);
      showSuccess("Đã chấp nhận yêu cầu phúc khảo");
    } catch (err) {
      console.error("Error accepting appeal:", err);
      showError("Không thể chấp nhận yêu cầu phúc khảo");
    }
  };

  const handleRejectAppeal = async (reviewNote?: string) => {
    if (!selectedAppeal) return;
    
    try {
      await apiClient.rejectGradeAppeal(selectedAppeal._id, reviewNote);
      setAppeals(prev => prev.filter(a => a._id !== selectedAppeal._id));
      setShowRejectAppealDialog(false);
      setSelectedAppeal(null);
      showSuccess("Đã từ chối yêu cầu phúc khảo");
    } catch (err) {
      console.error("Error rejecting appeal:", err);
      showError("Không thể từ chối yêu cầu phúc khảo");
    }
  };

  const filterOptions = [
    { key: "all" as const, label: "Tất cả" },
    { key: "add-student" as const, label: "Thêm" },
    { key: "remove-student" as const, label: "Xóa" },
  ];

  const getAppealStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      'pending': 'Chờ duyệt',
      'accepted': 'Đã chấp nhận',
      'rejected': 'Đã từ chối',
      'reviewing': 'Đang phúc khảo',
      'completed': 'Hoàn tất'
    };
    return statusMap[status] || status;
  };

  const getAppealStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'accepted': 'bg-blue-100 text-blue-800',
      'rejected': 'bg-red-100 text-red-800',
      'reviewing': 'bg-purple-100 text-purple-800',
      'completed': 'bg-green-100 text-green-800'
    };
    return colorMap[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => {
              setActiveTab('requests');
              setPage(1);
            }}
            className={`${
              activeTab === 'requests'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Yêu cầu thêm/xóa sinh viên
          </button>
          <button
            onClick={() => {
              setActiveTab('appeals');
              setPage(1);
            }}
            className={`${
              activeTab === 'appeals'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Yêu cầu phúc khảo điểm
          </button>
        </nav>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-2.5 sm:p-3">
          <p className="text-xs sm:text-sm text-red-700">{error}</p>
          <button
            onClick={() => setError("")}
            className="mt-2 text-xs text-red-600 hover:text-red-800 touch-manipulation"
          >
            Đóng
          </button>
        </div>
      )}

      {/* Toolbar */}
      {activeTab === 'requests' ? (
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:items-center flex-wrap">
          <SearchInput
            value={query}
            onChange={(value) => {
              setQuery(value);
            }}
            placeholder="Tìm kiếm tên giảng viên / yêu cầu"
            width="w-full sm:w-[260px]"
          />

          <FilterButtonGroup
            options={filterOptions}
            value={filter}
            onChange={(value) => {
              setFilter(value);
            }}
          />

          <SubjectPill 
            value={subjectInfo ? `${subjectInfo.title} (${subjectInfo.id})` : "Đang tải..."} 
            className="w-full sm:w-auto"
          />
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:items-center flex-wrap">
          <SearchInput
            value={query}
            onChange={(value) => {
              setQuery(value);
            }}
            placeholder="Tìm kiếm tên sinh viên..."
            width="w-full sm:w-[260px]"
          />

          <FilterButtonGroup
            options={[
              { key: "all" as const, label: "Tất cả" },
              { key: "pending" as const, label: "Chờ duyệt" },
              { key: "reviewing" as const, label: "Đang phúc khảo" },
            ]}
            value={appealFilter}
            onChange={(value) => {
              setAppealFilter(value);
            }}
          />

          <SubjectPill 
            value={subjectInfo ? `${subjectInfo.title} (${subjectInfo.id})` : "Đang tải..."} 
            className="w-full sm:w-auto"
          />
        </div>
      )}

      {/* Requests Table */}
      {activeTab === 'requests' && (
        <div className="overflow-hidden rounded-lg sm:rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr className="text-left text-xs font-semibold text-gray-600">
                  <th className="px-3 sm:px-4 py-2.5 sm:py-3 min-w-[100px] sm:w-[120px]">Mã GV</th>
                  <th className="px-3 sm:px-4 py-2.5 sm:py-3 min-w-[150px]">Tên</th>
                  <th className="px-3 sm:px-4 py-2.5 sm:py-3 min-w-[160px] sm:w-[200px]">Yêu cầu</th>
                  <th className="px-3 sm:px-4 py-2.5 sm:py-3 min-w-[120px] sm:w-[140px]">Ngày tạo</th>
                  <th className="px-3 sm:px-4 py-2.5 sm:py-3 min-w-[140px] sm:w-[160px]">THAO TÁC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs sm:text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-3 sm:px-4 py-6 sm:py-8 text-center text-gray-500">
                      <div className="flex items-center justify-center gap-2">
                        <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                        Đang tải...
                      </div>
                    </td>
                  </tr>
                ) : current.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 sm:px-4 py-2">
                      <EmptyState
                        icon={requests.length === 0 ? "📝" : "🔍"}
                        title={requests.length === 0 ? "Không có yêu cầu nào" : "Không tìm thấy yêu cầu"}
                        description={
                          requests.length === 0
                            ? "Các yêu cầu từ giảng viên sẽ xuất hiện ở đây"
                            : "Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm"
                        }
                      />
                    </td>
                  </tr>
                ) : (
                  current.map((r, idx) => (
                    <tr key={`${r._id}__${(page - 1) * pageSize + idx}`} className="hover:bg-gray-50/50">
                      <td className="px-3 sm:px-4 py-2.5 sm:py-3 font-mono text-gray-700">{r.idgv}</td>
                      <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-gray-800">{r.name}</td>
                      <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-gray-700">{kindText[r.kind]}</td>
                      <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-gray-700">{r.createdAt}</td>
                      <td className="px-2 py-2">
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <IconBtn
                            title="Xem"
                            className="bg-sky-500 hover:bg-sky-600"
                            onClick={() => {
                              setViewing(r);
                              setOpenView(true);
                            }}
                          >
                            <svg viewBox="0 0 24 24" className="h-4 w-4">
                              <path
                                fill="currentColor"
                                d="M12 5c-7 0-10 7-10 7s3 7 10 7 10-7 10-7-3-7-10-7Zm0 12a5 5 0 1 1 0-10a5 5 0 0 1 0 10Z"
                              />
                            </svg>
                          </IconBtn>

                          <IconBtn
                            title="Chấp nhận"
                            className="bg-emerald-500 hover:bg-emerald-600"
                            onClick={() => {
                              setApproving(r);
                              setOpenApprove(true);
                            }}
                          >
                            <svg viewBox="0 0 24 24" className="h-4 w-4">
                              <path fill="currentColor" d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                            </svg>
                          </IconBtn>

                          <IconBtn
                            title="Từ chối yêu cầu"
                            className="bg-rose-500 hover:bg-rose-600"
                            onClick={() => {
                              setDeleting(r);
                              setOpenDelete(true);
                            }}
                          >
                            <svg viewBox="0 0 24 24" className="h-4 w-4">
                              <path fill="currentColor" d="M6 7h12v2H6zm2 3h8l-1 10H9L8 10Zm3-7h2l1 2h4v2H6V5h4l1-2Z" />
                            </svg>
                          </IconBtn>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pageCount > 1 && (
            <Pagination
              currentPage={page}
              totalPages={pageCount}
              onPageChange={setPage}
            />
          )}
        </div>
      )}

      {/* Appeals Table */}
      {activeTab === 'appeals' && (
        <div className="overflow-hidden rounded-lg sm:rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr className="text-left text-xs font-semibold text-gray-600">
                  <th className="px-3 sm:px-4 py-2.5 sm:py-3 min-w-[100px] sm:w-[120px]">Mã SV</th>
                  <th className="px-3 sm:px-4 py-2.5 sm:py-3 min-w-[150px]">Tên sinh viên</th>
                  <th className="px-3 sm:px-4 py-2.5 sm:py-3 min-w-[80px] sm:w-[100px]">Điểm</th>
                  <th className="px-3 sm:px-4 py-2.5 sm:py-3 min-w-[200px]">Lý do phúc khảo</th>
                  <th className="px-3 sm:px-4 py-2.5 sm:py-3 min-w-[120px] sm:w-[140px]">Trạng thái</th>
                  <th className="px-3 sm:px-4 py-2.5 sm:py-3 min-w-[120px] sm:w-[140px]">Ngày tạo</th>
                  <th className="px-3 sm:px-4 py-2.5 sm:py-3 min-w-[140px] sm:w-[160px]">THAO TÁC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs sm:text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-3 sm:px-4 py-6 sm:py-8 text-center text-gray-500">
                      <div className="flex items-center justify-center gap-2">
                        <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                        Đang tải...
                      </div>
                    </td>
                  </tr>
                ) : filteredAppeals.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 sm:px-4 py-2">
                      <EmptyState
                        icon={appeals.length === 0 ? "📝" : "🔍"}
                        title={appeals.length === 0 ? "Không có yêu cầu phúc khảo nào" : "Không tìm thấy yêu cầu phúc khảo"}
                        description={
                          appeals.length === 0
                            ? "Các yêu cầu phúc khảo từ sinh viên sẽ xuất hiện ở đây"
                            : "Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm"
                        }
                      />
                    </td>
                  </tr>
                ) : (
                  filteredAppeals.map((appeal) => (
                    <tr key={appeal._id} className="hover:bg-gray-50/50">
                      <td className="px-3 sm:px-4 py-2.5 sm:py-3 font-mono text-gray-700">
                        {typeof appeal.student === 'object' && appeal.student?.id}
                      </td>
                      <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-gray-800">
                        {typeof appeal.student === 'object' && appeal.student?.name}
                      </td>
                      <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-gray-700">
                        {typeof appeal.internshipGrade === 'object' && appeal.internshipGrade?.letterGrade && (
                          <span className="font-semibold">{appeal.internshipGrade.letterGrade}</span>
                        )}
                      </td>
                      <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-gray-700">
                        <div className="max-w-xs truncate" title={appeal.appealReason}>
                          {appeal.appealReason}
                        </div>
                      </td>
                      <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getAppealStatusColor(appeal.status)}`}>
                          {getAppealStatusText(appeal.status)}
                        </span>
                      </td>
                      <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-gray-700">
                        {dayjs(appeal.createdAt).format('DD/MM/YYYY')}
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <IconBtn
                            title="Xem"
                            className="bg-sky-500 hover:bg-sky-600"
                            onClick={() => {
                              setSelectedAppeal(appeal);
                              setShowAppealDialog(true);
                            }}
                          >
                            <svg viewBox="0 0 24 24" className="h-4 w-4">
                              <path
                                fill="currentColor"
                                d="M12 5c-7 0-10 7-10 7s3 7 10 7 10-7 10-7-3-7-10-7Zm0 12a5 5 0 1 1 0-10a5 5 0 0 1 0 10Z"
                              />
                            </svg>
                          </IconBtn>

                          {appeal.status === 'pending' && (
                            <>
                              <IconBtn
                                title="Chấp nhận"
                                className="bg-emerald-500 hover:bg-emerald-600"
                                onClick={() => {
                                  setSelectedAppeal(appeal);
                                  setShowAcceptAppealDialog(true);
                                }}
                              >
                                <svg viewBox="0 0 24 24" className="h-4 w-4">
                                  <path fill="currentColor" d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                                </svg>
                              </IconBtn>

                              <IconBtn
                                title="Từ chối"
                                className="bg-rose-500 hover:bg-rose-600"
                                onClick={() => {
                                  setSelectedAppeal(appeal);
                                  setShowRejectAppealDialog(true);
                                }}
                              >
                                <svg viewBox="0 0 24 24" className="h-4 w-4">
                                  <path fill="currentColor" d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                                </svg>
                              </IconBtn>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <ViewRequestDialog
        open={openView}
        onClose={() => setOpenView(false)}
        row={viewing}
        onAccept={() => {
          if (viewing) setApproving(viewing);
          setOpenView(false);
          setOpenApprove(true);
        }}
        onReject={() => {
          if (viewing) setDeleting(viewing);
          setOpenView(false);
          setOpenDelete(true);
        }}
      />

      <ConfirmApproveDialog
        open={openApprove}
        onClose={() => setOpenApprove(false)}
        request={approving}
        onConfirm={(reviewNote) => {
          if (approving) approve(approving, reviewNote);
        }}
      />

      <ConfirmDeleteDialog
        open={openDelete}
        onClose={() => setOpenDelete(false)}
        request={deleting}
        onConfirm={(reviewNote) => {
          if (deleting) reject(deleting, reviewNote);
        }}
      />

      {/* Appeal Dialogs */}
      <ViewAppealDialog
        open={showAppealDialog}
        onClose={() => setShowAppealDialog(false)}
        appeal={selectedAppeal}
        onAccept={() => {
          setShowAppealDialog(false);
          setShowAcceptAppealDialog(true);
        }}
        onReject={() => {
          setShowAppealDialog(false);
          setShowRejectAppealDialog(true);
        }}
      />

      <AcceptAppealDialog
        open={showAcceptAppealDialog}
        onClose={() => setShowAcceptAppealDialog(false)}
        appeal={selectedAppeal}
        onConfirm={handleAcceptAppeal}
      />

      <RejectAppealDialog
        open={showRejectAppealDialog}
        onClose={() => setShowRejectAppealDialog(false)}
        appeal={selectedAppeal}
        onConfirm={handleRejectAppeal}
      />
    </div>
  );
};

export default RequestManagement;
