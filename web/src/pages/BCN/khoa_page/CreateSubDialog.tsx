// pages/BCN/khoa_page/CreateSubDialog.tsx
import React, { useState } from "react";
import Modal from "../../../util/Modal";
import type { Audience, HeaderBlock, SubHeader, SubKind } from "./KhoaPageTypes";
import RichTextEditor from "../../../util/RichTextEditor";

interface Props {
  open: boolean;
  header?: HeaderBlock;
  onClose: () => void;
  onCreate: (headerId: string, sub: SubHeader) => void;
}

const CreateSubDialog: React.FC<Props> = ({ open, header, onClose, onCreate }) => {
  const [title, setTitle] = useState("");         // plain text or HTML
  const [order, setOrder] = useState(1);
  const [kind, setKind] = useState<SubKind>("thuong");
  const [audience, setAudience] = useState<Audience>("tat-ca");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");

  const submit = () => {
    if (!header) return;
    const id = `s_${Date.now()}`;
    onCreate(header.id, {
      id,
      title: title || "Sub-header mới",
      order,
      kind,
      audience,
      startAt: kind === "nop-file" ? startAt : undefined,
      endAt:   kind === "nop-file" ? endAt   : undefined,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Tạo sub-header"
      widthClass="max-w-xl"
      actions={
        <>
          <button className="h-10 px-4 rounded-md text-rose-600 hover:bg-rose-50" onClick={onClose}>Hủy</button>
          <button className="h-10 px-5 rounded-md bg-emerald-600 text-white hover:bg-emerald-700" onClick={submit}>Tạo</button>
        </>
      }
    >
      {!header ? (
        <div className="text-gray-500">Chưa chọn header.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Name / Content */}
          <div className={kind === "van-ban" ? "sm:col-span-2" : ""}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {kind === "van-ban" ? "Nội dung (văn bản)" : "Tên sub-header"}
            </label>

            {kind === "van-ban" ? (
              <RichTextEditor html={title} onChange={setTitle} />
            ) : (
              <input
                className="w-full h-11 rounded-lg border border-gray-300 px-3"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            )}
          </div>

          {/* Position */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vị trí</label>
            <input type="number" min={1} className="w-full h-11 rounded-lg border border-gray-300 px-3"
                   value={order} onChange={(e) => setOrder(parseInt(e.target.value || "1", 10))} />
          </div>

          {/* Kind */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Loại</label>
            <select className="w-full h-11 rounded-lg border border-gray-300 px-3"
                    value={kind} onChange={(e) => setKind(e.target.value as SubKind)}>
              <option value="thuong">Thường</option>
              <option value="thong-bao">Thông báo</option>
              <option value="nop-file">Nộp file</option>
              <option value="van-ban">Văn bản</option>
            </select>
          </div>

          {/* Audience */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ai có thể thấy</label>
            <select className="w-full h-11 rounded-lg border border-gray-300 px-3"
                    value={audience} onChange={(e) => setAudience(e.target.value as Audience)}>
              <option value="tat-ca">Sinh viên / Giảng viên / Tất cả</option>
              <option value="sinh-vien">Sinh viên</option>
              <option value="giang-vien">Giảng viên</option>
            </select>
          </div>

          {/* Time range only for upload */}
          {kind === "nop-file" && (
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

export default CreateSubDialog;
