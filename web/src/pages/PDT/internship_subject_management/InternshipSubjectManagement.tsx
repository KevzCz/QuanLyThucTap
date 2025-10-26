import React, { useState, useEffect } from "react";
import {
  CreateInternshipSubjectDialog,
  EditInternshipSubjectDialog,
  ViewInternshipSubjectDialog,
  DeleteInternshipSubjectDialog,
  ConfirmStatusInternshipSubjectDialog,
} from "../index";
import { apiClient } from "../../../utils/api";
import { type InternshipSubject, type InternshipStatus } from "./InternshipSubjectTypes";
import { useToast } from "../../../components/UI/Toast";
import Pagination from "../../../components/UI/Pagination";
/* --- Local helpers (UI only) --- */
const statusChip = (s: InternshipStatus) =>
  s === "open" ? (
    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
      Mở
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700 ring-1 ring-inset ring-rose-200">
      Khóa
    </span>
  );

const IconBtn: React.FC<
  React.PropsWithChildren<{ className?: string; title?: string; onClick?: () => void }>
> = ({ className = "", title, onClick, children }) => (
  <button
    type="button"
    title={title}
    onClick={onClick}
    className={`inline-flex h-7 w-7 items-center justify-center rounded-md text-white shadow ${className}`}
  >
    {children}
  </button>
);

/* --- Page --- */
const InternshipSubjectManagement: React.FC = () => {
  const { showSuccess, showError } = useToast();
  // table/filter state
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | InternshipStatus>("all");
  const [rows, setRows] = useState<InternshipSubject[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const pageSize = 10;

  // dialogs state
  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [openView, setOpenView] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const [selected, setSelected] = useState<InternshipSubject | undefined>(undefined);

  // lock/unlock confirm
  const [openConfirmStatus, setOpenConfirmStatus] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<InternshipStatus>("open");

  // Load data on mount and when filters change
  useEffect(() => {
    loadInternshipSubjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, query, status]);

  const loadInternshipSubjects = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await apiClient.getInternshipSubjects({
        page,
        limit: pageSize,
        status: status === "all" ? undefined : status,
        search: query.trim() || undefined,
      });

      setRows(response.subjects);
      setTotalPages(response.pagination.pages);
    }  catch (err: Error | unknown) {
      console.error("Error loading internship subjects:", err);
      setError("Không thể tải danh sách môn thực tập");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle search with debounce
  const [searchTimeout, setSearchTimeout] = useState<number>();
  const handleSearch = (value: string) => {
    setQuery(value);
    setPage(1);

    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    const timeout = setTimeout(() => {
      loadInternshipSubjects();
    }, 500);

    setSearchTimeout(timeout);
  };

  // dialog handlers
  const onCreate = (subject: InternshipSubject) => {
    setRows((prev) => [subject, ...prev.slice(0, pageSize - 1)]);
    if (page === 1) {
      loadInternshipSubjects();
    }
  };

  const onSave = (subject: InternshipSubject) => {
    setRows((prev) => prev.map((r) => (r.id === subject.id ? subject : r)));
  };

  const onDelete = async () => {
    if (!selected) return;

    try {
      await apiClient.deleteInternshipSubject(selected.id);
      setRows((prev) => prev.filter((r) => r.id !== selected.id));
      setOpenDelete(false);
      showSuccess("Xóa môn thực tập thành công");
      loadInternshipSubjects();
    }  catch (err: Error | unknown) {
      console.error("Error deleting internship subject:", err);
      setError("Không thể xóa môn thực tập");
      showError("Không thể xóa môn thực tập");
    }
  };

  const requestToggleStatus = (subject: InternshipSubject) => {
    setSelected(subject);
    setPendingStatus(subject.status === "open" ? "locked" : "open");
    setOpenConfirmStatus(true);
  };

  const confirmToggleStatus = async (id: string, nextStatus: InternshipStatus) => {
    try {
      const response = await apiClient.updateInternshipSubject(id, { status: nextStatus });
      setRows((prev) => prev.map((r) => (r.id === id ? response.subject : r)));
      setOpenConfirmStatus(false);
      showSuccess(`Đã ${nextStatus === "open" ? "mở" : "khóa"} môn thực tập`);
    }  catch (err: Error | unknown) {
      console.error("Error updating status:", err);
      setError("Không thể cập nhật trạng thái");
      showError("Không thể cập nhật trạng thái");
    }
  };

  return (
    <div className="space-y-3">
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
      <div className="flex flex-col gap-3">
        {/* Search bar - full width on mobile */}
        <div className="relative w-full sm:w-auto">
          <span className="absolute inset-y-0 left-3 flex items-center text-gray-400">
            <svg viewBox="0 0 24 24" className="h-4 w-4">
              <path
                fill="currentColor"
                d="M10 2a8 8 0 1 1-5.3 13.9l-3.4 3.4 1.4 1.4 3.4-3.4A8 8 0 0 1 10 2m0 2a6 6 0 1 0 0 12A6 6 0 0 0 10 4z"
              />
            </svg>
          </span>
          <input
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Tìm kiếm tên, mã môn..."
            className="w-full sm:w-[320px] h-10 rounded-lg border border-gray-300 bg-white pl-8 pr-3 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
        </div>

        {/* Filters and action buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {(["all", "open", "locked"] as const).map((k) => (
              <button
                key={k}
                onClick={() => {
                  setStatus(k);
                  setPage(1);
                }}
                disabled={loading}
                className={`h-9 rounded-md px-3 text-sm border transition disabled:opacity-50 whitespace-nowrap ${
                  status === k
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                {k === "all" ? "Tất cả" : k === "open" ? "Mở" : "Khóa"}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-cyan-600 px-3 h-10 text-white text-sm hover:bg-cyan-700 disabled:opacity-50 touch-manipulation whitespace-nowrap"
            onClick={() => setOpenCreate(true)}
            disabled={loading}
            title="Thêm môn thực tập"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 flex-shrink-0">
              <path fill="currentColor" d="M19 11h-6V5h-2v6H5v2h6v6h2v-6h6z" />
            </svg>
            <span>Thêm môn thực tập</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr className="text-left text-xs font-semibold text-gray-600">
                <th className="px-3 sm:px-4 py-3 w-[110px] sm:w-[140px]">Mã</th>
                <th className="px-3 sm:px-4 py-3 min-w-[180px]">Tên</th>
                <th className="px-3 sm:px-4 py-3 w-[90px] sm:w-[120px]">Sinh viên</th>
                <th className="px-3 sm:px-4 py-3 min-w-[150px] sm:w-[200px]">Ban chủ nhiệm</th>
              <th className="px-3 sm:px-4 py-3 w-[90px] sm:w-[100px]">Trạng thái</th>
              <th className="px-3 sm:px-4 py-3 w-[140px] sm:w-[160px]">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                    Đang tải...
                  </div>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                  {query || status !== "all" ? "Không có môn phù hợp." : "Chưa có môn thực tập nào."}
                </td>
              </tr>
            ) : (
              rows.map((subject) => (
                <tr key={subject.id} className="hover:bg-gray-50/50">
                  <td className="px-3 sm:px-4 py-3 font-mono text-xs sm:text-sm text-gray-700">{subject.id}</td>
                  <td className="px-3 sm:px-4 py-3 text-gray-800">{subject.title}</td>
                  <td className="px-3 sm:px-4 py-3">
                    <span className="text-blue-600 font-medium">{subject.currentStudents}</span>
                    <span className="text-gray-400">/{subject.maxStudents}</span>
                  </td>
                  <td className="px-3 sm:px-4 py-3 text-gray-700">
                    <div>{subject.manager.name}</div>
                    <div className="text-xs text-gray-500">{subject.manager.id}</div>
                  </td>
                  <td className="px-3 sm:px-4 py-3">{statusChip(subject.status)}</td>
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-1 sm:gap-2">
                      <IconBtn
                        className="bg-sky-500 hover:bg-sky-600 touch-manipulation"
                        title="Xem"
                        onClick={() => {
                          setSelected(subject);
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
                        className="bg-emerald-500 hover:bg-emerald-600 touch-manipulation"
                        title="Sửa"
                        onClick={() => {
                          setSelected(subject);
                          setOpenEdit(true);
                        }}
                      >
                        <svg viewBox="0 0 24 24" className="h-4 w-4">
                          <path
                            fill="currentColor"
                            d="M3 17.2V21h3.8l11-11L14 6.2l-11 11ZM20.7 7.04a1 1 0 0 0 0-1.41L18.37 3.3a1 1 0 0 0-1.41 0L15.1 5.16l3.33 3.33l2.27-1.45Z"
                          />
                        </svg>
                      </IconBtn>

                      <IconBtn
                        className={`${subject.status === "open" ? "bg-amber-500 hover:bg-amber-600" : "bg-indigo-500 hover:bg-indigo-600"} touch-manipulation`}
                        title={subject.status === "open" ? "Khóa" : "Mở"}
                        onClick={() => requestToggleStatus(subject)}
                      >
                        {subject.status === "open" ? (
                          <svg viewBox="0 0 24 24" className="h-4 w-4">
                            <path
                              fill="currentColor"
                              d="M17 8h-1V6a4 4 0 1 0-8 0v2H7a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2Zm-3 0h-4V6a2 2 0 1 1 4 0v2Z"
                            />
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" className="h-4 w-4">
                            <path
                              fill="currentColor"
                              d="M7 8h10a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2Zm5-6a4 4 0 0 1 4 4h-2a2 2 0 1 0-4 0H8a4 4 0 0 1 4-4Z"
                            />
                          </svg>
                        )}
                      </IconBtn>

                      <IconBtn
                        className="bg-rose-500 hover:bg-rose-600 touch-manipulation"
                        title="Xóa"
                        onClick={() => {
                          setSelected(subject);
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

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </div>

      {/* Dialogs */}
      <CreateInternshipSubjectDialog open={openCreate} onClose={() => setOpenCreate(false)} onCreate={onCreate} />
      <EditInternshipSubjectDialog open={openEdit} onClose={() => setOpenEdit(false)} internshipSubject={selected} onSave={onSave} />
      <ViewInternshipSubjectDialog open={openView} onClose={() => setOpenView(false)} internshipSubject={selected} />
      <DeleteInternshipSubjectDialog
        open={openDelete}
        onClose={() => setOpenDelete(false)}
        internshipSubject={selected}
        onConfirm={onDelete}
      />
      <ConfirmStatusInternshipSubjectDialog
        open={openConfirmStatus}
        onClose={() => setOpenConfirmStatus(false)}
        internshipSubject={selected}
        nextStatus={pendingStatus}
        onConfirm={confirmToggleStatus}
      />
    </div>
  );
};

export default InternshipSubjectManagement;
