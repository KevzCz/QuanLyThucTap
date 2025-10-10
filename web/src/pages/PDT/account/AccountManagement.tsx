import React, { useMemo, useState } from "react";
import {
  type Account,
  type Role,
  type Status,
  roleLabel,
  CreateAccountDialog,
  EditAccountDialog,
  ViewAccountDialog,
  DeleteAccountDialog,
  ConfirmStatusAccountDialog
} from "../index";


/* --- Local helpers (UI only) --- */
const statusChip = (s: Status) =>
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

/* --- Mock data --- */
const MOCK: Account[] = Array.from({ length: 32 }).map((_, i) => {
  const roles: Role[] = ["phong-dao-tao", "ban-chu-nhiem", "giang-vien", "sinh-vien"];
  const role = roles[i % roles.length];
  const status: Status = i % 5 === 0 ? "locked" : "open";
  const prefix =
    role === "phong-dao-tao" ? "PDT" : role === "ban-chu-nhiem" ? "BCN" : role === "giang-vien" ? "GV" : "SV";
  return {
    id: `${prefix}${(1000 + i).toString().slice(-3)}X`,
    name: `Nguyễn Văn ${String.fromCharCode(65 + (i % 26))}`,
    role,
    status,
  };
});

/* --- Page --- */
const AccountManagement: React.FC = () => {
  // table/filter state
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | Status>("all");
  const [rows, setRows] = useState<Account[]>(MOCK);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // dialogs state
  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [openView, setOpenView] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const [selected, setSelected] = useState<Account | undefined>(undefined);

  // lock/unlock confirm
  const [openConfirmStatus, setOpenConfirmStatus] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<Status>("open");

  // derived rows
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      const passStatus = status === "all" ? true : r.status === status;
      const passQuery = !q || r.name.toLowerCase().includes(q) || r.id.toLowerCase().includes(q);
      return passStatus && passQuery;
    });
  }, [rows, query, status]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = filtered.slice((page - 1) * pageSize, page * pageSize);

  // dialog handlers (UI only)
  const onCreate = (acc: Account) => {
    setRows((prev) => [acc, ...prev]);
    setPage(1);
  };
  const onSave = (acc: Account) => {
    setRows((prev) => prev.map((r) => (r.id === acc.id ? acc : r)));
  };
  const onDelete = () => {
    if (!selected) return;
    setRows((prev) => prev.filter((r) => r.id !== selected.id));
    setOpenDelete(false);
  };

  const requestToggleStatus = (acc: Account) => {
    setSelected(acc);
    setPendingStatus(acc.status === "open" ? "locked" : "open");
    setOpenConfirmStatus(true);
  };

  const confirmToggleStatus = (id: string, next: Status) => {
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
              placeholder="Tìm kiếm tên hoặc id tài khoản"
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
          title="Thêm tài khoản"
          onClick={() => setOpenCreate(true)}
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
              <th className="px-4 py-3 w-[180px]">Vai trò</th>
              <th className="px-4 py-3 w-[140px]">Trạng thái</th>
              <th className="px-4 py-3 w-[160px]">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {current.map((acc) => (
              <tr key={acc.id} className="hover:bg-gray-50/50">
                <td className="px-4 py-3 font-mono text-gray-700">{acc.id}</td>
                <td className="px-4 py-3 text-gray-800">{acc.name}</td>
                <td className="px-4 py-3 text-gray-700">{roleLabel[acc.role]}</td>
                <td className="px-4 py-3">{statusChip(acc.status)}</td>
                <td className="px-2 py-2">
                  <div className="flex items-center gap-2">
                    <IconBtn
                      className="bg-sky-500 hover:bg-sky-600"
                      title="Xem"
                      onClick={() => {
                        setSelected(acc);
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
                        setSelected(acc);
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
                      className={`${
                        acc.status === "open" ? "bg-amber-500 hover:bg-amber-600" : "bg-indigo-500 hover:bg-indigo-600"
                      }`}
                      title={acc.status === "open" ? "Khóa" : "Mở"}
                      onClick={() => requestToggleStatus(acc)}
                    >
                      {acc.status === "open" ? (
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
                        setSelected(acc);
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
                <td colSpan={5} className="px-4 py-10 text-center text-gray-500">
                  Không có tài khoản phù hợp.
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
      <CreateAccountDialog open={openCreate} onClose={() => setOpenCreate(false)} onCreate={onCreate} />
      <EditAccountDialog open={openEdit} onClose={() => setOpenEdit(false)} account={selected} onSave={onSave} />
      <ViewAccountDialog open={openView} onClose={() => setOpenView(false)} account={selected} />
      <DeleteAccountDialog
        open={openDelete}
        onClose={() => setOpenDelete(false)}
        account={selected}
        onConfirm={onDelete}
      />
      <ConfirmStatusAccountDialog
        open={openConfirmStatus}
        onClose={() => setOpenConfirmStatus(false)}
        account={selected}
        nextStatus={pendingStatus}
        onConfirm={confirmToggleStatus}
      />
    </div>
  );
};

export default AccountManagement;
