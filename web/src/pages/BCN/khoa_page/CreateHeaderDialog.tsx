import React, { useState } from "react";
import Modal from "../../../util/Modal";
import type { Audience, HeaderBlock } from "./KhoaPageTypes";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreate: (h: HeaderBlock) => void;
}

const CreateHeaderDialog: React.FC<Props> = ({ open, onClose, onCreate }) => {
  const [title, setTitle] = useState("");
  const [order, setOrder] = useState(1);
  const [audience, setAudience] = useState<Audience>("tat-ca");

  const submit = () => {
    const id = `h_${Date.now()}`;
    onCreate({ id, title: title || "Header mới", order, audience, subs: [] });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Tạo header"
      widthClass="max-w-xl"
      actions={
        <>
          <button className="h-10 px-4 rounded-md text-rose-600 hover:bg-rose-50" onClick={onClose}>Hủy</button>
          <button className="h-10 px-5 rounded-md bg-emerald-600 text-white hover:bg-emerald-700" onClick={submit}>Tạo</button>
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tên header</label>
          <input className="w-full h-11 rounded-lg border border-gray-300 px-3" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Vị trí</label>
          <input type="number" min={1} className="w-full h-11 rounded-lg border border-gray-300 px-3" value={order} onChange={(e) => setOrder(parseInt(e.target.value || "1", 10))} />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Ai có thể thấy</label>
          <select className="w-full h-11 rounded-lg border border-gray-300 px-3" value={audience} onChange={(e) => setAudience(e.target.value as Audience)}>
            <option value="tat-ca">Sinh viên / Giảng viên / Tất cả</option>
            <option value="sinh-vien">Sinh viên</option>
            <option value="giang-vien">Giảng viên</option>
          </select>
        </div>
      </div>
    </Modal>
  );
};

export default CreateHeaderDialog;
