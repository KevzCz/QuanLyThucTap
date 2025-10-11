import React, { useState } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import type { SubHeader } from "./TeacherPageTypes";
import RichTextEditor from "../../../util/RichTextEditor";

const TeacherSubRegular: React.FC = () => {
  const { state } = useLocation() as { state?: { subjectId?: string; sub?: SubHeader } };
  const { subId } = useParams();
  const navigate = useNavigate();

  // Falls back to a simple regular sub if routed directly
  const sub =
    state?.sub ??
    ({ id: subId!, title: "Trang con (thường)", order: 1, kind: "thuong" } as SubHeader);

  const [editing, setEditing] = useState(false);
  const [html, setHtml] = useState<string>(
    `<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc vel risus quis orci
    posuere dictum. Cras semper, nibh non auctor placerat, urna ante dictum arcu, a
    ultrices neque lacus id quam.</p>`
  );

  // icon by kind
  const icon =
    sub.kind === "thong-bao"
      ? "🔔"
      : sub.kind === "nop-file"
      ? "🗂️"
      : "•";

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between">
        <button className="text-sm text-blue-600 hover:underline" onClick={() => navigate("/teacher-page")}>
          ← Quay lại trang giảng viên
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

        <div className="mt-4">
          {editing ? (
            <RichTextEditor html={html} onChange={setHtml} />
          ) : (
            <div className="prose max-w-none text-gray-800 leading-relaxed" dangerouslySetInnerHTML={{ __html: html }} />
          )}
        </div>
      </div>
    </div>
  );
};

export default TeacherSubRegular;
