import React, { useEffect, useState } from "react";
import Modal from "../../../util/Modal";
import type { HeaderBlock } from "./TeacherPageTypes";

interface Props {
  open: boolean;
  header?: HeaderBlock;
  onClose: () => void;
  onSave: (h: HeaderBlock) => void;
  onDelete: (id: string) => void;
}

const EditHeaderDialog: React.FC<Props> = ({ open, header, onClose, onSave, onDelete }) => {
  const [title, setTitle] = useState("");
  const [order, setOrder] = useState(1);

  useEffect(() => {
    if (!header) return;
    setTitle(header.title);
    setOrder(header.order);
  }, [header, open]);

  const save = () => header && onSave({ ...header, title, order });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Sửa header"
      widthClass="max-w-xl"
      actions={
        <>
          {header && (
            <button className="mr-auto h-10 px-4 rounded-md text-rose-600 hover:bg-rose-50" onClick={() => onDelete(header.id)}>
              Xóa
            </button>
          )}
          <button className="h-10 px-4 rounded-md text-gray-700 border border-gray-300 hover:bg-gray-50" onClick={onClose}>Hủy</button>
          <button className="h-10 px-5 rounded-md bg-emerald-600 text-white hover:bg-emerald-700" onClick={save}>Lưu</button>
        </>
      }
    >
      {!header ? (
        <div className="text-gray-500">Không tìm thấy header.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tên header</label>
            <input className="w-full h-11 rounded-lg border border-gray-300 px-3" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vị trí</label>
            <input type="number" min={1} className="w-full h-11 rounded-lg border border-gray-300 px-3" value={order} onChange={(e) => setOrder(parseInt(e.target.value || "1", 10))} />
          </div>
        </div>
      )}
    </Modal>
  );
};

export default EditHeaderDialog;
