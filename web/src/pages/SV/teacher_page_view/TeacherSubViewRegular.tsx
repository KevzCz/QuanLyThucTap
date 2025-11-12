import React, { useState, useEffect } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import type { SubHeader } from "./TeacherPageViewTypes";
import { getSubHeader } from "../../../services/pageApi";

const TeacherSubViewRegular: React.FC = () => {
  const { state } = useLocation() as { state?: { khoa?: string; sub?: SubHeader } };
  const { subId } = useParams();
  const navigate = useNavigate();

  const [sub, setSub] = useState<SubHeader | null>(state?.sub || null);
  const [html, setHtml] = useState<string>("");
  const [loading, setLoading] = useState(!state?.sub);
  const [error, setError] = useState<string | null>(null);

  // Load sub-header data if not provided via state
  useEffect(() => {
    if (!sub && subId) {
      const loadSubHeader = async () => {
        try {
          setLoading(true);
          const response = await getSubHeader(subId);
          setSub(response.subHeader);
          setHtml(response.subHeader.content || "");
          setError(null);
        } catch (err) {
          console.error('Failed to load sub-header:', err);
          setError('Không thể tải nội dung');
          // Fallback to mock data
          setSub({ 
            id: subId!, 
            title: "Hướng dẫn từ giảng viên", 
            order: 1, 
            kind: "thuong",
            audience: "sinh-vien",
            content: `<h3>Hướng dẫn từ giảng viên</h3>
            <p>Đây là trang hướng dẫn chi tiết từ giảng viên hướng dẫn:</p>
            <ul>
              <li>Tham gia đầy đủ các buổi thực tập</li>
              <li>Ghi chép nhật ký thực tập hàng ngày</li>
              <li>Nộp báo cáo đúng hạn</li>
              <li>Liên hệ khi có vấn đề</li>
            </ul>
            <p>Email liên hệ: giaovien@huflit.edu.vn</p>`
          });
          setHtml(`<h3>Hướng dẫn từ giảng viên</h3>
            <p>Đây là trang hướng dẫn chi tiết từ giảng viên hướng dẫn:</p>
            <ul>
              <li>Tham gia đầy đủ các buổi thực tập</li>
              <li>Ghi chép nhật ký thực tập hàng ngày</li>
              <li>Nộp báo cáo đúng hạn</li>
              <li>Liên hệ khi có vấn đề</li>
            </ul>
            <p>Email liên hệ: giaovien@huflit.edu.vn</p>`);
        } finally {
          setLoading(false);
        }
      };
      loadSubHeader();
    } else if (sub) {
      setHtml(sub.content || sub.title);
    }
  }, [sub, subId]);

  const icon = sub?.kind === "thong-bao" ? "🔔" : sub?.kind === "nop-file" ? "📤" : "•";

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button className="text-sm text-blue-600 hover:underline" onClick={() => navigate("/docs-teacher")}>
            ← Quay lại trang giảng viên
          </button>
          <div className="w-32 h-9 bg-gray-200 rounded-full animate-pulse" />
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3" />
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded" />
              <div className="h-4 bg-gray-200 rounded w-5/6" />
              <div className="h-4 bg-gray-200 rounded w-4/6" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button className="text-sm text-blue-600 hover:underline" onClick={() => navigate("/docs-teacher")}>
            ← Quay lại trang giảng viên
          </button>
          <span className="inline-flex items-center gap-2 rounded-full border px-3 h-9 text-sm text-gray-700">
            <span className="w-2 h-2 rounded-full bg-blue-500" /> {state?.khoa ? `Khoa ${state.khoa}` : "Giảng viên"}
          </span>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-8 text-center">
          <div className="text-red-600 mb-2">⚠️</div>
          <p className="text-gray-600">{error}</p>
          <button 
            onClick={() => navigate("/docs-teacher")} 
            className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button className="text-sm text-blue-600 hover:underline" onClick={() => navigate("/docs-teacher")}>
          ← Quay lại trang giảng viên
        </button>
        <span className="inline-flex items-center gap-2 rounded-full border px-3 h-9 text-sm text-gray-700">
          <span className="w-2 h-2 rounded-full bg-blue-500" /> {state?.khoa ? `Khoa ${state.khoa}` : "Giảng viên"}
        </span>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
        <h1 className="text-xl font-extrabold text-blue-700 mb-4">
          <span className={icon === "•" ? "text-gray-400 mr-2" : "mr-2"} aria-hidden>
            {icon}
          </span>
          {sub?.title}
        </h1>
        
        <div className="prose max-w-none text-gray-800 leading-relaxed" dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </div>
  );
};

export default TeacherSubViewRegular;
