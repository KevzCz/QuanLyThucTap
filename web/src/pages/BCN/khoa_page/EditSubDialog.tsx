// pages/BCN/khoa_page/EditSubDialog.tsx
import React, { useEffect, useState } from "react";
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
  const [order, setOrder] = useState(1);
  const [audience, setAudience] = useState<Audience>("tat-ca");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");

  useEffect(() => {
    if (!sub) return;
    setTitle(sub.title);
    setOrder(sub.order);
    setAudience(sub.audience);
    setStartAt(sub.startAt || "");
    setEndAt(sub.endAt || "");
  }, [sub, open]);

  const save = () => {
    if (!headerId || !sub) return;
    onSave(headerId, {
      ...sub,
      title,
      order,
      audience,
      startAt: sub.kind === "nop-file" ? startAt : undefined,
      endAt:   sub.kind === "nop-file" ? endAt   : undefined,
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
          <div className={sub.kind === "van-ban" ? "sm:col-span-2" : ""}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {sub.kind === "van-ban" ? "Nội dung (văn bản)" : "Tên sub-header"}
            </label>

            {sub.kind === "van-ban" ? (
              <RichTextEditor html={title} onChange={setTitle} />
            ) : (
              <input
                className="w-full h-11 rounded-lg border border-gray-300 px-3"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vị trí</label>
            <input type="number" min={1} className="w-full h-11 rounded-lg border border-gray-300 px-3"
                   value={order} onChange={(e) => setOrder(parseInt(e.target.value || "1", 10))} />
          </div>

          {/* Kind read-only */}
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Loại</label>
            <div className="inline-flex rounded-full bg-gray-100 text-gray-700 px-3 py-1 text-xs font-medium">
              {sub.kind === "thuong" ? "Thường" : sub.kind === "thong-bao" ? "Thông báo" : sub.kind === "nop-file" ? "Nộp file" : "Văn bản"}
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
