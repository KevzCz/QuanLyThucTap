// pages/BCN/khoa_page/CreateSubDialog.tsx
import React, { useRef, useState } from "react";
import Modal from "../../../util/Modal";
import type { Audience, HeaderBlock, SubHeader, SubKind } from "./KhoaPageTypes";
import RichTextEditor from "../../../util/RichTextEditor";

interface Props {
  open: boolean;
  header?: HeaderBlock;
  onClose: () => void;
  onCreate: (headerId: string, sub: Omit<SubHeader, 'id' | 'order'>) => void;
}

const CreateSubDialog: React.FC<Props> = ({ open, header, onClose, onCreate }) => {
  const [title, setTitle] = useState("");         
  const [content, setContent] = useState("");
  const [kind, setKind] = useState<SubKind>("thuong");
  const [audience, setAudience] = useState<Audience>("tat-ca");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Set inherited audience if header has specific audience
  React.useEffect(() => {
    if (header && header.audience !== "tat-ca") {
      setAudience(header.audience);
    }
  }, [header]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setFileName(file.name);
      setTitle(file.name); // Auto-fill title with filename
      // In a real app, you'd upload the file and get a URL
      setFileUrl(`/files/${file.name}`);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setFileName("");
    setFileUrl("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const submit = () => {
    if (!header) return;
    
    if (!title.trim()) {
      alert("Vui lòng nhập tên sub-header");
      return;
    }
    
    onCreate(header.id, {
      title: title.trim(),
      content: kind === "van-ban" ? title : (kind === "nop-file" ? "Nộp file" : content),
      kind,
      audience,
      startAt: kind === "nop-file" ? startAt : undefined,
      endAt: kind === "nop-file" ? endAt : undefined,
      fileUrl: kind === "file" ? fileUrl : undefined,
      fileName: kind === "file" ? fileName : undefined,
    });
    
    // Reset form
    setTitle("");
    setContent("");
    setKind("thuong");
    setAudience("tat-ca");
    setStartAt("");
    setEndAt("");
    setFileUrl("");
    setFileName("");
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClose = () => {
    setTitle("");
    setContent("");
    setKind("thuong");
    setAudience("tat-ca");
    setStartAt("");
    setEndAt("");
    setFileUrl("");
    setFileName("");
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={`Tạo sub-header mới trong "${header?.title || ''}"`}
      widthClass="max-w-2xl"
      actions={
        <>
          <button className="h-10 px-4 rounded-md text-gray-600 border border-gray-300 hover:bg-gray-50 transition-colors" onClick={handleClose}>
            Hủy
          </button>
          <button className="h-10 px-5 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 transition-colors" onClick={submit}>
            Tạo sub-header
          </button>
        </>
      }
    >
      {!header ? (
        <div className="text-gray-500">Chưa chọn header.</div>
      ) : (
        <div className="space-y-4">
          {/* Kind Selection - Move to top for better UX */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Loại nội dung</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: "thuong", label: "Thường", icon: "📄", desc: "Nội dung văn bản thông thường" },
                { value: "thong-bao", label: "Thông báo", icon: "🔔", desc: "Thông báo quan trọng" },
                { value: "nop-file", label: "Nộp file", icon: "📤", desc: "Cho phép sinh viên nộp file" },
                { value: "file", label: "File tải xuống", icon: "📎", desc: "File để tải xuống" }
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`p-3 text-left border rounded-lg transition-colors ${
                    kind === option.value
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  onClick={() => setKind(option.value as SubKind)}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span>{option.icon}</span>
                    <span className="font-medium text-sm">{option.label}</span>
                  </div>
                  <p className="text-xs text-gray-600">{option.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Title/Content based on kind */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {kind === "file" ? "Tên hiển thị" : "Tiêu đề"} 
              <span className="text-red-500">*</span>
            </label>
            {kind === "thuong" ? (
              <RichTextEditor html={title} onChange={setTitle} />
            ) : (
              <input
                type="text"
                className="w-full h-11 rounded-lg border border-gray-300 px-3 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={
                  kind === "file" ? "Ví dụ: Hướng dẫn thực tập.pdf" : 
                  kind === "thong-bao" ? "Ví dụ: Thông báo nghỉ học" :
                  kind === "nop-file" ? "Ví dụ: Nộp báo cáo tuần 1" :
                  "Nhập tiêu đề"
                }
                autoFocus={true}
              />
            )}
          </div>

          {/* Audience */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Ai có thể thấy</label>
            <select 
              className="w-full h-11 rounded-lg border border-gray-300 px-3 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
              value={audience} 
              onChange={(e) => setAudience(e.target.value as Audience)}
              disabled={header?.audience !== "tat-ca"} // Disable if header has specific audience
            >
              <option value="tat-ca">Sinh viên / Giảng viên / Tất cả</option>
              <option value="sinh-vien">Chỉ sinh viên</option>
              <option value="giang-vien">Chỉ giảng viên</option>
            </select>
            {header?.audience !== "tat-ca" && (
              <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Sub-header tự động kế thừa đối tượng từ header cha ({header?.audience === "sinh-vien" ? "Chỉ sinh viên" : "Chỉ giảng viên"})
              </p>
            )}
          </div>

          {/* File upload for "file" type */}
          {kind === "file" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">File tải xuống</label>
              {!selectedFile ? (
                <div
                  className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="text-3xl mb-2">📎</div>
                  <div className="text-sm text-gray-600 font-medium">Chọn file để tải lên</div>
                  <div className="text-xs text-gray-500 mt-1">PDF, DOC, DOCX, XLS, XLSX, JPG, PNG...</div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </div>
              ) : (
                <div className="border border-gray-300 rounded-lg p-4 bg-green-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        📎
                      </div>
                      <div>
                        <div className="font-medium text-sm text-green-800">{selectedFile.name}</div>
                        <div className="text-xs text-green-600">{(selectedFile.size / 1024).toFixed(1)} KB</div>
                      </div>
                    </div>
                    <button
                      onClick={removeFile}
                      className="h-8 w-8 rounded-md bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                    >
                      ×
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Time range for nop-file */}
          {kind === "nop-file" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Thời gian nộp file</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Bắt đầu</label>
                  <input 
                    type="datetime-local" 
                    className="w-full h-11 rounded-lg border border-gray-300 px-3 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                    value={startAt} 
                    onChange={(e) => setStartAt(e.target.value)} 
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Kết thúc</label>
                  <input 
                    type="datetime-local" 
                    className="w-full h-11 rounded-lg border border-gray-300 px-3 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                    value={endAt} 
                    onChange={(e) => setEndAt(e.target.value)} 
                  />
                </div>
              </div>
            </div>
          )}
          
          {/* Auto-order info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Thứ tự tự động</p>
                <p>Sub-header mới sẽ được đặt ở cuối danh sách trong header này. Bạn có thể kéo thả để sắp xếp lại sau khi tạo.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default CreateSubDialog;

