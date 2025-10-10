// pages/BCN/khoa_page/KhoaSubUpload.tsx
import React, { useRef, useState } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import type { SubHeader } from "./KhoaPageTypes";
import dayjs from "dayjs";
import RichTextEditor from "../../../util/RichTextEditor";

const KhoaSubUpload: React.FC = () => {
  const { state } = useLocation() as { state?: { subjectId?: string; sub?: SubHeader } };
  const { subId } = useParams();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [sub, setSub] = useState<SubHeader>(() => {
    const base =
      state?.sub ??
      ({ id: subId!, title: "Trang con nộp file", order: 1, kind: "nop-file", audience: "tat-ca" } as SubHeader);
    return { ...base, startAt: base.startAt ?? "", endAt: base.endAt ?? "" };
  });

  const [html, setHtml] = useState<string>("<p>Mô tả cho mục nộp file…</p>");
  const [rows, setRows] = useState<Array<{ id: string; name: string; advisor?: string }>>([]);
  const [editing, setEditing] = useState(false);

  // icon by kind (no external helpers)
  const icon =
    sub.kind === "thong-bao"
      ? "🔔"
      : sub.kind === "nop-file"
      ? "🗂️"
      : "•";

  const onPick = () => inputRef.current?.click();
  const onFile = async (file: File) => {
    const base = file.name.replace(/\..+$/, "");
    const list = Array.from({ length: 5 }).map((_, i) => ({
      id: `SV${(100 + i).toString()}`,
      name: `${base} - Nguyễn Văn ${String.fromCharCode(65 + i)}`,
      advisor: "Lê Văn B",
    }));
    setRows(list);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button className="text-sm text-blue-600 hover:underline" onClick={() => navigate("/bcn-page")}>
          ← Quay lại trang khoa
        </button>
        <span className="inline-flex items-center gap-2 rounded-full border px-3 h-9 text-sm text-gray-700">
          <span className="w-2 h-2 rounded-full bg-blue-500" /> {state?.subjectId ?? "CNTT - TT2025"}
        </span>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-extrabold text-blue-700">
            <span
              className={icon === "•" ? "text-gray-400 mr-2" : "mr-2"}
              aria-hidden
              title={sub.kind === "thong-bao" ? "Thông báo" : sub.kind === "nop-file" ? "Nộp file" : "Mục"}
            >
              {icon}
            </span>
            {sub.title}
          </h1>
          <button
            className={`h-9 px-3 rounded-md text-white ${
              editing ? "bg-emerald-600 hover:bg-emerald-700" : "bg-gray-700 hover:bg-gray-800"
            }`}
            onClick={() => setEditing((v) => !v)}
          >
            {editing ? "Lưu" : "Sửa"}
          </button>
        </div>

        {/* Dates */}
        <div className="mt-2 flex items-center gap-2">
          <input
            type="datetime-local"
            disabled={!editing}
            value={sub.startAt ?? ""}
            onChange={(e) => setSub((s) => ({ ...s, startAt: e.target.value }))}
            className="h-9 rounded-md border border-gray-300 px-2 text-sm disabled:bg-gray-100 disabled:text-gray-500"
            title="Start"
          />
          <input
            type="datetime-local"
            disabled={!editing}
            value={sub.endAt ?? ""}
            onChange={(e) => setSub((s) => ({ ...s, endAt: e.target.value }))}
            className="h-9 rounded-md border border-gray-300 px-2 text-sm disabled:bg-gray-100 disabled:text-gray-500"
            title="End"
          />
        </div>

        <p className="mt-1 text-xs text-gray-500">
          {sub.startAt ? `Start: ${dayjs(sub.startAt).format("dddd, DD MMM YYYY, HH:mm")}` : "Start: X"} ·{" "}
          {sub.endAt ? `End: ${dayjs(sub.endAt).format("dddd, DD MMM YYYY, HH:mm")}` : "End: X"}
        </p>

        {/* Description */}
        <div className="mt-4">
          {editing ? (
            <RichTextEditor html={html} onChange={setHtml} />
          ) : (
            <div className="prose max-w-none text-gray-800 leading-relaxed" dangerouslySetInnerHTML={{ __html: html }} />
          )}
        </div>

        {/* Uploader (click to select) */}
        <div
          className="mt-4 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center hover:bg-gray-100 cursor-pointer"
          onClick={onPick}
        >
          <div className="text-4xl mb-2">🗂️</div>
          <div className="text-gray-700 font-medium">Nộp file tại đây</div>
          <div className="text-xs text-gray-500">CSV/XLSX • kéo thả hoặc bấm để chọn</div>
          <input
            ref={inputRef}
            type="file"
            accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
            className="hidden"
            onChange={(e) => e.target.files && onFile(e.target.files[0])}
          />
        </div>

        {/* Preview table */}
        {rows.length > 0 && (
          <div className="mt-5 rounded-xl border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 text-sm font-semibold">Danh sách từ file</div>
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left text-gray-600">
                  <th className="px-4 py-2 w-[120px]">Mã</th>
                  <th className="px-4 py-2">Tên sinh viên</th>
                  <th className="px-4 py-2 w-[220px]">Tên giảng viên hướng dẫn</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50/60">
                    <td className="px-4 py-2 font-mono">{r.id}</td>
                    <td className="px-4 py-2">{r.name}</td>
                    <td className="px-4 py-2">{r.advisor ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center justify-end gap-2 px-4 py-3 bg-gray-50">
              <button className="h-9 px-4 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50" onClick={() => setRows([])}>
                Hủy
              </button>
              <button className="h-9 px-5 rounded-md bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => alert("Xác nhận thêm!")}>
                Xác nhận thêm
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default KhoaSubUpload;
