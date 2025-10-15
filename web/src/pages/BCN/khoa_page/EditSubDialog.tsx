// pages/BCN/khoa_page/EditSubDialog.tsx
import React, { useEffect, useRef, useState } from "react";
import Modal from "../../../util/Modal";
import type { Audience, SubHeader } from "./KhoaPageTypes";
import RichTextEditor from "../../../util/RichTextEditor";

interface Props {
  open: boolean;
  headerId?: string;
  sub?: SubHeader;
  onClose: () => void;
  onSave: (headerId: string, sub: SubHeader) => void;
  onDelete: (headerId: string, subId: string) => void;
}

const EditSubDialog: React.FC<Props> = ({ open, headerId, sub, onClose, onSave, onDelete }) => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [order, setOrder] = useState(1);
  const [audience, setAudience] = useState<Audience>("tat-ca");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!sub) return;
    setTitle(sub.title);
    setContent(sub.content || sub.title);
    setOrder(sub.order);
    setAudience(sub.audience);
    setStartAt(sub.startAt || "");
    setEndAt(sub.endAt || "");
    setFileUrl(sub.fileUrl || "");
    setFileName(sub.fileName || "");
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [sub, open]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setFileName(file.name);
      if (!title || title === fileName) {
        setTitle(file.name);
      }
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

  const save = () => {
    if (!headerId || !sub) return;
    onSave(headerId, {
      ...sub,
      title: (sub.kind === "van-ban" || sub.kind === "thuong") ? title : title,
      content: (sub.kind === "van-ban" || sub.kind === "thuong") ? title : content,
      order,
      audience,
      startAt: sub.kind === "nop-file" ? startAt : undefined,
      endAt: sub.kind === "nop-file" ? endAt : undefined,
      fileUrl: sub.kind === "file" ? fileUrl : undefined,
      fileName: sub.kind === "file" ? fileName : undefined,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Sửa sub-header"
      widthClass="max-w-xl"
      actions={
        <>
          {!!sub && headerId && (
            <button className="mr-auto h-10 px-4 rounded-md text-rose-600 hover:bg-rose-50"
                    onClick={() => onDelete(headerId, sub.id)}>
              Xóa
            </button>
          )}
          <button className="h-10 px-4 rounded-md text-gray-700 border border-gray-300 hover:bg-gray-50"
                  onClick={onClose}>Hủy</button>
          <button className="h-10 px-5 rounded-md bg-emerald-600 text-white hover:bg-emerald-700"
                  onClick={save}>Lưu</button>
        </>
      }
    >
      {!sub ? (
        <div className="text-gray-500">Không tìm thấy.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className={(sub.kind === "van-ban" || sub.kind === "thuong") ? "sm:col-span-2" : ""}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {sub.kind === "van-ban" ? "Nội dung (văn bản)" : 
               sub.kind === "thuong" ? "Nội dung" :
               sub.kind === "file" ? "Tên hiển thị" : "Tên sub-header"}
            </label>

            {(sub.kind === "van-ban" || sub.kind === "thuong") ? (
              <RichTextEditor html={title} onChange={setTitle} />
            ) : (
              <input
                className="w-full h-11 rounded-lg border border-gray-300 px-3"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={sub.kind === "file" ? "Ví dụ: Hướng dẫn thực tập.pdf" : "Tên sub-header"}
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Thứ tự hiện tại</label>
            <div className="relative">
              <input 
                type="number" 
                min={1} 
                className="w-full h-11 rounded-lg border border-gray-300 px-3 bg-gray-50 text-gray-600" 
                value={order} 
                readOnly
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              <svg className="w-3 h-3 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                <path d="M10 4a2 2 0 100-4 2 2 0 000 4z"/>
                <path d="M10 20a2 2 0 100-4 2 2 0 000 4z"/>
              </svg>
              Kéo thả ở danh sách để thay đổi thứ tự
            </p>
          </div>

          {/* Kind read-only */}
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Loại</label>
            <div className="inline-flex rounded-full bg-gray-100 text-gray-700 px-3 py-1 text-xs font-medium">
              {sub.kind === "thuong" ? "Thường" : 
               sub.kind === "thong-bao" ? "Thông báo" : 
               sub.kind === "nop-file" ? "Nộp file" : 
               sub.kind === "file" ? "File tải xuống" : "Văn bản"}
            </div>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Ai có thể thấy</label>
            <select className="w-full h-11 rounded-lg border border-gray-300 px-3"
                    value={audience} onChange={(e) => setAudience(e.target.value as Audience)}>
              <option value="tat-ca">Sinh viên / Giảng viên / Tất cả</option>
              <option value="sinh-vien">Sinh viên</option>
              <option value="giang-vien">Giảng viên</option>
            </select>
          </div>

          {/* File management for "file" type */}
          {sub.kind === "file" && (
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">File</label>
              
              {/* Current file (if exists) */}
              {fileName && !selectedFile && (
                <div className="border border-gray-300 rounded-lg p-3 bg-blue-50 mb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm text-blue-800">📎 {fileName}</div>
                      <div className="text-xs text-blue-600">File hiện tại</div>
                    </div>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                    >
                      Thay đổi
                    </button>
                  </div>
                </div>
              )}

              {/* New file selected */}
              {selectedFile && (
                <div className="border border-gray-300 rounded-lg p-3 bg-green-50 mb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm text-green-800">📎 {selectedFile.name}</div>
                      <div className="text-xs text-green-600">File mới • {(selectedFile.size / 1024).toFixed(1)} KB</div>
                    </div>
                    <button
                      onClick={removeFile}
                      className="h-6 w-6 rounded-md bg-red-100 text-red-600 hover:bg-red-200 text-sm"
                    >
                      ×
                    </button>
                  </div>
                </div>
              )}

              {/* Upload area (only show if no current file or replacing) */}
              {(!fileName || selectedFile) && !selectedFile && (
                <div
                  className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-gray-400"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="text-2xl mb-1">📎</div>
                  <div className="text-sm text-gray-600">Chọn file để tải lên</div>
                  <div className="text-xs text-gray-500">PDF, DOC, DOCX, XLS, XLSX, JPG, PNG...</div>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
          )}

          {sub.kind === "nop-file" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start</label>
                <input type="datetime-local" className="w-full h-11 rounded-lg border border-gray-300 px-3"
                       value={startAt} onChange={(e) => setStartAt(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End</label>
                <input type="datetime-local" className="w-full h-11 rounded-lg border border-gray-300 px-3"
                       value={endAt} onChange={(e) => setEndAt(e.target.value)} />
              </div>
            </>
          )}
        </div>
      )}
    </Modal>
  );
};

export default EditSubDialog;
