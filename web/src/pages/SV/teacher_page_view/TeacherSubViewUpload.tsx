import React, { useRef, useState, useEffect } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import type { SubHeader, SubmittedFile } from "./TeacherPageViewTypes";
import { 
  getSubHeader, 
  getSubmissions, 
  submitFile, 
  deleteSubmission 
} from "../../../services/pageApi";
import dayjs from "dayjs";

const TeacherSubViewUpload: React.FC = () => {
  const { state } = useLocation() as { state?: { subjectId?: string; sub?: SubHeader } };
  const { subId } = useParams();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [sub, setSub] = useState<SubHeader | null>(state?.sub || null);
  const [html, setHtml] = useState<string>("<p>Nộp bài tập theo yêu cầu của giảng viên. Vui lòng đọc kỹ hướng dẫn trước khi nộp.</p>");
  const [loading, setLoading] = useState(!state?.sub);
  const [error, setError] = useState<string | null>(null);
  const [submittedFiles, setSubmittedFiles] = useState<SubmittedFile[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  // Load sub-header data and submissions
  useEffect(() => {
    if (subId) {
      loadData();
    }
  }, [subId]);

  const loadData = async () => {
    if (!subId) return;

    try {
      setLoading(true);
      const [subResponse, submissionsResponse] = await Promise.all([
        getSubHeader(subId),
        getSubmissions(subId)
      ]);

      setSub(subResponse.subHeader);
      setHtml(subResponse.subHeader.content || "<p>Nộp bài tập theo yêu cầu của giảng viên. Vui lòng đọc kỹ hướng dẫn trước khi nộp.</p>");
      setSubmittedFiles(submissionsResponse.submissions.map(s => ({
        id: s._id,
        name: s.fileName,
        size: s.fileSize,
        uploadedAt: s.createdAt,
        status: s.status === "accepted" ? "approved" : s.status === "rejected" ? "rejected" : "pending",
        submitter: s.submitter // Add submitter info for teacher view
      })));
      setError(null);
    } catch (err) {
      console.error('Failed to load data:', err);
      setError('Không thể tải nội dung');
    } finally {
      setLoading(false);
    }
  };

  const isActive = () => {
    if (!sub) return false;
    const now = dayjs();
    const start = sub.startAt ? dayjs(sub.startAt) : null;
    const end = sub.endAt ? dayjs(sub.endAt) : null;
    
    if (!start || !end) return true;
    return now.isAfter(start) && now.isBefore(end);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setPendingFiles(prev => [...prev, ...files]);
  };

  const removePendingFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const submitFiles = async () => {
    if (pendingFiles.length === 0 || !sub) return;
    
    try {
      setUploading(true);

      for (const file of pendingFiles) {
        // Upload file
        const formData = new FormData();
        formData.append('file', file);

        const uploadResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/uploads`, {
          method: 'POST',
          credentials: 'include',
          body: formData
        });

        if (!uploadResponse.ok) {
          throw new Error('Upload failed');
        }

        const uploadData = await uploadResponse.json();

        // Submit file
        await submitFile(sub.id, {
          fileUrl: uploadData.fileUrl,
          fileName: uploadData.fileName,
          fileSize: uploadData.fileSize
        });
      }

      // Reload submissions
      await loadData();
      setPendingFiles([]);
      
      if (inputRef.current) {
        inputRef.current.value = '';
      }

      alert('Nộp bài thành công!');
    } catch (error) {
      console.error('File upload error:', error);
      alert('Không thể nộp bài. Vui lòng thử lại.');
    } finally {
      setUploading(false);
    }
  };

  const deleteSubmittedFile = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa bài này?')) return;

    try {
      await deleteSubmission(id);
      await loadData();
    } catch (error) {
      console.error('Failed to delete submission:', error);
      alert('Không thể xóa bài');
    }
  };

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
            <div className="h-24 bg-gray-200 rounded" />
            <div className="h-32 bg-gray-200 rounded" />
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
            <span className="w-2 h-2 rounded-full bg-blue-500" /> {state?.subjectId ?? "CNTT - TT2025"}
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

  if (!sub) return null;

  function getStatusColor(status: string) {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-700 ring-green-600/20";
      case "rejected":
        return "bg-red-100 text-red-700 ring-red-600/20";
      case "pending":
      default:
        return "bg-yellow-100 text-yellow-700 ring-yellow-600/20";
    }
  }

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
        <h1 className="text-xl font-extrabold text-blue-700">
          📤 {sub.title}
        </h1>

        {sub.startAt && sub.endAt && (
          <div className="mt-2 text-sm text-gray-600">
            <span className={isActive() ? "text-green-600" : "text-red-600"}>
              {isActive() ? "Đang mở" : "Đã đóng"}: {dayjs(sub.startAt).format("DD/MM/YYYY HH:mm")} - {dayjs(sub.endAt).format("DD/MM/YYYY HH:mm")}
            </span>
          </div>
        )}

        <div className="mt-4 prose max-w-none text-gray-800 leading-relaxed" dangerouslySetInnerHTML={{ __html: html }} />

        {/* Upload area */}
        {isActive() && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-3">Nộp bài mới</h3>
            <div
              className={`rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
                uploading
                  ? "border-gray-200 bg-gray-100 cursor-not-allowed opacity-50"
                  : "border-gray-300 bg-gray-50 hover:bg-gray-100 cursor-pointer"
              }`}
              onClick={uploading ? undefined : () => inputRef.current?.click()}
            >
              <div className="text-3xl mb-2">{uploading ? "⏳" : "📤"}</div>
              <div className="text-gray-700 font-medium">
                {uploading ? "Đang tải lên..." : "Chọn file để nộp"}
              </div>
              <div className="text-xs text-gray-500">
                {uploading ? "Vui lòng đợi..." : "Tất cả định dạng file • Tối đa 50MB"}
              </div>
              <input
                ref={inputRef}
                type="file"
                multiple
                className="hidden"
                onChange={onFileSelect}
                disabled={uploading}
              />
            </div>

            {/* Pending files */}
            {pendingFiles.length > 0 && (
              <div className="mt-4 border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 font-semibold text-sm">File chờ nộp</div>
                <div className="divide-y divide-gray-100">
                  {pendingFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between px-4 py-3">
                      <div>
                        <div className="font-medium">{file.name}</div>
                        <div className="text-sm text-gray-500">{formatFileSize(file.size)}</div>
                      </div>
                      <button
                        onClick={() => removePendingFile(index)}
                        className="h-7 w-7 rounded-md bg-red-100 text-red-600 hover:bg-red-200"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <div className="bg-gray-50 px-4 py-3 flex justify-end gap-2">
                  <button
                    onClick={() => setPendingFiles([])}
                    className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                    disabled={uploading}
                  >
                    Hủy tất cả
                  </button>
                  <button
                    onClick={submitFiles}
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                    disabled={uploading}
                  >
                    {uploading ? "Đang nộp..." : `Nộp bài (${pendingFiles.length})`}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Submitted files */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-3">
            {/* Show different title based on user role */}
            Bài đã nộp
          </h3>
          {submittedFiles.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Chưa có bài nào được nộp</div>
          ) : (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="divide-y divide-gray-100">
                {submittedFiles.map((file) => (
                  <div key={file.id} className="flex items-center justify-between px-4 py-3">
                    <div className="flex-1">
                      <div className="font-medium">{file.name}</div>
                      <div className="text-sm text-gray-500">
                        {formatFileSize(file.size)} • {dayjs(file.uploadedAt).format("DD/MM/YYYY HH:mm")}
                        {/* Show submitter info for teachers if available */}
                        {file.submitter && (
                          <> • bởi {file.submitter.name} ({file.submitter.id})</>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${getStatusColor(file.status)}`}>
                        {file.status === "pending" ? "Chờ duyệt" : file.status === "approved" ? "Đã duyệt" : "Từ chối"}
                      </span>
                      {file.status === "pending" && !file.submitter && (
                        <button
                          onClick={() => deleteSubmittedFile(file.id)}
                          className="h-7 w-7 rounded-md bg-red-100 text-red-600 hover:bg-red-200"
                          title="Xóa bài"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeacherSubViewUpload;
