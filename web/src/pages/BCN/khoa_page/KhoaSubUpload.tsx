// pages/BCN/khoa_page/KhoaSubUpload.tsx
import React, { useRef, useState, useEffect, useMemo } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import type { SubHeader } from "./KhoaPageTypes";
import type { FileSubmission } from "../../../services/pageApi";
import dayjs from "dayjs";
import RichTextEditor from "../../../util/RichTextEditor";
import { useToast } from "../../../components/UI/Toast";
import StandardDialog from "../../../components/UI/StandardDialog";
import { Icons } from "../../../components/UI/Icons";
import {
  getSubHeader,
  updateSubHeader,
  getSubmissions,
  submitFile,
  updateSubmissionStatus,
  deleteSubmission
} from "../../../services/pageApi";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { apiClient } from "../../../utils/api";
import { resolveFileHref /*, buildDownloadHref */ } from "../../../utils/fileLinks";
const KhoaSubUpload: React.FC = () => {
  const { state } = useLocation() as { state?: { subjectId?: string; sub?: SubHeader } };
  const { subId } = useParams();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { showSuccess, showError } = useToast();

  const [sub, setSub] = useState<SubHeader | null>(null);
  const [html, setHtml] = useState<string>("");
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [canEdit, setCanEdit] = useState(false);
  const [submissions, setSubmissions] = useState<FileSubmission[]>([]);
  const [canReview, setCanReview] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<"submit" | "view">("submit");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingSubmissionId, setDeletingSubmissionId] = useState<string | null>(null);
  const [showReviewNoteDialog, setShowReviewNoteDialog] = useState(false);
  const [reviewNoteInput, setReviewNoteInput] = useState('');
  const [editingSubmission, setEditingSubmission] = useState<FileSubmission | null>(null);
// Group submissions by submitter for reviewer view
const groupedSubmissions = useMemo(() => {
  const map = new Map<string, { submitter: { _id?: string; id?: string; name?: string } | undefined; items: FileSubmission[] }>();
  for (const s of submissions) {
    const key = s.submitter?.id || "unknown";
    if (!map.has(key)) {
      map.set(key, { submitter: s.submitter, items: [] });
    }
    map.get(key)!.items.push(s);
  }
  // Sort groups by name
  return Array.from(map.values()).sort((a, b) => {
    const an = a.submitter?.name || "";
    const bn = b.submitter?.name || "";
    return an.localeCompare(bn);
  });
}, [submissions]);

// Track which groups are expanded
const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
const toggleGroup = (key: string) =>
  setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }));

  useEffect(() => {
    loadData();
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
      setHtml(subResponse.subHeader.content || "<p>Mô tả cho mục nộp file…</p>");
      setCanEdit(subResponse.canEdit);
      setSubmissions(submissionsResponse.submissions);
      setCanReview(submissionsResponse.canReview);
    } catch (error) {
      console.error('Failed to load data:', error);
      if (state?.sub) {
        setSub(state.sub);
        setHtml(state.sub.content || "<p>Mô tả cho mục nộp file…</p>");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!sub || !canEdit) return;

    try {
      await updateSubHeader(sub._id || sub.id, {
        content: html,
        startAt: sub.startAt,
        endAt: sub.endAt
      });
      setEditing(false);
      
      // Show success message
      const successMsg = document.createElement('div');
      successMsg.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
      successMsg.textContent = 'Đã lưu thay đổi thành công!';
      document.body.appendChild(successMsg);
      setTimeout(() => successMsg.remove(), 3000);
      
      await loadData();
    } catch (error) {
      console.error('Failed to save:', error);
      showError("Không thể lưu", "Không thể lưu thay đổi");
    }
  };

  const onPick = () => inputRef.current?.click();

  // Handle multiple file selection
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setPendingFiles(prev => [...prev, ...files]);
  };

  // Remove a pending file before upload
  const removePendingFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Submit all pending files
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
        await submitFile(sub._id || sub.id, {
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

      showSuccess("Thành công", "Nộp file thành công!");
    } catch (error) {
      console.error('File upload error:', error);
      showError("Lỗi nộp file", "Không thể nộp file. Vui lòng thử lại.");
    } finally {
      setUploading(false);
    }
  };

  // Remove a submitted file (if status is pending)
  const handleDeleteSubmission = async (submissionId: string) => {
    setDeletingSubmissionId(submissionId);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteSubmission = async () => {
    if (!deletingSubmissionId) return;
    try {
      await deleteSubmission(deletingSubmissionId);
      await loadData();
      showSuccess("Thành công", "Đã xóa bài nộp");
    } catch (error) {
      console.error('Failed to delete submission:', error);
      showError("Lỗi xóa", "Không thể xóa bài nộp");
    } finally {
      setShowDeleteConfirm(false);
      setDeletingSubmissionId(null);
    }
  };

  // Add this function to handle status update and review note
  const handleUpdateStatus = async (
    submissionId: string,
    status: FileSubmission['status'],
    reviewNote?: string
  ) => {
    try {
      await updateSubmissionStatus(submissionId, { status, reviewNote });
      await loadData();
    } catch (error) {
      console.error('Failed to update status:', error);
      showError("Lỗi cập nhật", "Không thể cập nhật trạng thái");
    }
  };

  const saveReviewNote = async () => {
    if (!editingSubmission) return;
    await handleUpdateStatus(editingSubmission._id, editingSubmission.status, reviewNoteInput);
    setShowReviewNoteDialog(false);
    setEditingSubmission(null);
    setReviewNoteInput('');
    showSuccess("Đã lưu nhận xét");
  };

  const icon = "🗂️";

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

  const now = dayjs();
  const start = sub.startAt ? dayjs(sub.startAt) : null;
  const end = sub.endAt ? dayjs(sub.endAt) : null;
  const isActive = (!start || now.isAfter(start)) && (!end || now.isBefore(end));
  const notStarted = start && now.isBefore(start);
  const ended = end && now.isAfter(end);

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

      {/* Tabs */}
      {canReview && (
        <div className="flex gap-2 border-b border-gray-200">
          <button
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === "submit"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
            onClick={() => setActiveTab("submit")}
          >
            Nộp file & Mô tả
          </button>
          <button
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === "view"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
            onClick={() => setActiveTab("view")}
          >
            Xem tất cả bài nộp ({submissions.length})
          </button>
        </div>
      )}

      {activeTab === "submit" && (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-extrabold text-blue-700">
              <span className="mr-2" aria-hidden title="Nộp file">{icon}</span>
              {sub.title}
            </h1>
            {canEdit && (
              <button
                className={`h-9 px-3 rounded-md text-white ${
                  editing ? "bg-emerald-600 hover:bg-emerald-700" : "bg-gray-700 hover:bg-gray-800"
                }`}
                onClick={() => (editing ? handleSave() : setEditing(true))}
                disabled={uploading}
              >
                {editing ? "Lưu" : "Sửa"}
              </button>
            )}
          </div>

          {/* Time status */}
          <div className="mt-2 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <input
                type="datetime-local"
                disabled={!editing}
                value={sub.startAt ?? ""}
                onChange={(e) => setSub((s) => (s ? { ...s, startAt: e.target.value } : s))}
                className="h-9 rounded-md border border-gray-300 px-2 text-sm disabled:bg-gray-100 disabled:text-gray-500"
                title="Start"
              />
              <input
                type="datetime-local"
                disabled={!editing}
                value={sub.endAt ?? ""}
                onChange={(e) => setSub((s) => (s ? { ...s, endAt: e.target.value } : s))}
                className="h-9 rounded-md border border-gray-300 px-2 text-sm disabled:bg-gray-100 disabled:text-gray-500"
                title="End"
              />
            </div>

            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
              isActive ? "bg-green-100 text-green-700" :
              notStarted ? "bg-yellow-100 text-yellow-700" :
              "bg-red-100 text-red-700"
            }`}>
              {isActive ? "Đang mở" : notStarted ? "Chưa mở" : "Đã đóng"}
            </div>
          </div>

          <p className="mt-1 text-xs text-gray-500">
            {start ? `Bắt đầu: ${start.format("dddd, DD MMM YYYY, HH:mm")}` : "Chưa đặt thời gian bắt đầu"} · {" "}
            {end ? `Kết thúc: ${end.format("dddd, DD MMM YYYY, HH:mm")}` : "Chưa đặt thời gian kết thúc"}
          </p>

          {/* Description */}
          <div className="mt-4">
            {editing ? (
              <RichTextEditor html={html} onChange={setHtml} />
            ) : (
              <div className="prose max-w-none text-gray-800 leading-relaxed" dangerouslySetInnerHTML={{ __html: html }} />
            )}
          </div>

          {/* Upload area */}
          {!canReview && (
            <>
              <div
                className={`mt-4 rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
                  isActive && !uploading
                    ? "border-gray-300 bg-gray-50 hover:bg-gray-100 cursor-pointer"
                    : "border-gray-200 bg-gray-100 cursor-not-allowed opacity-50"
                }`}
                onClick={isActive && !uploading ? onPick : undefined}
              >
                <div className="text-4xl mb-2">{uploading ? "⏳" : "🗂️"}</div>
                <div className="text-gray-700 font-medium">
                  {uploading ? "Đang tải lên..." :
                   notStarted ? "Chưa đến thời gian nộp" :
                   ended ? "Đã hết thời gian nộp" :
                   "Chọn file để nộp"}
                </div>
                <div className="text-xs text-gray-500">
                  {uploading ? "Vui lòng đợi..." :
                   isActive ? "PDF, DOC, DOCX, XLS, XLSX... • Tối đa 10MB mỗi file" : "Không thể nộp file lúc này"}
                </div>
                <input
                  ref={inputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={onFileChange}
                  disabled={!isActive || uploading}
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
                          <div className="text-sm text-gray-500">{(file.size / 1024).toFixed(1)} KB</div>
                        </div>
                        <button
                          onClick={() => removePendingFile(index)}
                          className="h-7 w-7 rounded-md bg-red-100 text-red-600 hover:bg-red-200"
                          disabled={uploading}
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
                      {uploading ? "Đang nộp..." : `Nộp file (${pendingFiles.length})`}
                    </button>
                  </div>
                </div>
              )}

              {submissions.length > 0 && (
                <div className="mt-5 rounded-xl border border-gray-200 overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 text-sm font-semibold">File đã nộp</div>
                  <div className="divide-y divide-gray-100">
                    {submissions.map((submission) => (
                      <div key={submission._id} className="px-4 py-3 hover:bg-gray-50">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <a
                                href={resolveFileHref(submission.fileUrl)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-medium text-blue-600 hover:underline"
                                download={submission.fileName} // optional: hint browser to download
                              >
                                {submission.fileName}
                              </a>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                submission.status === "accepted" ? "bg-green-100 text-green-700" :
                                submission.status === "rejected" ? "bg-red-100 text-red-700" :
                                submission.status === "reviewed" ? "bg-blue-100 text-blue-700" :
                                "bg-yellow-100 text-yellow-700"
                              }`}>
                                {submission.status === "accepted" ? "Đã chấp nhận" :
                                 submission.status === "rejected" ? "Đã từ chối" :
                                 submission.status === "reviewed" ? "Đã xem" :
                                 "Đã nộp"}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {(submission.fileSize / 1024).toFixed(1)} KB ·
                              Nộp lúc {dayjs(submission.createdAt).format("DD/MM/YYYY HH:mm")}
                            </div>
                            {submission.reviewNote && (
                              <div className="mt-2 text-sm text-gray-700 bg-blue-50 rounded p-2">
                                <span className="font-medium">Nhận xét:</span> {submission.reviewNote}
                              </div>
                            )}
                          </div>
                          {submission.status === "submitted" && (
                            <button
                              onClick={() => handleDeleteSubmission(submission._id)}
                              className="ml-2 h-8 w-8 grid place-items-center rounded-md text-red-600 hover:bg-red-50"
                              title="Xóa bài nộp"
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
            </>
          )}

          {/* For teachers/reviewers - show submitted files even when canReview is true */}
          {canReview && submissions.length > 0 && (
            <div className="mt-5 rounded-xl border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 text-sm font-semibold">File đã nộp gần đây</div>
              <div className="divide-y divide-gray-100 max-h-60 overflow-y-auto">
                {submissions.slice(0, 5).map((submission) => (
                  <div key={submission._id} className="px-4 py-3 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <a
                            href={resolveFileHref(submission.fileUrl)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block font-medium text-blue-600 hover:underline truncate"
                            title={submission.fileName}
                            download={submission.fileName}
                          >
                            📎 {submission.fileName}
                          </a>
                          <span className="text-xs text-gray-500">
                            bởi {submission.submitter.name}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {(submission.fileSize / 1024).toFixed(1)} KB ·
                          {dayjs(submission.createdAt).format("DD/MM/YYYY HH:mm")}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "view" && canReview && (
  <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
      <h2 className="font-semibold text-gray-900">
        Tất cả bài nộp ({submissions.length})
      </h2>
      <div className="text-sm text-gray-600">
        {groupedSubmissions.length} người nộp
      </div>
    </div>

    {submissions.length === 0 ? (
      <div className="p-8 text-center text-gray-500">
        <div className="text-4xl mb-2">📭</div>
        <p>Chưa có bài nộp nào</p>
      </div>
    ) : (
      <div className="divide-y divide-gray-200">
        {groupedSubmissions.map((group) => {
          const key =
            group.submitter?._id ||
            group.submitter?.id ||
            "unknown";
          const total = group.items.length;
          const accepted = group.items.filter((i) => i.status === "accepted")
            .length;
          const reviewed = group.items.filter((i) => i.status === "reviewed")
            .length;
          const rejected = group.items.filter((i) => i.status === "rejected")
            .length;
          const pending = total - accepted - reviewed - rejected;

          return (
            <div key={key} className="p-4">
              {/* Group header */}
              <button
                onClick={() => toggleGroup(key)}
                className="w-full flex items-center justify-between"
              >
                <div className="flex items-center gap-3 text-left">
                  <div className="h-9 w-9 rounded-full bg-blue-100 text-blue-700 grid place-items-center font-semibold">
                    {(group.submitter?.name || "?")
                      .split(" ")
                      .map((n: string) => n[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">
                      {group.submitter?.name}{" "}
                      <span className="text-gray-500 font-normal">
                        ({group.submitter?.id})
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {total} file •{" "}
                      <span className="text-emerald-600">{accepted} duyệt</span>{" "}
                      · <span className="text-blue-600">{reviewed} đã xem</span>{" "}
                      · <span className="text-amber-600">{pending} chờ</span> ·{" "}
                      <span className="text-rose-600">{rejected} từ chối</span>
                    </div>
                  </div>
                </div>
                <div className="text-gray-400">
                  {expandedGroups[key] ? "▾" : "▸"}
                </div>
              </button>

              {/* Group body */}
              {expandedGroups[key] && (
                <div className="mt-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {group.items.map((submission) => (
                      <div
                        key={submission._id}
                        className="rounded-lg border border-gray-200 p-3 hover:border-gray-300"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <a
                              href={resolveFileHref(submission.fileUrl)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block font-medium text-blue-600 hover:underline truncate"
                              title={submission.fileName}
                            >
                              📎 {submission.fileName}
                            </a>
                            <div className="text-xs text-gray-500 mt-1">
                              {(submission.fileSize / 1024).toFixed(1)} KB ·{" "}
                              {dayjs(submission.createdAt).format(
                                "DD/MM/YYYY HH:mm"
                              )}
                            </div>
                            {submission.reviewNote && (
                              <div className="mt-2 text-xs text-gray-700 bg-blue-50 rounded p-2">
                                <span className="font-medium">
                                  Nhận xét:
                                </span>{" "}
                                {submission.reviewNote}
                              </div>
                            )}
                          </div>

                          {/* Status pill */}
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              submission.status === "accepted"
                                ? "bg-green-100 text-green-700"
                                : submission.status === "rejected"
                                ? "bg-red-100 text-red-700"
                                : submission.status === "reviewed"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-yellow-100 text-yellow-700"
                            }`}
                            title="Trạng thái hiện tại"
                          >
                            {submission.status === "accepted"
                              ? "Đã chấp nhận"
                              : submission.status === "rejected"
                              ? "Đã từ chối"
                              : submission.status === "reviewed"
                              ? "Đã xem"
                              : "Đã nộp"}
                          </span>
                        </div>

                        {/* Reviewer controls */}
                        <div className="mt-3 flex items-center gap-2">
                          <select
                            value={submission.status}
                            onChange={(e) =>
                              handleUpdateStatus(
                                submission._id,
                                e.target.value as FileSubmission["status"]
                              )
                            }
                            className="text-xs border border-gray-300 rounded px-2 py-1"
                            title="Cập nhật trạng thái"
                          >
                            <option value="submitted">Đã nộp</option>
                            <option value="reviewed">Đã xem</option>
                            <option value="accepted">Chấp nhận</option>
                            <option value="rejected">Từ chối</option>
                          </select>

                          <button
                            onClick={() => {
                              setEditingSubmission(submission);
                              setReviewNoteInput(submission.reviewNote || '');
                              setShowReviewNoteDialog(true);
                            }}
                            className="text-blue-600 hover:underline text-xs"
                            title="Thêm/Chỉnh sửa nhận xét"
                          >
                            Nhận xét
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    )}
  </div>
)}

      {/* Delete Confirmation Dialog */}
      <StandardDialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Xác nhận xóa bài nộp"
        size="sm"
        icon={<Icons.delete className="text-red-600" />}
        primaryAction={{
          label: "Xóa",
          onClick: confirmDeleteSubmission,
          variant: 'danger'
        }}
        secondaryAction={{
          label: "Hủy",
          onClick: () => setShowDeleteConfirm(false)
        }}
      >
        <p className="text-gray-600">
          Bạn có chắc chắn muốn xóa bài nộp này? Hành động này không thể hoàn tác.
        </p>
      </StandardDialog>

      {/* Review Note Dialog */}
      <StandardDialog
        open={showReviewNoteDialog}
        onClose={() => {
          setShowReviewNoteDialog(false);
          setEditingSubmission(null);
          setReviewNoteInput('');
        }}
        title="Nhận xét bài nộp"
        size="md"
        icon={<Icons.edit className="text-blue-600" />}
        primaryAction={{
          label: "Lưu nhận xét",
          onClick: saveReviewNote,
          variant: 'primary'
        }}
        secondaryAction={{
          label: "Hủy",
          onClick: () => {
            setShowReviewNoteDialog(false);
            setEditingSubmission(null);
            setReviewNoteInput('');
          }
        }}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nhận xét
            </label>
            <textarea
              value={reviewNoteInput}
              onChange={(e) => setReviewNoteInput(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={5}
              placeholder="Nhập nhận xét cho bài nộp..."
            />
          </div>
        </div>
      </StandardDialog>
    </div>
  );
};

export default KhoaSubUpload;
