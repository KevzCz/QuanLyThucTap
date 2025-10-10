import React, { useEffect, useState } from "react";
import Modal from "../../../util/Modal";
import type { Participant } from "./ParticipantsTypes";

interface Props {
  open: boolean;
  onClose: () => void;
  student?: Participant; // role === "sinh-vien"
  advisors: Participant[]; // list of GV
  onSave: (svId: string, advisorId?: string, advisorName?: string) => void;
}

const EditStudentAdvisorDialog: React.FC<Props> = ({ open, onClose, student, advisors, onSave }) => {
  const [svId, setSvId] = useState("");
  const [svName, setSvName] = useState("");
  const [gvId, setGvId] = useState("");
  const [gvName, setGvName] = useState("");

  useEffect(() => {
    if (!student) return;
    setSvId(student.id);
    setSvName(student.name);
    setGvId(student.advisorId || "");
    setGvName(student.advisorName || "");
  }, [student, open]);

  const save = () => {
    if (!student) return;
    onSave(student.id, gvId || undefined, gvName || advisors.find(a => a.id === gvId)?.name);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Sửa giáo viên hướng dẫn của sinh viên"
      widthClass="max-w-xl"
      actions={
        <>
          <button className="h-10 px-4 rounded-md text-rose-600 hover:bg-rose-50" onClick={onClose}>HỦY</button>
          <button className="h-10 px-5 rounded-md bg-emerald-600 text-white hover:bg-emerald-700" onClick={save}>Thêm</button>
        </>
      }
    >
      {!student ? (
        <div className="text-gray-500">Không tìm thấy sinh viên.</div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ID Sinh viên</label>
              <input disabled className="w-full h-11 rounded-lg border border-gray-200 px-3 bg-gray-50" value={svId} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tên sinh viên</label>
              <input disabled className="w-full h-11 rounded-lg border border-gray-200 px-3 bg-gray-50" value={svName} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ID Giáo viên hướng dẫn của sinh viên</label>
              <input value={gvId} onChange={(e) => setGvId(e.target.value)} className="w-full h-11 rounded-lg border border-gray-300 px-3" placeholder="GVXXX" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tên giảng viên</label>
              <input value={gvName} onChange={(e) => setGvName(e.target.value)} className="w-full h-11 rounded-lg border border-gray-300 px-3" placeholder="Lê Văn B" />
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default EditStudentAdvisorDialog;
