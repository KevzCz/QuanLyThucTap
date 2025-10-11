import React, { useMemo, useState } from "react";
import {
  type InternshipSubject,
  type InternshipStatus,
  CreateInternshipSubjectDialog,
  EditInternshipSubjectDialog,
  ViewInternshipSubjectDialog,
  DeleteInternshipSubjectDialog,
  ConfirmStatusInternshipSubjectDialog,
} from "../index";

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

/* --- Mock data (ensure unique IDs like Account does) --- */
const MOCK: InternshipSubject[] = Array.from({ length: 32 }).map((_, i) => ({
  id: `CNTT-TT${2020 + i}`, // unique per row
  title: `Thực tập ${i + 1}`,
  maxStudents: 8 + (i % 4) * 2,
  departmentLead: ["Nguyễn Văn A", "Nguyễn Văn B"][i % 2],
  status: i % 5 === 0 ? "locked" : "open",
}));

/* --- Page --- */
const InternshipSubjectManagement: React.FC = () => {
  // table/filter state
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | InternshipStatus>("all");
  const [rows, setRows] = useState<InternshipSubject[]>(MOCK);
  const [page, setPage] = useState(1);
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

  // derived rows
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      const passStatus = status === "all" ? true : r.status === status;
      const passQuery =
        !q ||
        r.title.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q) ||
        r.departmentLead.toLowerCase().includes(q);
      return passStatus && passQuery;
    });
  }, [rows, query, status]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = filtered.slice((page - 1) * pageSize, page * pageSize);

  // dialog handlers (UI only)
  const onCreate = (it: InternshipSubject) => {
    setRows((prev) => [it, ...prev]);
    setPage(1);
  };
  const onSave = (it: InternshipSubject) => {
    setRows((prev) => prev.map((r) => (r.id === it.id ? it : r)));
  };
  const onDelete = () => {
    if (!selected) return;
    setRows((prev) => prev.filter((r) => r.id !== selected.id));
    setOpenDelete(false);
  };

  const requestToggleStatus = (it: InternshipSubject) => {
    setSelected(it);
    setPendingStatus(it.status === "open" ? "locked" : "open");
    setOpenConfirmStatus(true);
  };
  const confirmToggleStatus = (id: string, next: InternshipStatus) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: next } : r)));
    setOpenConfirmStatus(false);
  };

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
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
              placeholder="Tìm kiếm tên, mã môn, hoặc BCN"
              className="w-[320px] h-10 rounded-lg border border-gray-300 bg-white pl-8 pr-3 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-2">
            {(["all", "open", "locked"] as const).map((k) => (
              <button
                key={k}
                onClick={() => {
                  setStatus(k);
                  setPage(1);
                }}
                className={`h-9 rounded-md px-3 text-sm border transition ${
                  status === k
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                {k === "all" ? "Tất cả" : k === "open" ? "Mở" : "Khóa"}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-md bg-cyan-600 px-3 h-9 text-white text-sm hover:bg-cyan-700"
          onClick={() => setOpenCreate(true)}
          title="Thêm môn thực tập"
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
              <th className="px-4 py-3 w-[160px]">Mã</th>
              <th className="px-4 py-3">Tên</th>
              <th className="px-4 py-3 w-[150px]">Số lượng sinh viên</th>
              <th className="px-4 py-3 w-[220px]">Ban chủ nhiệm</th>
              <th className="px-4 py-3 w-[120px]">Trạng thái</th>
              <th className="px-4 py-3 w-[160px]">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {current.map((it, idx) => (
              <tr
                key={`${it.id}__${(page - 1) * pageSize + idx}`} // unique & stable across pages
                className="hover:bg-gray-50/50"
              >
                <td className="px-4 py-3 font-mono text-gray-700">{it.id}</td>
                <td className="px-4 py-3 text-gray-800">{it.title}</td>
                <td className="px-4 py-3">{it.maxStudents}</td>
                <td className="px-4 py-3 text-gray-700">{it.departmentLead}</td>
                <td className="px-4 py-3">{statusChip(it.status)}</td>
                <td className="px-2 py-2">
                  <div className="flex items-center gap-2">
                    <IconBtn
                      className="bg-sky-500 hover:bg-sky-600"
                      title="Xem"
                      onClick={() => {
                        setSelected(it);
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
                      className="bg-emerald-500 hover:bg-emerald-600"
                      title="Sửa"
                      onClick={() => {
                        setSelected(it);
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
                      className={`${it.status === "open" ? "bg-amber-500 hover:bg-amber-600" : "bg-indigo-500 hover:bg-indigo-600"}`}
                      title={it.status === "open" ? "Khóa" : "Mở"}
                      onClick={() => requestToggleStatus(it)}
                    >
                      {it.status === "open" ? (
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
                      className="bg-rose-500 hover:bg-rose-600"
                      title="Xóa"
                      onClick={() => {
                        setSelected(it);
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
            ))}

            {current.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                  Không có môn phù hợp.
                </td>
              </tr>
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
            Trang <span className="font-semibold">{page}</span> / {pageCount}
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
