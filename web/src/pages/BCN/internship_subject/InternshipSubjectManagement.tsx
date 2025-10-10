import React, { useMemo, useState } from "react";
import {
  type Participant,
  type ParticipantRole,
  type ParticipantStatus,
  roleLabel,
  subjectDisplayName,
} from "./ParticipantsTypes";
import AddChooserDialog from "../internship_subject/AddChooserDialog";
import AddStudentsToSubjectDialog from "../internship_subject/AddStudentsToSubjectDialog";
import AddStudentsToAdvisorDialog from "../internship_subject/AddStudentsToAdvisorDialog";
import ConfirmImportedListDialog from "../internship_subject/ConfirmImportedListDialog";
import ViewParticipantDialog from "../internship_subject/ViewParticipantDialog";
import EditStudentAdvisorDialog from "../internship_subject/EditStudentAdvisorDialog";

/* ---------- UI helpers ---------- */
const StatusChip: React.FC<{ v: ParticipantStatus }> = ({ v }) => {
  const map: Record<ParticipantStatus, { text: string; cls: string }> = {
    "dang-huong-dan": { text: "Đang hướng dẫn", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
    "chua-co-sinh-vien": { text: "Chưa có sinh viên", cls: "bg-gray-50 text-gray-700 ring-gray-200" },
    "dang-thuc-tap": { text: "Đang thực tập", cls: "bg-blue-50 text-blue-700 ring-blue-200" },
    "dang-lam-do-an": { text: "Đang làm đồ án", cls: "bg-indigo-50 text-indigo-700 ring-indigo-200" },
    "chua-co-giang-vien": { text: "Chưa có giảng viên", cls: "bg-amber-50 text-amber-700 ring-amber-200" },
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

/* ---------- MOCK participants of THIS subject ---------- */
const MOCK: Participant[] = [
  { id: "GVXXX", name: "Trần Văn C", role: "giang-vien", status: "dang-huong-dan" },
  { id: "GVXXY", name: "Trần Văn C", role: "giang-vien", status: "chua-co-sinh-vien" },
  { id: "SVXXX", name: "Võ Văn D", role: "sinh-vien", status: "dang-thuc-tap", advisorId: "GVXXX", advisorName: "Trần Văn C" },
  { id: "SVXXY", name: "Võ Văn D", role: "sinh-vien", status: "dang-lam-do-an", advisorId: "GVXXX", advisorName: "Trần Văn C" },
  { id: "SVXXZ", name: "Võ Văn D", role: "sinh-vien", status: "chua-co-giang-vien" },
  // add more for pagination feel
  ...Array.from({ length: 12 }).map((_, i) => ({
    id: `SV${900 + i}`,
    name: `Nguyễn Văn ${String.fromCharCode(65 + (i % 26))}`,
    role: "sinh-vien" as const,
    status: (i % 3 === 0 ? "chua-co-giang-vien" : i % 3 === 1 ? "dang-thuc-tap" : "dang-lam-do-an") as ParticipantStatus,
    advisorId: i % 3 === 0 ? undefined : "GVXXX",
    advisorName: i % 3 === 0 ? undefined : "Trần Văn C",
  })),
];

/* ---------- MAIN ---------- */
const InternshipSubjectManagement: React.FC = () => {
  // fixed current subject displayed as a pill
  const [subjectId] = useState("CNTT - TT2025");

  // filters & paging
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | ParticipantRole>("all");
  const [rows, setRows] = useState<Participant[]>(MOCK);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      const byRole = roleFilter === "all" ? true : r.role === roleFilter;
      const byQuery = !q || r.name.toLowerCase().includes(q) || r.id.toLowerCase().includes(q);
      return byRole && byQuery;
    });
  }, [rows, roleFilter, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = filtered.slice((page - 1) * pageSize, page * pageSize);

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

  // add single student (from small form)
  const addStudent = (sv: Participant) => {
    setRows((prev) => [sv, ...prev]);
    setPage(1);
  };

  // bulk confirm from import (both flows)
  const confirmImport = (rowsToAdd: typeof importRows) => {
    const normalized: Participant[] = rowsToAdd.map((r) => ({
      id: r.id,
      name: r.name,
      role: "sinh-vien",
      status: r.advisorId ? "dang-thuc-tap" : "chua-co-giang-vien",
      advisorId: r.advisorId,
      advisorName: r.advisorName,
    }));
    setRows((prev) => [...normalized, ...prev]);
    setOpenConfirmImported(false);
    setPage(1);
  };

  // update student's advisor
  const saveStudentAdvisor = (svId: string, advisorId?: string, advisorName?: string) => {
    setRows((prev) =>
      prev.map((r) =>
        r.id === svId
          ? {
              ...r,
              advisorId,
              advisorName,
              status: advisorId ? (r.status === "dang-lam-do-an" ? "dang-lam-do-an" : "dang-thuc-tap") : "chua-co-giang-vien",
            }
          : r
      )
    );
    setOpenEditAdvisor(false);
  };

  return (
    <div className="space-y-3">
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
            value={subjectDisplayName(subjectId)}
            className="h-10 rounded-full border border-gray-300 bg-white px-6 text-sm text-gray-700 text-center min-w-[200px] max-w-[300px] w-full"
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
                      onClick={() => setRows((prev) => prev.filter((r) => r.id !== p.id))}
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
      />

      <AddStudentsToAdvisorDialog
        open={openAddSvToAdvisor}
        onClose={() => setOpenAddSvToAdvisor(false)}
        advisors={rows.filter((r) => r.role === "giang-vien")}
        onAddSingle={(sv) => addStudent(sv)}
        onParsed={(rows) => {
          setImportRows(rows);
          setOpenAddSvToAdvisor(false);
          setOpenConfirmImported(true);
        }}
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
        subjectId={subjectId}
      />

      <EditStudentAdvisorDialog
        open={openEditAdvisor}
        onClose={() => setOpenEditAdvisor(false)}
        student={editingSv}
        advisors={rows.filter((r) => r.role === "giang-vien")}
        onSave={saveStudentAdvisor}
      />
    </div>
  );
};

export default InternshipSubjectManagement;
