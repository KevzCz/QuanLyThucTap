import React, { useEffect, useState } from "react";
import Modal from "../../../util/Modal";
import type { SubHeader } from "./TeacherPageTypes";
import RichTextEditor from "../../../util/RichTextEditor";
import LoadingButton from "../../../components/UI/LoadingButton";
import { useToast } from "../../../components/UI/Toast";

interface Props {
  open: boolean;
  headerId?: string;
  sub?: SubHeader;
  onClose: () => void;
  onSave: (headerId: string, sub: SubHeader) => void;
  onDelete: (headerId: string, subId: string) => void;
}

const EditSubDialog: React.FC<Props> = ({ open, headerId, sub, onClose, onSave, onDelete }) => {
  const { showWarning } = useToast();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [order, setOrder] = useState(1);
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!sub) return;
    setTitle(sub.title);
    setContent(sub.content || sub.title);
    setOrder(sub.order);
    setStartAt(sub.startAt || "");
    setEndAt(sub.endAt || "");
  }, [sub, open]);

  const save = async () => {
    if (!headerId || !sub) return;
    if (!title.trim()) {
      showWarning("Vui lòng nhập tiêu đề");
      return;
    }
    
    setIsSubmitting(true);
    try {
      await onSave(headerId, {
        ...sub,
        title: (sub.kind === "van-ban" || sub.kind === "thuong") ? title : title,
        content: (sub.kind === "van-ban" || sub.kind === "thuong") ? title : content,
        order,
        startAt: sub.kind === "nop-file" ? startAt : undefined,
        endAt: sub.kind === "nop-file" ? endAt : undefined,
      });
    } finally {
      setIsSubmitting(false);
    }
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
            <button 
              className="mr-auto h-10 px-4 rounded-md text-rose-600 hover:bg-rose-50 disabled:opacity-50"
              onClick={() => onDelete(headerId, sub.id)}
              disabled={isSubmitting}
            >
              Xóa
            </button>
          )}
          <button 
            className="h-10 px-4 rounded-md text-gray-700 border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Hủy
          </button>
          <LoadingButton 
            onClick={save}
            loading={isSubmitting}
            variant="primary"
          >
            Lưu
          </LoadingButton>
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
              {sub.kind === "thuong" ? "Thường" : sub.kind === "thong-bao" ? "Thông báo" : sub.kind === "nop-file" ? "Nộp file" : sub.kind === "van-ban" ? "Văn bản" : "File"}
            </div>
          </div>

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
