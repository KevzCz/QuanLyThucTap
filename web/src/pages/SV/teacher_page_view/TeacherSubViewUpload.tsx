import React, { useRef, useState, useEffect } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import type { SubHeader, SubmittedFile } from "./TeacherPageViewTypes";
import { getSubHeader } from "../../../services/pageApi";
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
  const [submittedFiles, setSubmittedFiles] = useState<SubmittedFile[]>([
    { id: "f1", name: "baitap_tuan1.zip", size: 2048000, uploadedAt: "2025-01-20T16:45:00", status: "approved" },
  ]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  // Load sub-header data if not provided via state
  useEffect(() => {
    if (!sub && subId) {
      const loadSubHeader = async () => {
        try {
          setLoading(true);
          const response = await getSubHeader(subId);
          setSub(response.subHeader);
          setHtml(response.subHeader.content || "<p>Nộp bài tập theo yêu cầu của giảng viên. Vui lòng đọc kỹ hướng dẫn trước khi nộp.</p>");
          setError(null);
        } catch (err) {
          console.error('Failed to load sub-header:', err);
          setError('Không thể tải nội dung');
          // Fallback to mock data
          setSub({ 
            id: subId!, 
            title: "Nộp bài", 
            order: 1, 
            kind: "nop-file",
            audience: "sinh-vien",
            content: "<p>Nộp bài tập theo yêu cầu của giảng viên. Vui lòng đọc kỹ hướng dẫn trước khi nộp.</p>"
          });
        } finally {
          setLoading(false);
        }
      };
      loadSubHeader();
    } else if (sub) {
      setHtml(sub.content || "<p>Nộp bài tập theo yêu cầu của giảng viên. Vui lòng đọc kỹ hướng dẫn trước khi nộp.</p>");
    }
  }, [sub, subId]);

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

  const submitFiles = () => {
    if (pendingFiles.length === 0) return;
    
    const newSubmissions: SubmittedFile[] = pendingFiles.map(file => ({
      id: `f_${Date.now()}_${Math.random()}`,
      name: file.name,
      size: file.size,
      uploadedAt: new Date().toISOString(),
      status: "pending" as const,
    }));

    setSubmittedFiles(prev => [...prev, ...newSubmissions]);
    setPendingFiles([]);
    
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const deleteSubmittedFile = (id: string) => {
    setSubmittedFiles(prev => prev.filter(f => f.id !== id));
  };

  const getStatusColor = (status: SubmittedFile['status']) => {
    switch (status) {
      case "approved": return "bg-green-50 text-green-700 ring-green-200";
      case "rejected": return "bg-red-50 text-red-700 ring-red-200";
      case "pending": return "bg-yellow-50 text-yellow-700 ring-yellow-200";
    }
  };

  const getStatusText = (status: SubmittedFile['status']) => {
    switch (status) {
      case "approved": return "Đã duyệt";
      case "rejected": return "Từ chối";
      case "pending": return "Chờ duyệt";
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
              className="rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-6 text-center hover:bg-gray-100 cursor-pointer"
              onClick={() => inputRef.current?.click()}
            >
              <div className="text-3xl mb-2">📤</div>
              <div className="text-gray-700 font-medium">Chọn file để nộp</div>
              <div className="text-xs text-gray-500">Tất cả định dạng file • Tối đa 50MB</div>
              <input
                ref={inputRef}
                type="file"
                multiple
                className="hidden"
                onChange={onFileSelect}
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
                  >
                    Hủy tất cả
                  </button>
                  <button
                    onClick={submitFiles}
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Nộp bài ({pendingFiles.length})
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Submitted files */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-3">Bài đã nộp</h3>
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
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${getStatusColor(file.status)}`}>
                        {getStatusText(file.status)}
                      </span>
                      {file.status === "pending" && (
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
