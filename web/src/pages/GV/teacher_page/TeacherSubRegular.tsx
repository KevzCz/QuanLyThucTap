import React, { useState, useEffect, useRef } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import type { SubHeader, Attachment } from "./TeacherPageTypes";
import RichTextEditor from "../../../util/RichTextEditor";
import { apiClient } from "../../../utils/api";
import { useToast } from "../../../components/UI/Toast";
import { Upload, X, File, Download } from "lucide-react";

const TeacherSubRegular: React.FC = () => {
  const { state } = useLocation() as { state?: { khoa?: string; sub?: SubHeader } };
  const { subId } = useParams();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  const [sub, setSub] = useState<SubHeader | null>(null);
  const [editing, setEditing] = useState(false);
  const [html, setHtml] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [canEdit, setCanEdit] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadSubHeader();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subId]);

  const loadSubHeader = async () => {
    if (!subId) return;
    
    try {
      setLoading(true);
      const response = await apiClient.getTeacherSubHeader(subId);
      setSub(response.subHeader as SubHeader);
      
      // For van-ban and thuong types, content is in content field. For others, use content field
      const displayContent = (response.subHeader.kind === "van-ban" || response.subHeader.kind === "thuong")
        ? (response.subHeader.content || response.subHeader.title || "")
        : (response.subHeader.content || response.subHeader.title || "");
      
      setHtml(displayContent);
      setCanEdit(response.canEdit);
      setAttachments((response.subHeader as SubHeader).attachments || []);
    } catch (error) {
      console.error('Failed to load sub-header:', error);
      // Fallback to state if available
      if (state?.sub) {
        setSub(state.sub);
        const displayContent = (state.sub.kind === "van-ban" || state.sub.kind === "thuong")
          ? (state.sub.content || state.sub.title || "")
          : (state.sub.content || state.sub.title || "");
        setHtml(displayContent);
        setCanEdit(true); // Assume can edit if using fallback
        setAttachments(state.sub.attachments || []);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    try {
      setUploading(true);
      const newAttachments: Attachment[] = [];

      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);

        const uploadResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/uploads`, {
          method: 'POST',
          credentials: 'include',
          body: formData
        });

        if (!uploadResponse.ok) throw new Error('Upload failed');

        const uploadData = await uploadResponse.json();
        newAttachments.push({
          fileUrl: uploadData.fileUrl,
          fileName: uploadData.fileName,
          fileSize: uploadData.fileSize,
          uploadedAt: new Date().toISOString()
        });
      }

      setAttachments(prev => [...prev, ...newAttachments]);
    } catch (error) {
      console.error('File upload error:', error);
      showError('Không thể tải file lên');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleSave = async () => {
    if (!sub || !canEdit) return;
    
    try {
      const updateData = {
        title: (sub.kind === "van-ban" || sub.kind === "thuong") ? html : sub.title,
        content: html,
        order: sub.order,
        audience: sub.audience,
        startAt: sub.startAt,
        endAt: sub.endAt,
        fileUrl: sub.fileUrl,
        fileName: sub.fileName,
        attachments
      };
      
      await apiClient.updateTeacherSubHeader(sub._id || sub.id, updateData);
      setEditing(false);
      
      showSuccess('Đã lưu thay đổi thành công!');
      
      // Reload to get updated data
      await loadSubHeader();
    } catch (error) {
      console.error('Failed to save:', error);
      showError('Không thể lưu thay đổi: ' + (error instanceof Error ? error.message : 'Lỗi không xác định'));
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
          <button className="text-sm text-blue-600 hover:underline" onClick={() => navigate("/teacher-page")}>
            ← Quay lại trang giảng viên
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
          <button className="text-sm text-blue-600 hover:underline" onClick={() => navigate("/teacher-page")}>
            ← Quay lại trang giảng viên
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
        <button className="text-sm text-blue-600 hover:underline" onClick={() => navigate("/teacher-page")}>
          ← Quay lại trang giảng viên
        </button>
        <span className="inline-flex items-center gap-2 rounded-full border px-3 h-9 text-sm text-gray-700">
          <span className="w-2 h-2 rounded-full bg-blue-500" /> {state?.khoa ? `Khoa ${state.khoa}` : "Trang giảng viên"}
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

        {/* Attachments Section */}
        <div className="mt-6 border-t pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">📎 File đính kèm</h3>
            {editing && canEdit && (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                <Upload className="w-4 h-4" />
                {uploading ? 'Đang tải...' : 'Thêm file'}
              </button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />

          {attachments.length === 0 ? (
            <p className="text-sm text-gray-500 italic">Chưa có file đính kèm</p>
          ) : (
            <div className="space-y-2">
              {attachments.map((attachment, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <File className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{attachment.fileName}</p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(attachment.fileSize)} • {new Date(attachment.uploadedAt).toLocaleDateString('vi-VN')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <a
                      href={attachment.fileUrl}
                      download={attachment.fileName}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-md"
                      title="Tải xuống"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                    {editing && canEdit && (
                      <button
                        onClick={() => handleRemoveAttachment(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-md"
                        title="Xóa"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeacherSubRegular;
