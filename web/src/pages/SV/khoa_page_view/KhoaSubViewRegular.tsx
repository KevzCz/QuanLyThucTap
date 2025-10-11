import React, { useState } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import type { SubHeader } from "./KhoaPageViewTypes";

const KhoaSubViewRegular: React.FC = () => {
  const { state } = useLocation() as { state?: { subjectId?: string; sub?: SubHeader } };
  const { subId } = useParams();
  const navigate = useNavigate();

  const sub = state?.sub ?? ({ id: subId!, title: "Trang con", order: 1, kind: "thuong", audience: "tat-ca" } as SubHeader);
  const [html] = useState<string>(
    `<h3>Thông tin thực tập</h3>
    <p>Đây là trang thông tin về thực tập dành cho sinh viên. Các bạn cần lưu ý những điều sau:</p>
    <ul>
      <li>Thời gian thực tập: 8 tuần</li>
      <li>Địa điểm: Công ty được phân công</li>
      <li>Yêu cầu: Hoàn thành báo cáo hàng tuần</li>
    </ul>
    <p>Mọi thắc mắc xin liên hệ với giảng viên hướng dẫn.</p>`
  );

  const icon = sub.kind === "thong-bao" ? "🔔" : sub.kind === "nop-file" ? "📤" : "•";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button className="text-sm text-blue-600 hover:underline" onClick={() => navigate("/docs-dept")}>
          ← Quay lại trang khoa
        </button>
        <span className="inline-flex items-center gap-2 rounded-full border px-3 h-9 text-sm text-gray-700">
          <span className="w-2 h-2 rounded-full bg-blue-500" /> {state?.subjectId ?? "CNTT - TT2025"}
        </span>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
        <h1 className="text-xl font-extrabold text-blue-700 mb-4">
          <span className={icon === "•" ? "text-gray-400 mr-2" : "mr-2"} aria-hidden>
            {icon}
          </span>
          {sub.title}
        </h1>
        
        <div className="prose max-w-none text-gray-800 leading-relaxed" dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </div>
  );
};

export default KhoaSubViewRegular;
