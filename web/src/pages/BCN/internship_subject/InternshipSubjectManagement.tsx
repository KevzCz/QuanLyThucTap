import React, { useMemo, useState, useEffect } from "react";
import {
  type Participant,
  type ParticipantRole,
  type ParticipantStatus,
  type InternshipSubjectDetail,
  roleLabel,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  subjectDisplayName,
  convertToParticipants,
} from "./ParticipantsTypes";
import AddChooserDialog from "../internship_subject/AddChooserDialog";
import AddStudentsToSubjectDialog from "../internship_subject/AddStudentsToSubjectDialog";
import AddStudentsToAdvisorDialog from "../internship_subject/AddStudentsToAdvisorDialog";
import ConfirmImportedListDialog from "../internship_subject/ConfirmImportedListDialog";
import ViewParticipantDialog from "../internship_subject/ViewParticipantDialog";
import EditStudentAdvisorDialog from "../internship_subject/EditStudentAdvisorDialog";
import { apiClient } from "../../../utils/api";

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
    className={`inline-flex h-7 w-7 items-center justify-center rounded-md text-white shadow ${className}`}
  >
    {children}
  </button>
);

/* ---------- MAIN ---------- */
const InternshipSubjectManagement: React.FC = () => {
  // backend data
  const [subjectData, setSubjectData] = useState<InternshipSubjectDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // filters & paging
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | ParticipantRole>("all");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // dialogs
  const [openAddChooser, setOpenAddChooser] = useState(false);
  const [openAddSvToSubject, setOpenAddSvToSubject] = useState(false);
  const [openAddSvToAdvisor, setOpenAddSvToAdvisor] = useState(false);
  const [openConfirmImported, setOpenConfirmImported] = useState(false);
  const [importRows, setImportRows] = useState<{ id: string; name: string; advisorId?: string; advisorName?: string }[]>([]);
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
      setSubjectData(response.subject);
    } catch (err: unknown) {
      console.error("Error loading managed subject:", err);
      setError("Không thể tải thông tin môn thực tập");
    } finally {
      setLoading(false);
    }
  };

  // Convert backend data to participants
  const participants = useMemo(() => {
    return subjectData ? convertToParticipants(subjectData) : [];
  }, [subjectData]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return participants.filter((r) => {
      const byRole = roleFilter === "all" ? true : r.role === roleFilter;
      const byQuery = !q || r.name.toLowerCase().includes(q) || r.id.toLowerCase().includes(q);
      return byRole && byQuery;
    });
  }, [participants, roleFilter, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = filtered.slice((page - 1) * pageSize, page * pageSize);

  // add single student (from small form)
  const addStudent = async (sv: Participant) => {
    if (!subjectData) return;

    try {
      setError("");
      const response = await apiClient.addStudentToSubject(
        subjectData.id, 
        sv.id, 
        sv.advisorId
      );
      setSubjectData(response.subject);
      setPage(1);
    }  catch (err: unknown) {
      console.error("Error adding student:", err);
      setError(err instanceof Error ? err.message : "Không thể thêm sinh viên");
    }
  };

  // bulk confirm from import (both flows)
  const confirmImport = async (rowsToAdd: typeof importRows) => {
    if (!subjectData) return;

    try {
      setError("");
      
      // Add students one by one (could be optimized with bulk API)
      for (const row of rowsToAdd) {
        await apiClient.addStudentToSubject(
          subjectData.id,
          row.id,
          row.advisorId
        );
      }
      
      // Reload subject data
      await loadManagedSubject();
      setOpenConfirmImported(false);
      setPage(1);
    } catch (err: unknown) {
      console.error("Error importing students:", err);
      setError(err instanceof Error ? err.message : "Không thể nhập danh sách sinh viên");
    }
  };

  // update student's advisor
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const saveStudentAdvisor = async (svId: string, advisorId?: string, advisorName?: string) => {
    if (!subjectData) return;

    try {
      setError("");
      const response = await apiClient.updateStudentSupervisor(
        subjectData.id,
        svId,
        advisorId
      );
      setSubjectData(response.subject);
      setOpenEditAdvisor(false);
    } catch (err: unknown) {
      console.error("Error updating student supervisor:", err);
      setError(err instanceof Error ? err.message : "Không thể cập nhật giảng viên hướng dẫn");
    }
  };

  // remove participant
  const removeParticipant = async (participant: Participant) => {
    if (!subjectData) return;

    try {
      setError("");
      
      if (participant.role === "sinh-vien") {
        await apiClient.removeStudentFromSubject(subjectData.id, participant.id);
      } else {
        await apiClient.removeLecturerFromSubject(subjectData.id, participant.id);
      }
      
      await loadManagedSubject();
    } catch (err: unknown) {
      console.error("Error removing participant:", err);
      setError(err instanceof Error ? err.message : "Không thể xóa thành viên");
    }
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {/* search */}
          <div className="relative">
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
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Tìm kiếm tên sinh viên / giảng viên"
              className="w-[300px] h-10 rounded-lg border border-gray-300 bg-white pl-8 pr-3 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* filters */}
          <div className="flex gap-2">
            {(["all", "sinh-vien", "giang-vien"] as const).map((k) => (
              <button
                key={k}
                onClick={() => {
                  setRoleFilter(k);
                  setPage(1);
                }}
                className={`h-9 rounded-md px-3 text-sm border transition ${
                  roleFilter === k
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                {k === "all" ? "Tất cả" : k === "sinh-vien" ? "Sinh viên" : "Giảng viên"}
              </button>
            ))}
          </div>
        </div>

        {/* subject pill - centered and spanning */}
        <div className="flex-1 flex justify-center px-4">
          <input
            disabled
            value={`${subjectData.title} (${subjectData.id})`}
            className="h-10 rounded-full border border-gray-300 bg-white px-6 text-sm text-gray-700 text-center min-w-[200px] max-w-[400px] w-full"
          />
        </div>

        {/* add button */}
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-3 h-9 text-white text-sm hover:bg-emerald-700"
          onClick={() => setOpenAddChooser(true)}
          title="Thêm"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4">
            <path fill="currentColor" d="M19 11h-6V5h-2v6H5v2h6v6h2v-6h6z" />
          </svg>
          Thêm
        </button>
      </div>


      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr className="text-left text-xs font-semibold text-gray-600">
              <th className="px-4 py-3 w-[120px]">Mã</th>
              <th className="px-4 py-3">Tên</th>
              <th className="px-4 py-3 w-[140px]">Vai trò</th>
              <th className="px-4 py-3 w-[220px]">Trạng thái</th>
              <th className="px-4 py-3 w-[160px]">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {current.map((p, idx) => (
              <tr key={`${p.id}__${(page - 1) * pageSize + idx}`} className="hover:bg-gray-50/50">
                <td className="px-4 py-3 font-mono text-gray-700">{p.id}</td>
                <td className="px-4 py-3 text-gray-800">{p.name}</td>
                <td className="px-4 py-3 text-gray-700">{roleLabel[p.role]}</td>
                <td className="px-4 py-3">
                  <StatusChip v={p.status} />
                </td>
                <td className="px-2 py-2">
                  <div className="flex items-center gap-2">
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
              <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-500">Không có thành viên phù hợp.</td></tr>
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {pageCount > 1 && (
          <div className="flex items-center justify-center gap-2 border-t border-gray-200 bg-white px-4 py-3">
            <button
              className="h-8 w-8 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              title="Trang trước"
            >
              ‹
            </button>
            <span className="text-sm text-gray-700">
              <span className="font-semibold">{page}</span> / {pageCount}
            </span>
            <button
              className="h-8 w-8 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40"
              disabled={page === pageCount}
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              title="Trang sau"
            >
              ›
            </button>
          </div>
        )}
      </div>

      {/* Dialogs */}
      <AddChooserDialog
        open={openAddChooser}
        onClose={() => setOpenAddChooser(false)}
        onChoose={(t) => {
          setOpenAddChooser(false);
          if (t === "sv-into-subject") {
            setOpenAddSvToSubject(true);
          } else {
            setOpenAddSvToAdvisor(true);
          }
        }}
      />

      <AddStudentsToSubjectDialog
        open={openAddSvToSubject}
        onClose={() => setOpenAddSvToSubject(false)}
        onAddSingle={(sv) => addStudent(sv)}
        onParsed={(rows) => {
          setImportRows(rows);
          setOpenAddSvToSubject(false);
          setOpenConfirmImported(true);
        }}
        subjectId={subjectData?.id || ""}
        subjectLecturers={subjectData?.lecturers.map(l => ({ id: l.id, name: l.name, email: l.email })) || []}
      />

      <AddStudentsToAdvisorDialog
        open={openAddSvToAdvisor}
        onClose={() => setOpenAddSvToAdvisor(false)}
        advisors={participants.filter((r) => r.role === "giang-vien")}
        onAddSingle={(sv) => addStudent(sv)}
        onParsed={(rows) => {
          setImportRows(rows);
          setOpenAddSvToAdvisor(false);
          setOpenConfirmImported(true);
        }}
        subjectId={subjectData?.id || ""}
      />

      <ConfirmImportedListDialog
        open={openConfirmImported}
        onClose={() => setOpenConfirmImported(false)}
        rows={importRows}
        onConfirm={confirmImport}
      />

      <ViewParticipantDialog
        open={openView}
        onClose={() => setOpenView(false)}
        participant={viewing}
        subjectId={subjectData?.id || ""}
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
