import React, { useMemo, useState, useEffect } from "react";
import {
  type Participant,
  type ParticipantRole,
  type ParticipantStatus,
  type InternshipSubjectDetail,
  roleLabel,
  convertToParticipants,
} from "./ParticipantsTypes";
import ViewParticipantDialog from "./ViewParticipantDialog";
import EditStudentAdvisorDialog from "./EditStudentAdvisorDialog";
import { apiClient } from "../../../utils/api";
import SearchInput from "../../../components/UI/SearchInput";
import FilterButtonGroup from "../../../components/UI/FilterButtonGroup";
import SubjectPill from "../../../components/UI/SubjectPill";
import Pagination from "../../../components/UI/Pagination";
import { useDebounce } from "../../../hooks/useDebounce";
import EmptyState from "../../../components/UI/EmptyState";
import { useToast } from "../../../components/UI/Toast";

/* ---------- UI helpers ---------- */
const StatusChip: React.FC<{ v: ParticipantStatus }> = ({ v }) => {
  const map: Record<ParticipantStatus, { text: string; cls: string }> = {
    "dang-huong-dan": { text: "Đang hướng dẫn", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
    "chua-co-sinh-vien": { text: "Chưa có sinh viên", cls: "bg-gray-50 text-gray-700 ring-gray-200" },
    "duoc-huong-dan": { text: "Được hướng dẫn", cls: "bg-blue-50 text-blue-700 ring-blue-200" },
    "chua-duoc-huong-dan": { text: "Chưa được hướng dẫn", cls: "bg-amber-50 text-amber-700 ring-amber-200" },
    "dang-lam-do-an": { text: "Đang làm đồ án", cls: "bg-indigo-50 text-indigo-700 ring-indigo-200" },
    "dang-thuc-tap": { text: "Đang thực tập", cls: "bg-purple-50 text-purple-700 ring-purple-200" },
  };
  const m = map[v];
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${m.cls}`}>
      {m.text}
    </span>
  );
};

const IconBtn: React.FC<
  React.PropsWithChildren<{ className?: string; title?: string; onClick?: () => void }>
> = ({ className = "", title, onClick, children }) => (
  <button
    type="button"
    title={title}
    onClick={onClick}
    className={`inline-flex h-7 w-7 items-center justify-center rounded-md text-white shadow touch-manipulation ${className}`}
  >
    {children}
  </button>
);

/* ---------- MAIN ---------- */
const InternshipSubjectManagement: React.FC = () => {
  const { showSuccess, showError } = useToast();
  
  // backend data
  const [subjectData, setSubjectData] = useState<InternshipSubjectDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // filters & paging
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);
  const [roleFilter, setRoleFilter] = useState<"all" | ParticipantRole>("all");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // dialogs
  const [viewing, setViewing] = useState<Participant | undefined>();
  const [openView, setOpenView] = useState(false);
  const [editingSv, setEditingSv] = useState<Participant | undefined>();
  const [openEditAdvisor, setOpenEditAdvisor] = useState(false);

  // Load BCN's managed subject on mount
  useEffect(() => {
    loadManagedSubject();
  }, []);

  const loadManagedSubject = async () => {
    try {
      setLoading(true);
      setError("");
      
      const response = await apiClient.getBCNManagedSubject();
      setSubjectData(response.khoa);
    } catch (err: unknown) {
      console.error("Error loading managed khoa:", err);
      setError("Không thể tải thông tin khoa");
    } finally {
      setLoading(false);
    }
  };

  // Convert backend data to participants
  const participants = useMemo(() => {
    return subjectData ? convertToParticipants(subjectData) : [];
  }, [subjectData]);

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    return participants.filter((r) => {
      const byRole = roleFilter === "all" ? true : r.role === roleFilter;
      const byQuery = !q || 
        (r.name && r.name.toLowerCase().includes(q)) || 
        (r.id && r.id.toLowerCase().includes(q));
      return byRole && byQuery;
    });
  }, [participants, roleFilter, debouncedQuery]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = filtered.slice((page - 1) * pageSize, page * pageSize);


  // bulk confirm from import (both flows)


  // update student's advisor
  const saveStudentAdvisor = async (svId: string, advisorId?: string) => {
    try {
      setError("");
      await apiClient.updateStudentSupervisor(svId, advisorId);
      await loadManagedSubject(); // Reload data
      setOpenEditAdvisor(false);
      showSuccess("Đã cập nhật giảng viên hướng dẫn");
    } catch (err: unknown) {
      console.error("Error updating student supervisor:", err);
      const errorMessage = err instanceof Error ? err.message : "Không thể cập nhật giảng viên hướng dẫn";
      setError(errorMessage);
      showError(errorMessage);
    }
  };

  // remove participant - Disabled: BCN cannot remove students/lecturers from khoa
  // This function is kept for UI compatibility but shows an error message
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const removeParticipant = async (participant: Participant) => {
    showError("Chức năng xóa thành viên khỏi khoa không khả dụng. Vui lòng liên hệ Phòng Đào Tạo.");
  };

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Đang tải thông tin môn thực tập...</div>
      </div>
    );
  }

  // Show no subject message
  if (!subjectData) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 mb-4">Bạn chưa được phân công quản lý môn thực tập nào.</div>
        <button
          onClick={loadManagedSubject}
          className="text-blue-600 hover:text-blue-700 text-sm"
        >
          Tải lại
        </button>
      </div>
    );
  }

  const filterOptions = [
    { key: "all" as const, label: "Tất cả" },
    { key: "sinh-vien" as const, label: "Sinh viên" },
    { key: "giang-vien" as const, label: "Giảng viên" },
  ];

  return (
    <div className="space-y-3 sm:space-y-4">
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
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:items-center flex-wrap">
        <SearchInput
          value={query}
          onChange={(value) => {
            setQuery(value);
            setPage(1);
          }}
          placeholder="Tìm kiếm tên sinh viên / giảng viên"
          width="w-full sm:w-[300px]"
        />

        <FilterButtonGroup
          options={filterOptions}
          value={roleFilter}
          onChange={(value) => {
            setRoleFilter(value);
            setPage(1);
          }}
        />

        <SubjectPill 
          value={subjectData ? `${subjectData.title} (${subjectData.id})` : "Đang tải..."}
          className="w-full sm:w-auto"
        />


      </div>


      {/* Table */}
      <div className="overflow-hidden rounded-lg sm:rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr className="text-left text-xs font-semibold text-gray-600">
                <th className="px-3 sm:px-4 py-2.5 sm:py-3 min-w-[100px] sm:w-[120px]">Mã</th>
                <th className="px-3 sm:px-4 py-2.5 sm:py-3 min-w-[150px]">Tên</th>
                <th className="px-3 sm:px-4 py-2.5 sm:py-3 min-w-[120px] sm:w-[140px]">Vai trò</th>
                <th className="px-3 sm:px-4 py-2.5 sm:py-3 min-w-[180px] sm:w-[220px]">Trạng thái</th>
                <th className="px-3 sm:px-4 py-2.5 sm:py-3 min-w-[140px] sm:w-[160px]">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs sm:text-sm">
              {current.map((p, idx) => (
                <tr key={`${p.id}__${(page - 1) * pageSize + idx}`} className="hover:bg-gray-50/50">
                  <td className="px-3 sm:px-4 py-2.5 sm:py-3 font-mono text-gray-700">{p.id}</td>
                  <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-gray-800">{p.name}</td>
                  <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-gray-700">{roleLabel[p.role]}</td>
                  <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                    <StatusChip v={p.status} />
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <IconBtn
                        className="bg-sky-500 hover:bg-sky-600"
                        title="Xem"
                        onClick={() => {
                          setViewing(p);
                          setOpenView(true);
                        }}
                      >
                        <svg viewBox="0 0 24 24" className="h-4 w-4"><path fill="currentColor" d="M12 5c-7 0-10 7-10 7s3 7 10 7 10-7 10-7-3-7-10-7Zm0 12a5 5 0 1 1 0-10a5 5 0 0 1 0 10Z"/></svg>
                      </IconBtn>

                      {p.role === "sinh-vien" && (
                        <IconBtn
                          className="bg-emerald-500 hover:bg-emerald-600"
                          title="Sửa GV hướng dẫn"
                          onClick={() => {
                            setEditingSv(p);
                            setOpenEditAdvisor(true);
                          }}
                        >
                          <svg viewBox="0 0 24 24" className="h-4 w-4"><path fill="currentColor" d="M3 17.2V21h3.8l11-11L14 6.2l-11 11ZM20.7 7.04a1 1 0 0 0 0-1.41L18.37 3.3a1 1 0 0 0-1.41 0L15.1 5.16l3.33 3.33l2.27-1.45Z"/></svg>
                        </IconBtn>
                      )}

                      <IconBtn
                        className="bg-rose-500 hover:bg-rose-600"
                        title="Xóa khỏi danh sách"
                        onClick={() => removeParticipant(p)}
                      >
                        <svg viewBox="0 0 24 24" className="h-4 w-4"><path fill="currentColor" d="M6 7h12v2H6zm2 3h8l-1 10H9L8 10Zm3-7h2l1 2h4v2H6V5h4l1-2Z"/></svg>
                      </IconBtn>
                    </div>
                  </td>
                </tr>
              ))}
              {current.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 sm:px-4 py-2">
                    <EmptyState
                      icon={participants.length === 0 ? "👥" : "🔍"}
                      title={participants.length === 0 ? "Chưa có thành viên" : "Không tìm thấy thành viên"}
                      description={
                        participants.length === 0
                          ? "Thêm giảng viên và sinh viên vào môn thực tập"
                          : "Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm"
                      }
                      action={undefined}
                    />
                  </td>
                </tr>
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

      <ViewParticipantDialog
        open={openView}
        onClose={() => {
          setOpenView(false);
        }}
        participant={viewing}
        onStudentAdded={loadManagedSubject}
      />

      <EditStudentAdvisorDialog
        open={openEditAdvisor}
        onClose={() => setOpenEditAdvisor(false)}
        student={editingSv}
        advisors={participants.filter((r) => r.role === "giang-vien")}
        onSave={saveStudentAdvisor}
      />
    </div>
  );
};

export default InternshipSubjectManagement;
