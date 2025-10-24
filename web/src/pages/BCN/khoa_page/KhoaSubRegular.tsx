// pages/BCN/khoa_page/KhoaSubRegular.tsx
import React, { useState, useEffect } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import type { SubHeader } from "./KhoaPageTypes";
import RichTextEditor from "../../../util/RichTextEditor";
import { getSubHeader, updateSubHeader } from "../../../services/pageApi";
import { useToast } from "../../../components/UI/Toast";

const KhoaSubRegular: React.FC = () => {
  const { state } = useLocation() as { state?: { subjectId?: string; sub?: SubHeader } };
  const { subId } = useParams();
  const navigate = useNavigate();
  const { showError } = useToast();

  const [sub, setSub] = useState<SubHeader | null>(null);
  const [editing, setEditing] = useState(false);
  const [html, setHtml] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [canEdit, setCanEdit] = useState(false);

  useEffect(() => {
    loadSubHeader();
  }, [subId]);

  const loadSubHeader = async () => {
    if (!subId) return;
    
    try {
      setLoading(true);
      const response = await getSubHeader(subId);
      setSub(response.subHeader);
      
      // For van-ban and thuong types, content is in content field. For others, use content field
      const displayContent = (response.subHeader.kind === "van-ban" || response.subHeader.kind === "thuong")
        ? (response.subHeader.content || response.subHeader.title || "")
        : (response.subHeader.content || response.subHeader.title || "");
      
      setHtml(displayContent);
      setCanEdit(response.canEdit);
    } catch (error) {
      console.error('Failed to load sub-header:', error);
      // Fallback to state if available
      if (state?.sub) {
        setSub(state.sub);
        const displayContent = (state.sub.kind === "van-ban" || state.sub.kind === "thuong")
          ? (state.sub.content || state.sub.title || "")
          : (state.sub.content || state.sub.title || "");
        setHtml(displayContent);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!sub || !canEdit) return;
    
    try {
      const updateData: Partial<SubHeader> = {
        content: html
      };
      
      // For van-ban and thuong types, also update title with the HTML content
      if (sub.kind === "van-ban" || sub.kind === "thuong") {
        updateData.title = html;
      }
      
      await updateSubHeader(sub._id || sub.id, updateData);
      setEditing(false);
      
      // Show success message
      const successMsg = document.createElement('div');
      successMsg.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
      successMsg.textContent = 'Đã lưu thay đổi thành công!';
      document.body.appendChild(successMsg);
      setTimeout(() => successMsg.remove(), 3000);
      
      // Reload to get updated data
      await loadSubHeader();
    } catch (error) {
      console.error('Failed to save:', error);
      showError("Không thể lưu", 'Không thể lưu thay đổi: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const icon =
    sub?.kind === "thong-bao"
      ? "🔔"
      : sub?.kind === "nop-file"
      ? "🗂️"
      : "•";

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button className="text-sm text-blue-600 hover:underline" onClick={() => navigate("/bcn-page")}>
            ← Quay lại trang khoa
          </button>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3" />
            <div className="h-32 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!sub) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button className="text-sm text-blue-600 hover:underline" onClick={() => navigate("/bcn-page")}>
            ← Quay lại trang khoa
          </button>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5 text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-gray-900">Không tìm thấy nội dung</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
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
            {(sub.kind === "van-ban" || sub.kind === "thuong") ? "Nội dung" : sub.title}
          </h1>
          {canEdit && (
            <button
              className={`h-9 px-3 rounded-md text-white ${
                editing ? "bg-emerald-600 hover:bg-emerald-700" : "bg-gray-700 hover:bg-gray-800"
              }`}
              onClick={() => editing ? handleSave() : setEditing(true)}
            >
              {editing ? "Lưu" : "Sửa"}
            </button>
          )}
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

export default KhoaSubRegular;
