import React, { useMemo, useState } from "react";
import GVAddStudentsDialog from "../student_management/GVAddStudentsDialog";
import GVConfirmImportedDialog from "../student_management/GVConfirmImportedDialog";
import GVViewStudentDialog from "../student_management/GVViewStudentDialog";
import GVConfirmRemoveDialog from "../student_management/GVConfirmRemoveDialog";

export type GVStudentStatus = "dang-thuc-tap" | "dang-lam-do-an" | "cho-xac-nhan" | "tam-ngung";

export interface GVStudent {
  id: string;
  name: string;
  status: GVStudentStatus;
  advisorId: string;
  advisorName: string;
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
  };
  const m = map[v];
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${m.cls}`}>{m.text}</span>;
};

const IconBtn: React.FC<React.PropsWithChildren<{ title?: string; className?: string; onClick?: () => void }>> = ({ title, className = "", onClick, children }) => (
  <button type="button" title={title} onClick={onClick} className={`inline-flex h-7 w-7 items-center justify-center rounded-md text-white shadow ${className}`}>
    {children}
  </button>
);

const MOCK: GVStudent[] = [
  { id: "SV1001", name: "Nguyễn Văn A", status: "dang-thuc-tap", advisorId: "GV001", advisorName: "Lê Văn B" },
  { id: "SV1002", name: "Trần Thị B", status: "dang-lam-do-an", advisorId: "GV001", advisorName: "Lê Văn B" },
  { id: "SV1003", name: "Phạm Văn C", status: "cho-xac-nhan", advisorId: "GV001", advisorName: "Lê Văn B" },
  ...Array.from({ length: 14 }).map((_, i) => ({
    id: `SV${1100 + i}`,
    name: `Sinh viên ${String.fromCharCode(65 + (i % 26))}`,
    status: (i % 4 === 0 ? "dang-lam-do-an" : i % 4 === 1 ? "dang-thuc-tap" : i % 4 === 2 ? "cho-xac-nhan" : "tam-ngung") as GVStudentStatus,
    advisorId: "GV001",
    advisorName: "Lê Văn B",
  })),
];

const StudentManagement: React.FC = () => {
  const [subjectId] = useState("CNTT - TT2025");
  const [advisorId] = useState("GV001");
  const [advisorName] = useState("Lê Văn B");

  const [rows] = useState<GVStudent[]>(MOCK);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | GVStudentStatus>("all");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      const byStatus = statusFilter === "all" ? true : r.status === statusFilter;
      const byQuery = !q || r.name.toLowerCase().includes(q) || r.id.toLowerCase().includes(q);
      return byStatus && byQuery;
    });
  }, [rows, statusFilter, query]);

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

  return (
    <div className="space-y-3">
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
          <input disabled value={subjectId} className="h-10 rounded-full border border-gray-300 bg-white px-6 text-sm text-gray-700 text-center min-w-[220px] max-w-[320px] w-full" />
        </div>

        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-3 h-9 text-white text-sm hover:bg-emerald-700"
          onClick={() => setOpenAdd(true)}
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
              <th className="px-4 py-3 w-[220px]">Trạng thái</th>
              <th className="px-4 py-3 w-[160px]">Thao tác</th>
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
            {current.length === 0 && (
              <tr><td className="px-4 py-10 text-center text-gray-500" colSpan={4}>Không có sinh viên phù hợp.</td></tr>
            )}
          </tbody>
        </table>

        <div className="flex items-center justify-center gap-2 border-t border-gray-200 bg-white px-4 py-3">
          <button className="h-8 w-8 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>‹</button>
          <span className="text-sm text-gray-700"><span className="font-semibold">{page}</span> / {pageCount}</span>
          <button className="h-8 w-8 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40" disabled={page === pageCount} onClick={() => setPage((p) => Math.min(pageCount, p + 1))}>›</button>
        </div>
      </div>

      <GVAddStudentsDialog
        open={openAdd}
        onClose={() => setOpenAdd(false)}
        advisorId={advisorId}
        advisorName={advisorName}
        onRequestSingle={(sv) => {
          setOpenAdd(false);
          pushRequest("add-single", { advisorId, advisorName, student: sv });
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
        advisorName={advisorName}
        rows={pendingBulk}
        onConfirm={(rows) => {
          setOpenConfirmBulk(false);
          pushRequest("add-bulk", { advisorId, advisorName, students: rows });
        }}
      />

      <GVViewStudentDialog
        open={openView}
        onClose={() => setOpenView(false)}
        student={viewing}
        subjectId={subjectId}
      />

      <GVConfirmRemoveDialog
        open={openRemove}
        onClose={() => setOpenRemove(false)}
        student={removing}
        onConfirm={(sv) => {
          setOpenRemove(false);
          pushRequest("remove-single", { advisorId, advisorName, student: sv });
        }}
      />

      {outbox.length > 0 && (
        <div className="text-xs text-gray-500">Yêu cầu đã tạo: {outbox.length}</div>
      )}
    </div>
  );
};

export default StudentManagement;
