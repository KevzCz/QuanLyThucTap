import React, { useMemo, useState } from "react";
import SearchInput from "../../../components/UI/SearchInput";
import FilterButtonGroup from "../../../components/UI/FilterButtonGroup";
import SubjectPill from "../../../components/UI/SubjectPill";
import Pagination from "../../../components/UI/Pagination";
import ViewRequestDialog from "../request/ViewRequestDialog";
import ConfirmApproveDialog from "../request/ConfirmApproveDialog";
import ConfirmDeleteDialog from "../request/ConfirmDeleteDialog";

/** Types */
export type RequestKind = "them-sinh-vien" | "xoa-sinh-vien";
export interface RequestRow {
  id: string;
  code: string;
  name: string;
  kind: RequestKind;
  createdAt: string; // dd/mm/yyyy
  payload?: {
    advisorId?: string;
    advisorName?: string;
    students?: Array<{ id: string; name: string }>;
  };
}

/** Helpers */
const kindText: Record<RequestKind, string> = {
  "them-sinh-vien": "Thêm sinh viên",
  "xoa-sinh-vien": "Xóa sinh viên",
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

/** Mock data to demonstrate UI */
const MOCK: RequestRow[] = [
  {
    id: "r1",
    code: "GVXXX",
    name: "Trần Văn C",
    kind: "them-sinh-vien",
    createdAt: "1/10/2025",
    payload: {
      advisorId: "GVXXX",
      advisorName: "Lê Văn B",
      students: [
        { id: "SVXXX", name: "Nguyễn Văn A" },
        { id: "SVXXY", name: "Nguyễn Văn A" },
        { id: "SVXXZ", name: "Nguyễn Văn A" },
      ],
    },
  },
  ...Array.from({ length: 12 }).map((_, i) => ({
    id: `r${i + 2}`,
    code: `GV${600 + i}`,
    name: "Trần Văn C",
    kind: "them-sinh-vien" as const,
    createdAt: "1/10/2025",
    payload: {
      advisorId: `GV${600 + i}`,
      advisorName: "Lê Văn B",
      students: [{ id: `SV${700 + i}`, name: `Nguyễn Văn ${String.fromCharCode(65 + (i % 26))}` }],
    },
  })),
];

const RequestManagement: React.FC = () => {
  const [subjectId] = useState("CNTT - TT2025");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | RequestKind>("all");
  const [rows, setRows] = useState<RequestRow[]>(MOCK);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      const byKind = filter === "all" ? true : r.kind === filter;
      const byQuery =
        !q ||
        (r.name && r.name.toLowerCase().includes(q)) ||
        (r.code && r.code.toLowerCase().includes(q));
      return byKind && byQuery;
    });
  }, [rows, filter, query]);

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
  const approve = (row: RequestRow) => {
    setRows((prev) => prev.filter((r) => r.id !== row.id));
    setOpenApprove(false);
  };

  const remove = (row: RequestRow) => {
    setRows((prev) => prev.filter((r) => r.id !== row.id));
    setOpenDelete(false);
  };

  const filterOptions = [
    { key: "all" as const, label: "Tất cả" },
    { key: "them-sinh-vien" as const, label: "Thêm" },
    { key: "xoa-sinh-vien" as const, label: "Xóa" },
  ];

  return (
    <div className="space-y-3">
      {/* Header breadcrumb mimic */}
      <div className="text-sm text-gray-600">
        <span className="text-gray-800 font-medium">Ban chủ nhiệm</span> / Quản lý yêu cầu
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <SearchInput
            value={query}
            onChange={(value) => {
              setQuery(value);
              setPage(1);
            }}
            placeholder="Tìm kiếm tên giảng viên / yêu cầu"
            width="w-[260px]"
          />

          <FilterButtonGroup
            options={filterOptions}
            value={filter}
            onChange={(value) => {
              setFilter(value);
              setPage(1);
            }}
          />
        </div>

        <SubjectPill value={subjectId} />

        {/* right side kept empty to match spacing */}
        <div className="w-[96px]" />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr className="text-left text-xs font-semibold text-gray-600">
              <th className="px-4 py-3 w-[120px]">Mã</th>
              <th className="px-4 py-3">Tên</th>
              <th className="px-4 py-3 w-[200px]">Yêu cầu</th>
              <th className="px-4 py-3 w-[140px]">Ngày tạo</th>
              <th className="px-4 py-3 w-[160px]">THAO TÁC</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {current.map((r, idx) => (
              <tr key={`${r.id}__${(page - 1) * pageSize + idx}`} className="hover:bg-gray-50/50">
                <td className="px-4 py-3 font-mono text-gray-700">{r.code}</td>
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
                      className="bg-orange-500 hover:bg-orange-600"
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
                      title="Xóa yêu cầu"
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
            ))}
            {current.length === 0 && (
              <tr>
                <td className="px-4 py-10 text-center text-gray-500" colSpan={5}>
                  Không có yêu cầu phù hợp.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination like picture */}
        <Pagination
          currentPage={page}
          totalPages={pageCount}
          onPageChange={setPage}
        />
      </div>

      {/* Dialogs */}
      <ViewRequestDialog
        open={openView}
        onClose={() => setOpenView(false)}
        row={viewing}
        onAccept={() => {
          if (viewing) approve(viewing);
        }}
        onReject={() => setOpenView(false)}
      />

      <ConfirmApproveDialog
        open={openApprove}
        onClose={() => setOpenApprove(false)}
        onConfirm={() => {
          if (approving) approve(approving);
        }}
      />

      <ConfirmDeleteDialog
        open={openDelete}
        onClose={() => setOpenDelete(false)}
        onConfirm={() => {
          if (deleting) remove(deleting);
        }}
      />
    </div>
  );
};

export default RequestManagement;
