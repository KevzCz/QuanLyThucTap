import React, { useMemo, useState, useEffect } from "react";
import GVAddStudentsDialog from "../student_management/GVAddStudentsDialog";
import GVConfirmImportedDialog from "../student_management/GVConfirmImportedDialog";
import GVViewStudentDialog from "../student_management/GVViewStudentDialog";
import GVConfirmRemoveDialog from "../student_management/GVConfirmRemoveDialog";
import { apiClient } from "../../../utils/api";

export type GVStudentStatus = "dang-thuc-tap" | "dang-lam-do-an" | "cho-xac-nhan" | "tam-ngung" | "hoan-thanh";

export interface GVStudent {
  id: string;
  name: string;
  email: string;
  status: GVStudentStatus;
  internshipSubject?: {
    id: string;
    title: string;
  };
  studentClass?: string;
  year: number;
}

interface OutboxItem {
  id: string;
  kind: "add-single" | "add-bulk" | "remove-single";
  payload: unknown;
}

const StatusChip: React.FC<{ v: GVStudentStatus }> = ({ v }) => {
  const map: Record<GVStudentStatus, { text: string; cls: string }> = {
    "dang-thuc-tap": { text: "Đang thực tập", cls: "bg-blue-50 text-blue-700 ring-blue-200" },
    "dang-lam-do-an": { text: "Đang làm đồ án", cls: "bg-indigo-50 text-indigo-700 ring-indigo-200" },
    "cho-xac-nhan": { text: "Chờ xác nhận", cls: "bg-amber-50 text-amber-700 ring-amber-200" },
    "tam-ngung": { text: "Tạm ngưng", cls: "bg-gray-50 text-gray-700 ring-gray-200" },
    "hoan-thanh": { text: "Hoàn thành", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  };
  const m = map[v];
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
      status: s.status ?? "cho-xac-nhan",
      internshipSubject: s.internshipSubject,
      studentClass: s.studentClass,
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
    const q = query.trim().toLowerCase();
    return students.filter((r) => {
      const byStatus = statusFilter === "all" ? true : r.status === statusFilter;
      const byQuery = !q || r.name.toLowerCase().includes(q) || r.id.toLowerCase().includes(q);
      return byStatus && byQuery;
    });
  }, [students, statusFilter, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = filtered.slice((page - 1) * pageSize, page * pageSize);

  const [viewing, setViewing] = useState<GVStudent | undefined>();
  const [openView, setOpenView] = useState(false);

  const [openAdd, setOpenAdd] = useState(false);
  const [pendingBulk, setPendingBulk] = useState<Array<{ id: string; name: string }>>([]);
  const [openConfirmBulk, setOpenConfirmBulk] = useState(false);

  const [removing, setRemoving] = useState<GVStudent | undefined>();
  const [openRemove, setOpenRemove] = useState(false);

  const [outbox, setOutbox] = useState<OutboxItem[]>([]);
  const [flash, setFlash] = useState<string | null>(null);

  const pushRequest = (kind: OutboxItem["kind"], payload: unknown) => {
    setOutbox((prev) => [{ id: crypto.randomUUID(), kind, payload }, ...prev]);
    setFlash("Đã gửi yêu cầu lên BCN. Bạn có thể tiếp tục làm việc.");
    window.setTimeout(() => setFlash(null), 3500);
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

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <span className="absolute inset-y-0 left-3 flex items-center text-gray-400">
              <svg viewBox="0 0 24 24" className="h-4 w-4"><path fill="currentColor" d="M10 2a8 8 0 1 1-5.3 13.9l-3.4 3.4 1.4 1.4 3.4-3.4A8 8 0 0 1 10 2m0 2a6 6 0 1 0 0 12A6 6 0 0 0 10 4z"/></svg>
            </span>
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1); }}
              placeholder="Tìm kiếm tên sinh viên"
              className="w-[260px] h-10 rounded-lg border border-gray-300 bg-white pl-8 pr-3 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-2">
            {(
              [
                { k: "all", label: "Tất cả" },
                { k: "dang-thuc-tap", label: "Đang thực tập" },
                { k: "dang-lam-do-an", label: "Đang làm đồ án" },
                { k: "cho-xac-nhan", label: "Chờ xác nhận" },
                { k: "hoan-thanh", label: "Hoàn thành" },
              ] as const
            ).map(({ k, label }) => (
              <button
                key={k}
                onClick={() => { setStatusFilter(k as "all" | GVStudentStatus); setPage(1); }}
                className={`h-9 rounded-md px-3 text-sm border transition ${
                  statusFilter === k ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 flex justify-center px-4">
          <input 
            disabled 
            value={currentLecturer ? `${currentLecturer.subjectTitle || 'Chưa có môn thực tập'} (${currentLecturer.name})` : 'Đang tải...'} 
            className="h-10 rounded-full border border-gray-300 bg-white px-6 text-sm text-gray-700 text-center min-w-[220px] max-w-[400px] w-full" 
          />
        </div>

        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-3 h-9 text-white text-sm hover:bg-emerald-700 disabled:opacity-50"
          onClick={() => setOpenAdd(true)}
          disabled={!currentLecturer}
          title="Thêm sinh viên"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4"><path fill="currentColor" d="M19 11h-6V5h-2v6H5v2h6v6h2v-6h6z"/></svg>
          Thêm
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr className="text-left text-xs font-semibold text-gray-600">
              <th className="px-4 py-3 w-[120px]">Mã</th>
              <th className="px-4 py-3">Tên</th>
              <th className="px-4 py-3 w-[100px]">Lớp</th>
              <th className="px-4 py-3 w-[160px]">Trạng thái</th>
              <th className="px-4 py-3 w-[140px]">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {current.map((s, idx) => (
              <tr key={`${s.id}__${(page - 1) * pageSize + idx}`} className="hover:bg-gray-50/50">
                <td className="px-4 py-3 font-mono text-gray-700">{s.id}</td>
                <td className="px-4 py-3 text-gray-800">{s.name}</td>
                <td className="px-4 py-3 text-gray-600">{s.studentClass || '-'}</td>
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
            {current.length === 0 && (
              <tr><td className="px-4 py-10 text-center text-gray-500" colSpan={5}>
                {students.length === 0 ? "Chưa có sinh viên nào." : "Không có sinh viên phù hợp."}
              </td></tr>
            )}
          </tbody>
        </table>

        {pageCount > 1 && (
          <div className="flex items-center justify-center gap-2 border-t border-gray-200 bg-white px-4 py-3">
            <button className="h-8 w-8 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>‹</button>
            <span className="text-sm text-gray-700"><span className="font-semibold">{page}</span> / {pageCount}</span>
            <button className="h-8 w-8 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40" disabled={page === pageCount} onClick={() => setPage((p) => Math.min(pageCount, p + 1))}>›</button>
          </div>
        )}
      </div>

      {/* Dialogs */}
      <GVAddStudentsDialog
        open={openAdd}
        onClose={() => setOpenAdd(false)}
        advisorId={currentLecturer?.id || ""}
        advisorName={currentLecturer?.name || ""}
        onRequestSingle={(sv) => {
          setOpenAdd(false);
          pushRequest("add-single", { advisorId: currentLecturer?.id, advisorName: currentLecturer?.name, student: sv });
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
          pushRequest("add-bulk", { advisorId: currentLecturer?.id, advisorName: currentLecturer?.name, students: rows });
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
          pushRequest("remove-single", { advisorId: currentLecturer?.id, advisorName: currentLecturer?.name, student: sv });
        }}
      />

      {outbox.length > 0 && (
        <div className="text-xs text-gray-500">Yêu cầu đã tạo: {outbox.length}</div>
      )}
    </div>
  );
};

export default StudentManagement;
