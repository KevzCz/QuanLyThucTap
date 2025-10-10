import React, { useState } from "react";
import Modal from "../../../util/Modal";
import FileDrop, { type ParsedRow } from "./_FileDrop";
import type { Participant } from "./ParticipantsTypes";

interface Props {
  open: boolean;
  onClose: () => void;
  onParsed: (rows: ParsedRow[]) => void;
  onAddSingle: (sv: Participant) => void;
}

const AddStudentsToSubjectDialog: React.FC<Props> = ({ open, onClose, onParsed, onAddSingle }) => {
  const [svId, setSvId] = useState("");
  const [svName, setSvName] = useState("");
  const [gvId, setGvId] = useState("");
  const [gvName, setGvName] = useState("");

  const add = () => {
    if (!svId || !svName) return;
    onAddSingle({
      id: svId.trim(),
      name: svName.trim(),
      role: "sinh-vien",
      status: gvId ? "dang-thuc-tap" : "chua-co-giang-vien",
      advisorId: gvId || undefined,
      advisorName: gvName || undefined,
    });
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Thêm sinh viên vào môn thực tập"
      widthClass="max-w-3xl"
      actions={
        <>
          <button className="h-10 px-4 rounded-md text-gray-700 border border-gray-300 hover:bg-gray-50" onClick={onClose}>HỦY</button>
          <button className="h-10 px-5 rounded-md bg-emerald-600 text-white hover:bg-emerald-700" onClick={add}>Thêm</button>
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ID Sinh viên</label>
          <input value={svId} onChange={(e) => setSvId(e.target.value)} placeholder="VD: SVXXX" className="w-full h-11 rounded-lg border border-gray-300 px-3" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tên sinh viên</label>
          <input value={svName} onChange={(e) => setSvName(e.target.value)} placeholder="Tên tự hiện" className="w-full h-11 rounded-lg border border-gray-300 px-3" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ID Giảng viên hướng dẫn (OPT)</label>
          <input value={gvId} onChange={(e) => setGvId(e.target.value)} placeholder="VD: GVXXX" className="w-full h-11 rounded-lg border border-gray-300 px-3" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tên giảng viên</label>
          <input value={gvName} onChange={(e) => setGvName(e.target.value)} placeholder="Tên tự hiện" className="w-full h-11 rounded-lg border border-gray-300 px-3" />
        </div>
      </div>

      <FileDrop onParsed={onParsed} />
    </Modal>
  );
};

export default AddStudentsToSubjectDialog;
