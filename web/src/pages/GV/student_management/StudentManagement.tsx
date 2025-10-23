import React, { useMemo, useState, useEffect } from "react";
import GVAddStudentsDialog from "../student_management/GVAddStudentsDialog";
import GVConfirmImportedDialog from "../student_management/GVConfirmImportedDialog";
import GVViewStudentDialog from "../student_management/GVViewStudentDialog";
import GVConfirmRemoveDialog from "../student_management/GVConfirmRemoveDialog";
import GVRequestsDialog from "../student_management/GVRequestsDialog";
import { apiClient } from "../../../utils/api";
import SearchInput from "../../../components/UI/SearchInput";
import Pagination from "../../../components/UI/Pagination";
import { useDebounce } from "../../../hooks/useDebounce";
import EmptyState from "../../../components/UI/EmptyState";

export type GVStudentStatus = "duoc-huong-dan" | "chua-duoc-huong-dan" | "dang-lam-do-an" | "dang-thuc-tap" | "hoan-thanh";

export interface GVStudent {
  id: string;
  name: string;
  email: string;
  status: GVStudentStatus;
  internshipSubject?: {
    id: string;
    title: string;
  };
  year: number;
}

const StatusChip: React.FC<{ v: GVStudentStatus }> = ({ v }) => {
  const map: Record<GVStudentStatus, { text: string; cls: string }> = {
    "duoc-huong-dan": { text: "Được hướng dẫn", cls: "bg-green-50 text-green-700 ring-green-200" },
    "chua-duoc-huong-dan": { text: "Chưa được hướng dẫn", cls: "bg-orange-50 text-orange-700 ring-orange-200" },
    "dang-thuc-tap": { text: "Đang thực tập", cls: "bg-blue-50 text-blue-700 ring-blue-200" },
    "dang-lam-do-an": { text: "Đang làm đồ án", cls: "bg-indigo-50 text-indigo-700 ring-indigo-200" },
    "hoan-thanh": { text: "Hoàn thành", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  };
  
  // Fallback for undefined or invalid status
  const m = map[v] || { text: "Không xác định", cls: "bg-gray-50 text-gray-700 ring-gray-200" };
  
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${m.cls}`}>{m.text}</span>;
};

const IconBtn: React.FC<React.PropsWithChildren<{ title?: string; className?: string; onClick?: () => void }>> = ({ title, className = "", onClick, children }) => (
  <button type="button" title={title} onClick={onClick} className={`inline-flex h-7 w-7 items-center justify-center rounded-md text-white shadow ${className}`}>
    {children}
  </button>
);

const StudentManagement: React.FC = () => {
  // Backend data
  const [students, setStudents] = useState<GVStudent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentLecturer, setCurrentLecturer] = useState<{ id: string; name: string; subjectId?: string; subjectTitle?: string } | null>(null);

  // Filters
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);
  const [statusFilter, setStatusFilter] = useState<"all" | GVStudentStatus>("all");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Load data on mount
  useEffect(() => {
    loadManagedStudents();
  }, []);

  const loadManagedStudents = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await apiClient.getLecturerManagedStudents();

      if (!response.success) {
        setError(response.error || "Không thể tải danh sách sinh viên");
        setStudents([]);
        setCurrentLecturer(null);
        return;
      }

      // Check if lecturer exists
      if (!response.lecturer) {
        setError("Bạn chưa được phân công làm giảng viên hướng dẫn thực tập");
        setStudents([]);
        setCurrentLecturer(null);
        return;
      }

      // normalize to GVStudent[]
      const normalized = (response.students || []).map((s) => ({
        id: s.id,
        name: s.name,
        email: s.email,
        status: (s.status as GVStudentStatus) || "chua-duoc-huong-dan", // Use backend default
        internshipSubject: s.internshipSubject,
        year: s.year ?? new Date().getFullYear(),
      })) as GVStudent[];

      setStudents(normalized);
      setCurrentLecturer(response.lecturer);
    } catch (err) {
      console.error("Error loading managed students:", err);
      const errorMessage = err instanceof Error ? err.message : "Không thể tải danh sách sinh viên";
      setError(errorMessage);
      setStudents([]);
      setCurrentLecturer(null);
    } finally {
      setLoading(false);
    }
  };


  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    return students.filter((r) => {
      const byStatus = statusFilter === "all" ? true : r.status === statusFilter;
      const byQuery = !q || r.name.toLowerCase().includes(q) || r.id.toLowerCase().includes(q);
      return byStatus && byQuery;
    });
  }, [students, statusFilter, debouncedQuery]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = filtered.slice((page - 1) * pageSize, page * pageSize);

  const [viewing, setViewing] = useState<GVStudent | undefined>();
  const [openView, setOpenView] = useState(false);

  const [openAdd, setOpenAdd] = useState(false);
  const [pendingBulk, setPendingBulk] = useState<Array<{ id: string; name: string }>>([]);
  const [openConfirmBulk, setOpenConfirmBulk] = useState(false);

  const [removing, setRemoving] = useState<GVStudent | undefined>();
  const [openRemove, setOpenRemove] = useState(false);

  const [openRequests, setOpenRequests] = useState(false);

  const [flash, setFlash] = useState<string | null>(null);

  const handleSendAddRequest = async (students: Array<{ id: string; name: string }>) => {
    try {
      await apiClient.createRequest({
        students,
        type: 'add-student'
      });
      setFlash("Đã gửi yêu cầu thêm sinh viên lên BCN.");
      window.setTimeout(() => setFlash(null), 3500);
    } catch (err) {
      console.error("Send add request error:", err);
      setError(err instanceof Error ? err.message : "Không thể gửi yêu cầu");
    }
  };

  const handleSendRemoveRequest = async (student: { id: string; name: string }) => {
    try {
      await apiClient.createRequest({
        students: [student],
        type: 'remove-student'
      });
      setFlash("Đã gửi yêu cầu xóa sinh viên lên BCN.");
      window.setTimeout(() => setFlash(null), 3500);
    } catch (err) {
      console.error("Send remove request error:", err);
      setError(err instanceof Error ? err.message : "Không thể gửi yêu cầu");
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-2">
          <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
          <span className="text-gray-500">Đang tải danh sách sinh viên...</span>
        </div>
      </div>
    );
  }

  // Show no lecturer assigned message
  if (!loading && !currentLecturer && !error) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">👨‍🏫</div>
        <div className="text-gray-700 font-medium mb-2">Chưa có phân công hướng dẫn</div>
        <div className="text-gray-500 text-sm mb-4">Bạn chưa được phân công làm giảng viên hướng dẫn thực tập nào.</div>
        <button
          onClick={loadManagedStudents}
          className="text-blue-600 hover:text-blue-700 text-sm underline"
        >
          Tải lại
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Error Alert */}
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-red-700">{error}</p>
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => setError("")}
              className="text-xs text-red-600 hover:text-red-800"
            >
              Đóng
            </button>
            <button
              onClick={loadManagedStudents}
              className="text-xs text-red-600 hover:text-red-800 underline"
            >
              Thử lại
            </button>
          </div>
        </div>
      )}

      {flash && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">{flash}</div>
      )}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-1">
          <SearchInput
            value={query}
            onChange={(value) => { 
              setQuery(value); 
              setPage(1); 
            }}
            placeholder="Tìm kiếm tên sinh viên"
            width="w-[260px]"
          />

          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value as "all" | GVStudentStatus); setPage(1); }}
              className="h-10 rounded-lg border border-gray-300 bg-white px-3 pr-8 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none min-w-[180px]"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="duoc-huong-dan">Được hướng dẫn</option>
              <option value="chua-duoc-huong-dan">Chưa được hướng dẫn</option>
              <option value="dang-thuc-tap">Đang thực tập</option>
              <option value="dang-lam-do-an">Đang làm đồ án</option>
              <option value="hoan-thanh">Hoàn thành</option>
            </select>
            <span className="absolute inset-y-0 right-3 flex items-center text-gray-400 pointer-events-none">
              <svg viewBox="0 0 24 24" className="h-4 w-4"><path fill="currentColor" d="M7 10l5 5 5-5z"/></svg>
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="order-2 sm:order-1">
            <input 
              disabled 
              value={currentLecturer ? `${currentLecturer.subjectTitle || 'Chưa có môn thực tập'} (${currentLecturer.name})` : 'Đang tải...'} 
              className="h-10 rounded-full border border-gray-300 bg-white px-6 text-sm text-gray-700 text-center min-w-[280px] max-w-[400px] w-full" 
            />
          </div>

          <div className="order-1 sm:order-2 flex items-center gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 h-10 text-white text-sm hover:bg-blue-700"
              onClick={() => setOpenRequests(true)}
              title="Xem yêu cầu đã gửi"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4">
                <path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
              </svg>
              Yêu cầu
            </button>

            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 h-10 text-white text-sm hover:bg-emerald-700 disabled:opacity-50 min-w-[100px]"
              onClick={() => setOpenAdd(true)}
              disabled={!currentLecturer}
              title="Thêm sinh viên"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4"><path fill="currentColor" d="M19 11h-6V5h-2v6H5v2h6v6h2v-6h6z"/></svg>
              Thêm
            </button>
          </div>
        </div>

      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr className="text-left text-xs font-semibold text-gray-600">
              <th className="px-4 py-3 w-[120px]">Mã SV</th>
              <th className="px-4 py-3">Tên sinh viên</th>
              <th className="px-4 py-3 w-[160px]">Trạng thái</th>
              <th className="px-4 py-3 w-[140px]">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {current.map((s, idx) => (
              <tr key={`${s.id}__${(page - 1) * pageSize + idx}`} className="hover:bg-gray-50/50">
                <td className="px-4 py-3 font-mono text-gray-700">{s.id}</td>
                <td className="px-4 py-3 text-gray-800">{s.name}</td>
                <td className="px-4 py-3"><StatusChip v={s.status} /></td>
                <td className="px-2 py-2">
                  <div className="flex items-center gap-2">
                    <IconBtn
                      title="Xem"
                      className="bg-sky-500 hover:bg-sky-600"
                      onClick={() => { setViewing(s); setOpenView(true); }}
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4"><path fill="currentColor" d="M12 5c-7 0-10 7-10 7s3 7 10 7 10-7 10-7-3-7-10-7Zm0 12a5 5 0 1 1 0-10a5 5 0 0 1 0 10Z"/></svg>
                    </IconBtn>

                    <IconBtn
                      title="Gửi yêu cầu xóa khỏi danh sách"
                      className="bg-rose-500 hover:bg-rose-600"
                      onClick={() => { setRemoving(s); setOpenRemove(true); }}
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4"><path fill="currentColor" d="M6 7h12v2H6zm2 3h8l-1 10H9L8 10Zm3-7h2l1 2h4v2H6V5h4l1-2Z"/></svg>
                    </IconBtn>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {current.length === 0 && !loading && (
          <div className="py-8">
            <EmptyState
              icon={students.length === 0 ? "👥" : "🔍"}
              title={students.length === 0 ? "Chưa có sinh viên" : "Không tìm thấy sinh viên"}
              description={
                students.length === 0
                  ? "Chưa có sinh viên nào trong danh sách hướng dẫn của bạn."
                  : "Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm."
              }
              action={
                students.length === 0 && currentLecturer
                  ? {
                      label: "Thêm sinh viên",
                      onClick: () => setOpenAdd(true),
                      icon: "➕"
                    }
                  : undefined
              }
              secondaryAction={
                students.length > 0
                  ? {
                      label: "Xóa bộ lọc",
                      onClick: () => {
                        setQuery("");
                        setStatusFilter("all");
                        setPage(1);
                      },
                    }
                  : undefined
              }
            />
          </div>
        )}

        <Pagination
          currentPage={page}
          totalPages={pageCount}
          onPageChange={setPage}
        />
      </div>

      {/* Dialogs */}
      <GVAddStudentsDialog
        open={openAdd}
        onClose={() => setOpenAdd(false)}
        advisorId={currentLecturer?.id || ""}
        advisorName={currentLecturer?.name || ""}
        subjectId={currentLecturer?.subjectId}
        onRequestSingle={(sv) => {
          setOpenAdd(false);
          handleSendAddRequest([sv]);
        }}
        onParsed={(rows) => {
          setPendingBulk(rows.map((r) => ({ id: r.id, name: r.name })));
          setOpenAdd(false);
          setOpenConfirmBulk(true);
        }}
      />

      <GVConfirmImportedDialog
        open={openConfirmBulk}
        onClose={() => setOpenConfirmBulk(false)}
        advisorName={currentLecturer?.name || ""}
        rows={pendingBulk}
        onConfirm={(rows) => {
          setOpenConfirmBulk(false);
          handleSendAddRequest(rows);
        }}
      />

      <GVViewStudentDialog
        open={openView}
        onClose={() => setOpenView(false)}
        student={viewing}
        subjectInfo={currentLecturer?.subjectTitle ? { id: currentLecturer.subjectId || "", title: currentLecturer.subjectTitle } : undefined}
      />

      <GVConfirmRemoveDialog
        open={openRemove}
        onClose={() => setOpenRemove(false)}
        student={removing}
        onConfirm={(sv) => {
          setOpenRemove(false);
          handleSendRemoveRequest(sv);
        }}
      />

      <GVRequestsDialog
        open={openRequests}
        onClose={() => setOpenRequests(false)}
      />
    </div>
  );
};

export default StudentManagement;
