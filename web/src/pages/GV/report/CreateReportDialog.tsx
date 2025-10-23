import React, { useState, useRef } from "react";
import Modal from "../../../util/Modal";
import RichTextEditor from "../../../util/RichTextEditor";
import type { TeacherReport } from "./ReportManagement";
import { useToast } from "../../../components/UI/Toast";
import LoadingButton from "../../../components/UI/LoadingButton";

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateReportData) => void;
  currentLecturer: {
    id: string;
    name: string;
    subjectId?: string;
    subjectTitle?: string;
  } | null;
}

interface CreateReportData {
  title: string;
  content: string;
  reportType: TeacherReport["reportType"];
  attachments?: Array<{
    fileName: string;
    fileUrl: string;
    fileSize: number;
  }>;
}

const CreateReportDialog: React.FC<Props> = ({ open, onClose, onSubmit, currentLecturer }) => {
  const { showWarning, showError } = useToast();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [reportType, setReportType] = useState<TeacherReport["reportType"]>("tuan");
  const [attachments, setAttachments] = useState<Array<{ fileName: string; fileUrl: string; fileSize: number }>>([]);
  const [uploading, setUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    try {
      setUploading(true);
      const uploadedFiles: Array<{ fileName: string; fileUrl: string; fileSize: number }> = [];

      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/uploads`, {
          method: 'POST',
          credentials: 'include',
          body: formData
        });

        if (!response.ok) {
          throw new Error('Upload failed');
        }

        const data = await response.json();
        uploadedFiles.push({
          fileName: data.fileName,
          fileUrl: data.fileUrl,
          fileSize: data.fileSize
        });
      }

      setAttachments(prev => [...prev, ...uploadedFiles]);
    } catch (error) {
      console.error('File upload error:', error);
      showError('Không thể tải file lên. Vui lòng thử lại.');
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      showWarning("Vui lòng nhập tiêu đề báo cáo");
      return;
    }
    if (!content.trim()) {
      showWarning("Vui lòng nhập nội dung báo cáo");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        content,
        reportType,
        attachments: attachments.length > 0 ? attachments : undefined
      });

      // Reset form
      setTitle("");
      setContent("");
      setReportType("tuan");
      setAttachments([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setTitle("");
    setContent("");
    setReportType("tuan");
    setAttachments([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Tạo báo cáo mới"
      widthClass="max-w-4xl"
      actions={
        <>
          <button
            className="h-10 px-4 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all font-medium"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Hủy
          </button>
          <LoadingButton
            onClick={handleSubmit}
            loading={isSubmitting}
            loadingText="Đang tạo..."
            variant="primary"
            className="bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500 disabled:bg-emerald-300 shadow-sm hover:shadow"
          >
            Tạo báo cáo
          </LoadingButton>
        </>
      }
    >
      <div className="space-y-6">
        {/* Subject info */}
        {currentLecturer && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div className="text-sm text-blue-800">
                <span className="font-medium">Môn thực tập:</span> {currentLecturer.subjectTitle} - {currentLecturer.name}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Title */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tiêu đề báo cáo <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="w-full h-11 rounded-lg border border-gray-300 px-3 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ví dụ: Báo cáo tiến độ thực tập tuần 1"
              autoFocus
            />
          </div>

          {/* Report type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Loại báo cáo <span className="text-red-500">*</span>
            </label>
            <select
              className="w-full h-11 rounded-lg border border-gray-300 px-3 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              value={reportType}
              onChange={(e) => setReportType(e.target.value as TeacherReport["reportType"])}
            >
              <option value="tuan">Báo cáo tuần</option>
              <option value="thang">Báo cáo tháng</option>
              <option value="quy">Báo cáo quý</option>
              <option value="nam">Báo cáo năm</option>
              <option value="khac">Báo cáo khác</option>
            </select>
          </div>
        </div>

        {/* Content */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nội dung báo cáo <span className="text-red-500">*</span>
          </label>
          <RichTextEditor html={content} onChange={setContent} />
        </div>

        {/* File attachments */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            File đính kèm
          </label>
          
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              uploading
                ? "border-gray-200 bg-gray-100 cursor-not-allowed"
                : "border-gray-300 hover:border-gray-400"
            }`}
            onClick={uploading ? undefined : () => fileInputRef.current?.click()}
          >
            <div className="text-3xl mb-2">{uploading ? "⏳" : "📎"}</div>
            <div className="text-gray-700 font-medium">
              {uploading ? "Đang tải lên..." : "Chọn file để đính kèm"}
            </div>
            <div className="text-xs text-gray-500">
              {uploading ? "Vui lòng đợi..." : "PDF, DOC, DOCX, XLS, XLSX, JPG, PNG..."}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileSelect}
              disabled={uploading}
            />
          </div>

          {/* Attachment list */}
          {attachments.length > 0 && (
            <div className="mt-4 border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 font-semibold text-sm">File đính kèm</div>
              <div className="divide-y divide-gray-100">
                {attachments.map((file, index) => (
                  <div key={index} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <div className="font-medium">{file.fileName}</div>
                      <div className="text-sm text-gray-500">
                        {(file.fileSize / 1024).toFixed(1)} KB
                      </div>
                    </div>
                    <button
                      onClick={() => removeAttachment(index)}
                      className="h-7 w-7 rounded-md bg-red-100 text-red-600 hover:bg-red-200"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default CreateReportDialog;
