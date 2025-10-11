import React, { useState } from "react";
import Modal from "../../../util/Modal";
import FileDrop from "../../BCN/internship_subject/_FileDrop";

interface RowLite { id: string; name: string }

interface Props {
  open: boolean;
  onClose: () => void;
  advisorId: string;
  advisorName: string;
  onParsed: (rows: RowLite[]) => void;
  onRequestSingle: (sv: RowLite) => void;
}

const GVAddStudentsDialog: React.FC<Props> = ({ open, onClose, advisorId, advisorName, onParsed, onRequestSingle }) => {
  const [svId, setSvId] = useState("");
  const [svName, setSvName] = useState("");

  const sendSingle = () => {
    if (!svId || !svName) return;
    onRequestSingle({ id: svId.trim(), name: svName.trim() });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Gửi yêu cầu thêm sinh viên"
      widthClass="max-w-3xl"
      actions={
        <>
          <button className="h-10 px-4 rounded-md text-gray-700 border border-gray-300 hover:bg-gray-50" onClick={onClose}>HỦY</button>
          <button className="h-10 px-5 rounded-md bg-emerald-600 text-white hover:bg-emerald-700" onClick={sendSingle}>Gửi yêu cầu</button>
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ID Giảng viên</label>
          <input disabled value={advisorId} className="w-full h-11 rounded-lg border border-gray-200 px-3 bg-gray-50" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tên giảng viên</label>
          <input disabled value={advisorName} className="w-full h-11 rounded-lg border border-gray-200 px-3 bg-gray-50" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ID Sinh viên</label>
          <input value={svId} onChange={(e) => setSvId(e.target.value)} placeholder="VD: SVXXXX" className="w-full h-11 rounded-lg border border-gray-300 px-3" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tên sinh viên</label>
          <input value={svName} onChange={(e) => setSvName(e.target.value)} placeholder="Nguyễn Văn A" className="w-full h-11 rounded-lg border border-gray-300 px-3" />
        </div>
      </div>

      <div className="mt-4 text-sm text-gray-600">Hoặc nộp danh sách .csv để gửi yêu cầu theo lô</div>
      <FileDrop onParsed={(rows) => onParsed(rows.map(r => ({ id: r.id, name: r.name })))} />
    </Modal>
  );
};

export default GVAddStudentsDialog;
