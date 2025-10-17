import React, { useMemo, useState, useEffect } from "react";
import SearchInput from "../../../components/UI/SearchInput";
import FilterButtonGroup from "../../../components/UI/FilterButtonGroup";
import SubjectPill from "../../../components/UI/SubjectPill";
import Pagination from "../../../components/UI/Pagination";
import ViewRequestDialog from "./ViewRequestDialog";
import ConfirmApproveDialog from "./ConfirmApproveDialog";
import ConfirmDeleteDialog from "./ConfirmDeleteDialog";
import { apiClient } from "../../../utils/api";

/** Types */
export type RequestKind = "add-student" | "remove-student";
export interface RequestRow {
  _id: string;
  name: string;
  idgv: string;
  kind: RequestKind;
  createdAt: string;
  students: Array<{ id: string; name: string }>;
  internshipSubject: { id: string; title: string };
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
    className={`inline-flex h-7 w-7 items-center justify-center rounded-md text-white shadow ${className}`}
  >
    {children}
  </button>
);

const RequestManagement: React.FC = () => {
  const [subjectInfo, setSubjectInfo] = useState<{ id: string; title: string } | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | RequestKind>("all");
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Load requests on mount
  useEffect(() => {
    loadBCNManagedSubject();
    loadRequests();
  }, []);

  const loadBCNManagedSubject = async () => {
    try {
      const response = await apiClient.getBCNManagedSubject();
      if (response.success && response.subject) {
        setSubjectInfo({
          id: response.subject.id,
          title: response.subject.title
        });
      }
    } catch (err) {
      console.error("Error loading BCN subject:", err);
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
          internshipSubject: req.internshipSubject
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

  // Reload when search/filter changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadRequests();
      setPage(1);
    }, 300);
    
    return () => clearTimeout(timeoutId);
  }, [query, filter]);

  const filtered = useMemo(() => {
    // Filtering is now done on the server side
    return requests;
  }, [requests]);

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
      alert("Không thể chấp nhận yêu cầu");
    }
  };

  const reject = async (row: RequestRow, reviewNote?: string) => {
    try {
      await apiClient.rejectRequest(row._id, reviewNote);
      setRequests(prev => prev.filter(r => r._id !== row._id));
      setOpenDelete(false);
    } catch (err) {
      console.error("Error rejecting request:", err);
      alert("Không thể từ chối yêu cầu");
    }
  };

  const filterOptions = [
    { key: "all" as const, label: "Tất cả" },
    { key: "add-student" as const, label: "Thêm" },
    { key: "remove-student" as const, label: "Xóa" },
  ];

  return (
    <div className="space-y-3">
      {/* Header breadcrumb mimic */}
      <div className="text-sm text-gray-600">
        <span className="text-gray-800 font-medium">Ban chủ nhiệm</span> / Quản lý yêu cầu
      </div>

      {/* Error Alert */}
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-red-700">{error}</p>
          <button
            onClick={() => setError("")}
            className="mt-2 text-xs text-red-600 hover:text-red-800"
          >
            Đóng
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <SearchInput
            value={query}
            onChange={(value) => {
              setQuery(value);
            }}
            placeholder="Tìm kiếm tên giảng viên / yêu cầu"
            width="w-[260px]"
          />

          <FilterButtonGroup
            options={filterOptions}
            value={filter}
            onChange={(value) => {
              setFilter(value);
            }}
          />
        </div>

        <SubjectPill value={subjectInfo ? `${subjectInfo.title} (${subjectInfo.id})` : "Đang tải..."} />

        {/* right side kept empty to match spacing */}
        <div className="w-[96px]" />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr className="text-left text-xs font-semibold text-gray-600">
              <th className="px-4 py-3 w-[120px]">Mã GV</th>
              <th className="px-4 py-3">Tên</th>
              <th className="px-4 py-3 w-[200px]">Yêu cầu</th>
              <th className="px-4 py-3 w-[140px]">Ngày tạo</th>
              <th className="px-4 py-3 w-[160px]">THAO TÁC</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                    Đang tải...
                  </div>
                </td>
              </tr>
            ) : current.length === 0 ? (
              <tr>
                <td className="px-4 py-10 text-center text-gray-500" colSpan={5}>
                  {requests.length === 0 ? "Không có yêu cầu nào." : "Không có yêu cầu phù hợp."}
                </td>
              </tr>
            ) : (
              current.map((r, idx) => (
                <tr key={`${r._id}__${(page - 1) * pageSize + idx}`} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-mono text-gray-700">{r.idgv}</td>
                  <td className="px-4 py-3 text-gray-800">{r.name}</td>
                  <td className="px-4 py-3 text-gray-700">{kindText[r.kind]}</td>
                  <td className="px-4 py-3 text-gray-700">{r.createdAt}</td>
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-2">
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

        {/* Pagination */}
        {pageCount > 1 && (
          <Pagination
            currentPage={page}
            totalPages={pageCount}
            onPageChange={setPage}
          />
        )}
      </div>

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
    </div>
  );
};

export default RequestManagement;
