import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { HeaderBlock, SubHeader } from "./KhoaPageTypes";
import CreateHeaderDialog from "./CreateHeaderDialog";
import EditHeaderDialog from "./EditHeaderDialog";
import CreateSubDialog from "./CreateSubDialog";
import EditSubDialog from "./EditSubDialog";
import ConfirmDeleteDialog from "./ConfirmDeleteDialog";
import dayjs from "dayjs";
const htmlToTextWithBreaks = (html: string) => {
  let s = html || "";
  s = s.replace(/<(br|BR)\s*\/?>/g, "\n")
       .replace(/<\/(p|div|li|h\d)>/g, "\n")
       .replace(/<li[^>]*>/g, "• ")
       .replace(/&nbsp;/g, " ");
  s = s.replace(/<[^>]+>/g, "");      // strip tags
  s = s.replace(/\r\n?/g, "\n");      // normalise newlines
  s = s.replace(/[ \t]+\n/g, "\n");   // trim trailing spaces before \n
  return s.trim();
};
/* ---------- Mock data (UI only) ---------- */
const MOCK: HeaderBlock[] = [
  {
    id: "h1",
    title: "Thông báo",
    order: 1,
    audience: "tat-ca",
    subs: [
      { id: "s1", title: "Thông báo 1", order: 1, kind: "thuong", audience: "tat-ca" },
      { id: "s2", title: "Thông báo 2", order: 2, kind: "thuong", audience: "tat-ca" },
    ],
  },
  {
    id: "h2",
    title: "Quản lý CV",
    order: 2,
    audience: "sinh-vien",
    subs: [{ id: "s3", title: "Nộp CV tại đây", order: 1, kind: "thuong", audience: "sinh-vien" }],
  },
  {
    id: "h3",
    title: "Tài liệu",
    order: 3,
    audience: "tat-ca",
    subs: [
      { id: "s4", title: "Hướng dẫn thực tập", order: 1, kind: "thuong", audience: "tat-ca" },
      { id: "s5", title: "Tài liệu thực tập", order: 2, kind: "nop-file", audience: "tat-ca", startAt: "2025-09-22T00:00", endAt: "2025-09-29T00:00" },
    ],
  },
];

/* ---------- Small UI helpers ---------- */
const Tag: React.FC<React.PropsWithChildren<{ color?: string }>> = ({ children, color = "bg-gray-100 text-gray-700" }) => (
  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${color}`}>{children}</span>
);

const AudienceText = {
  "tat-ca": "Tất cả",
  "sinh-vien": "Sinh viên",
  "giang-vien": "Giảng viên",
} as const;

const ChevronBtn: React.FC<{ open: boolean; onClick: () => void }> = ({ open, onClick }) => (
  <button onClick={onClick} className="h-7 w-7 grid place-items-center rounded-md hover:bg-gray-100">
    <svg viewBox="0 0 24 24" className={`h-4 w-4 transition ${open ? "rotate-90" : ""}`}>
      <path fill="currentColor" d="m10 17 5-5-5-5v10z" />
    </svg>
  </button>
);

/* ---------- Page ---------- */
const KhoaPageManagement: React.FC = () => {
  const navigate = useNavigate();

  // pill: current subject this BCN manages
  const [subjectId] = useState("CNTT - TT2025");

  const [query, setQuery] = useState("");
  const [data, setData] = useState<HeaderBlock[]>(MOCK);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ h1: true, h2: true, h3: true });

  // dialogs
  const [openCreateHeader, setOpenCreateHeader] = useState(false);
  const [editHeader, setEditHeader] = useState<HeaderBlock | null>(null);
  const [createUnder, setCreateUnder] = useState<HeaderBlock | null>(null);
  const [editSub, setEditSub] = useState<{ headerId: string; sub: SubHeader } | null>(null);
  const [confirmDelHeader, setConfirmDelHeader] = useState<HeaderBlock | null>(null);
  const [confirmDelSub, setConfirmDelSub] = useState<{ header: HeaderBlock; sub: SubHeader } | null>(null);

  // filter
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data;
    return data
      .map((h) => ({ ...h, subs: h.subs.filter((s) => s.title.toLowerCase().includes(q)) }))
      .filter((h) => h.title.toLowerCase().includes(q) || h.subs.length > 0);
  }, [data, query]);

  // CRUD: headers
  const addHeader = (h: HeaderBlock) => setData((prev) => [...prev, h].sort((a, b) => a.order - b.order));
  const saveHeader = (h: HeaderBlock) => setData((prev) => prev.map((x) => (x.id === h.id ? h : x)).sort((a, b) => a.order - b.order));
  const removeHeader = (id: string) => setData((prev) => prev.filter((x) => x.id !== id));

  // CRUD: subs
  const addSub = (headerId: string, sub: SubHeader) =>
    setData((prev) => prev.map((h) => (h.id === headerId ? { ...h, subs: [...h.subs, sub].sort((a, b) => a.order - b.order) } : h)));
  const saveSub = (headerId: string, sub: SubHeader) =>
    setData((prev) => prev.map((h) => (h.id === headerId ? { ...h, subs: h.subs.map((s) => (s.id === sub.id ? sub : s)).sort((a, b) => a.order - b.order) } : h)));
  const removeSub = (headerId: string, subId: string) =>
    setData((prev) => prev.map((h) => (h.id === headerId ? { ...h, subs: h.subs.filter((s) => s.id !== subId) } : h)));

  const gotoSub = (h: HeaderBlock, s: SubHeader) => {
    const base = `/bcn-page/sub/${encodeURIComponent(s.id)}`;
    const path = s.kind === "nop-file" ? `${base}/upload` : base;
    navigate(path, { state: { header: h, sub: s, subjectId } });
  };

  return (
    <div className="space-y-4">
      {/* Toolbar (sticky) */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-200">
        <div className="mx-0 sm:mx-1 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-2 py-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <span className="absolute inset-y-0 left-3 flex items-center text-gray-400">
                <svg viewBox="0 0 24 24" className="h-4 w-4"><path fill="currentColor" d="M10 2a8 8 0 1 1-5.3 13.9l-3.4 3.4 1.4 1.4 3.4-3.4A8 8 0 0 1 10 2m0 2a6 6 0 1 0 0 12A6 6 0 0 0 10 4z"/></svg>
              </span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm kiếm header / sub-header"
                className="w-[340px] h-10 rounded-lg border border-gray-300 bg-white pl-8 pr-3 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <span className="inline-flex items-center gap-2 rounded-full border px-3 h-9 text-sm text-gray-700">
              <span className="w-2 h-2 rounded-full bg-blue-500" /> {subjectId}
            </span>
          </div>

          <button
            className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-3 h-9 text-white text-sm hover:bg-emerald-700"
            onClick={() => setOpenCreateHeader(true)}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4"><path fill="currentColor" d="M19 11h-6V5h-2v6H5v2h6v6h2v-6h6z"/></svg>
            Tạo header
          </button>
        </div>
      </div>

      {/* Content (cards) */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {filtered.sort((a, b) => a.order - b.order).map((h) => {
          const open = !!expanded[h.id];
          return (
            <div key={h.id} className="border-b last:border-b-0">
              <div className="flex items-center gap-2 px-4 py-4 bg-gray-50">
                <ChevronBtn open={open} onClick={() => setExpanded((m) => ({ ...m, [h.id]: !open }))} />
                <h3 className="text-lg font-bold flex-1">{h.title}</h3>
                <Tag>{AudienceText[h.audience]}</Tag>
                <button className="ml-2 h-8 w-8 grid place-items-center rounded-md bg-emerald-600 text-white hover:bg-emerald-700" title="Sửa header" onClick={() => setEditHeader(h)}>
                  <svg viewBox="0 0 24 24" className="h-4 w-4"><path fill="currentColor" d="M3 17.2V21h3.8l11-11L14 6.2l-11 11Z"/></svg>
                </button>
                <button className="h-8 w-8 grid place-items-center rounded-md bg-cyan-600 text-white hover:bg-cyan-700" title="Thêm sub-header" onClick={() => setCreateUnder(h)}>
                  <svg viewBox="0 0 24 24" className="h-4 w-4"><path fill="currentColor" d="M19 11h-6V5h-2v6H5v2h6v6h2v-6h6z"/></svg>
                </button>
                <button
                  className="h-8 w-8 grid place-items-center rounded-md bg-rose-600 text-white hover:bg-rose-700"
                  title="Xóa header"
                  onClick={()=>setConfirmDelHeader(h)}
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4"><path fill="currentColor" d="M6 7h12v2H6zm2 3h8l-1 10H9L8 10Zm3-7h2l1 2h4v2H6V5h4l1-2Z"/></svg>
                </button>
              </div>

              {open && (
                <div className="px-6 pb-4">
                {h.subs.sort((a,b)=>a.order-b.order).map((s)=>(
                <div key={s.id} className="flex items-center py-2.5">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* icon by kind */}
                    {s.kind === "thong-bao" ? (
                      <span className="shrink-0 text-blue-600" title="Thông báo">🔔</span>
                    ) : s.kind === "nop-file" ? (
                      <span className="shrink-0 text-gray-700" title="Nộp file">🗂️</span>
                    ) : (
                      <span className="shrink-0 w-4 grid place-items-center text-gray-400" aria-hidden title="Mục"> • </span>
                    )}

                    {/* label */}
                    {s.kind === "van-ban" ? (
                      <span className="text-gray-900 whitespace-pre-line">
                        {htmlToTextWithBreaks(s.title) || "(Văn bản trống)"}
                      </span>
                    ) : (
                      <button
                        className="truncate text-left text-gray-900 hover:underline"
                        onClick={() => gotoSub(h, s)}
                      >
                        {s.title}
                      </button>
                    )}
                  </div>

                  {/* right meta & actions */}
                  <div className="ml-4 flex items-center gap-3">
                    <span className="inline-flex rounded-full bg-gray-100 text-gray-700 px-2.5 py-0.5 text-xs font-medium">
                      {{
                        "thuong": "Thường",
                        "thong-bao": "Thông báo",
                        "nop-file": "Nộp file",
                        "van-ban": "Văn bản",
                      }[s.kind]}
                    </span>

                    {s.kind === "nop-file" && (
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {s.startAt ? `Start: ${dayjs(s.startAt).format("DD/MM/YYYY")}` : "Start: X"} ·{" "}
                        {s.endAt ? `End: ${dayjs(s.endAt).format("DD/MM/YYYY")}` : "End: X"}
                      </span>
                    )}

                    <button
                      className="h-7 w-7 grid place-items-center rounded-md bg-emerald-600 text-white hover:bg-emerald-700"
                      title="Sửa sub-header"
                      onClick={()=>setEditSub({ headerId: h.id, sub: s })}
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4"><path fill="currentColor" d="M3 17.2V21h3.8l11-11L14 6.2l-11 11Z"/></svg>
                    </button>
                    <button
                      className="h-7 w-7 grid place-items-center rounded-md bg-rose-600 text-white hover:bg-rose-700"
                      title="Xóa"
                      onClick={()=>setConfirmDelSub({ header: h, sub: s })}
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4"><path fill="currentColor" d="M6 7h12v2H6zm2 3h8l-1 10H9L8 10Zm3-7h2l1 2h4v2H6V5h4l1-2Z"/></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
            )}
          </div>
        );
        })}
      </div>

      {/* Dialogs */}
      <CreateHeaderDialog open={openCreateHeader} onClose={() => setOpenCreateHeader(false)} onCreate={(h) => { addHeader(h); setOpenCreateHeader(false); }} />
      <EditHeaderDialog open={!!editHeader} header={editHeader ?? undefined} onClose={() => setEditHeader(null)} onSave={(h) => { saveHeader(h); setEditHeader(null); }} onDelete={(id) => { removeHeader(id); setEditHeader(null); }} />
      <CreateSubDialog open={!!createUnder} header={createUnder ?? undefined} onClose={() => setCreateUnder(null)} onCreate={(hid, s) => { addSub(hid, s); setCreateUnder(null); }} />
      <EditSubDialog open={!!editSub} headerId={editSub?.headerId} sub={editSub?.sub} onClose={() => setEditSub(null)} onSave={(hid, s) => { saveSub(hid, s); setEditSub(null); }} onDelete={(hid, sid) => { removeSub(hid, sid); setEditSub(null); }} />
      <ConfirmDeleteDialog
        open={!!confirmDelHeader}
        title="Xóa header"
        message={`Xóa header "${confirmDelHeader?.title}" và tất cả sub-header bên trong?`}
        onCancel={()=>setConfirmDelHeader(null)}
        onConfirm={()=>{
          if (confirmDelHeader) removeHeader(confirmDelHeader.id);
          setConfirmDelHeader(null);
        }}
      />

      <ConfirmDeleteDialog
        open={!!confirmDelSub}
        title="Xóa sub-header"
        message={`Xóa sub-header "${confirmDelSub?.sub.title}"?`}
        onCancel={()=>setConfirmDelSub(null)}
        onConfirm={()=>{
          if (confirmDelSub) removeSub(confirmDelSub.header.id, confirmDelSub.sub.id);
          setConfirmDelSub(null);
        }}
      />
      </div>
  );
};

export default KhoaPageManagement;
