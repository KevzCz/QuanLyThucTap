import React, { useState } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import type { SubHeader } from "./TeacherPageViewTypes";

const TeacherSubViewRegular: React.FC = () => {
  const { state } = useLocation() as { state?: { subjectId?: string; sub?: SubHeader } };
  const { subId } = useParams();
  const navigate = useNavigate();

  const sub = state?.sub ?? ({ id: subId!, title: "Trang con", order: 1, kind: "thuong" } as SubHeader);
  const [html] = useState<string>(
    `<h3>Hướng dẫn từ giảng viên</h3>
    <p>Đây là trang hướng dẫn chi tiết từ giảng viên hướng dẫn:</p>
    <ul>
      <li>Tham gia đầy đủ các buổi thực tập</li>
      <li>Ghi chép nhật ký thực tập hàng ngày</li>
      <li>Nộp báo cáo đúng hạn</li>
      <li>Liên hệ khi có vấn đề</li>
    </ul>
    <p>Email liên hệ: giaovien@huflit.edu.vn</p>`
  );

  const icon = sub.kind === "thong-bao" ? "🔔" : sub.kind === "nop-file" ? "📤" : "•";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button className="text-sm text-blue-600 hover:underline" onClick={() => navigate("/docs-teacher")}>
          ← Quay lại trang giảng viên
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

export default TeacherSubViewRegular;
