import React, { useMemo, useState } from "react";
import Modal from "../../../util/Modal";
import FileDrop, { type ParsedRow } from "./_FileDrop";
import type { Participant } from "./ParticipantsTypes";

interface Props {
  open: boolean;
  onClose: () => void;
  advisors: Participant[]; // role==="giang-vien"
  onParsed: (rows: ParsedRow[]) => void;
  onAddSingle: (sv: Participant) => void;
}

const AddStudentsToAdvisorDialog: React.FC<Props> = ({ open, onClose, advisors, onParsed, onAddSingle }) => {
  const [gvId, setGvId] = useState("");
  const [gvName, setGvName] = useState("");
  const [svId, setSvId] = useState("");
  const [svName, setSvName] = useState("");

  const advisorOptions = useMemo(() => advisors.map(a => ({ id: a.id, name: a.name })), [advisors]);

  const add = () => {
    if (!gvId || !svId || !svName) return;
    onAddSingle({
      id: svId.trim(),
      name: svName.trim(),
      role: "sinh-vien",
      status: "dang-thuc-tap",
      advisorId: gvId,
      advisorName: gvName || advisorOptions.find(x => x.id === gvId)?.name,
    });
    setSvId(""); setSvName("");
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Thêm sinh viên vào danh sách giảng viên"
      widthClass="max-w-3xl"
      actions={
        <>
          <button className="h-10 px-4 rounded-md text-rose-600 hover:bg-rose-50" onClick={onClose}>HỦY</button>
          <button className="h-10 px-5 rounded-md bg-emerald-600 text-white hover:bg-emerald-700" onClick={onClose}>Lưu</button>
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ID Giảng viên hướng dẫn</label>
          <input value={gvId} onChange={(e) => setGvId(e.target.value)} placeholder="GVXXX" className="w-full h-11 rounded-lg border border-gray-300 px-3" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tên giảng viên</label>
          <input
            value={gvName}
            onChange={(e) => setGvName(e.target.value)}
            placeholder="Chọn/nhập tên"
            list="bcn-gv-names"
            className="w-full h-11 rounded-lg border border-gray-300 px-3"
          />
          <datalist id="bcn-gv-names">
            {advisorOptions.map((a) => (
              <option key={a.id} value={a.name}>{a.id}</option>
            ))}
          </datalist>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ID Sinh viên</label>
          <input value={svId} onChange={(e) => setSvId(e.target.value)} placeholder="VD: SVXXX" className="w-full h-11 rounded-lg border border-gray-300 px-3" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tên sinh viên</label>
          <input value={svName} onChange={(e) => setSvName(e.target.value)} placeholder="Tên tự hiện" className="w-full h-11 rounded-lg border border-gray-300 px-3" />
        </div>

        <div className="sm:col-span-2">
          <button className="rounded-md bg-emerald-600 text-white px-4 h-9 hover:bg-emerald-700" onClick={add}>Thêm</button>
        </div>
      </div>

      <FileDrop onParsed={(rows) => {
        // attach advisor columns for confirm screen
        const enriched = rows.map(r => ({ ...r, advisorId: gvId || r.advisorId, advisorName: gvName || r.advisorName }));
        onParsed(enriched);
      }} acceptAdvisor />
    </Modal>
  );
};

export default AddStudentsToAdvisorDialog;
