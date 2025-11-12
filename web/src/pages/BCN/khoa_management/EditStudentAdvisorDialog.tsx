import React, { useEffect, useState } from "react";
import Modal from "../../../util/Modal";
import type { Participant } from "./ParticipantsTypes";
import { useToast } from "../../../components/UI/Toast";

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
  const { showWarning } = useToast();

  useEffect(() => {
    if (!student) return;
    setSvId(student.id);
    setSvName(student.name);
    setGvId(student.advisorId || "");
    setGvName(student.advisorName || "");
  }, [student, open]);

  const handleTeacherChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    setGvId(selectedId);
    
    // Auto-populate teacher name when teacher is selected
    const selectedTeacher = advisors.find(a => a.id === selectedId);
    if (selectedTeacher) {
      setGvName(selectedTeacher.name);
    } else {
      setGvName("");
    }
  };

  const save = () => {
    if (!student) return;
    if (!gvId) {
      showWarning("Thiếu thông tin", "Vui lòng chọn giáo viên hướng dẫn");
      return;
    }
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
          <button className="h-10 px-4 rounded-md text-rose-600 hover:bg-rose-50" onClick={onClose}>Hủy</button>
          <button 
            className="h-10 px-5 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed" 
            onClick={save}
            disabled={!gvId}
          >
            Lưu
          </button>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Giáo viên hướng dẫn <span className="text-red-500">*</span>
              </label>
              <select 
                value={gvId} 
                onChange={handleTeacherChange}
                className="w-full h-11 rounded-lg border border-gray-300 px-3 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="">-- Chọn giáo viên --</option>
                {advisors.map((advisor) => (
                  <option key={advisor.id} value={advisor.id}>
                    {advisor.id} - {advisor.name}
                  </option>
                ))}
              </select>
              {advisors.length === 0 && (
                <p className="mt-1 text-sm text-amber-600">Chưa có giảng viên nào trong môn thực tập này</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tên giảng viên</label>
              <input 
                disabled 
                value={gvName} 
                className="w-full h-11 rounded-lg border border-gray-200 px-3 bg-gray-50 text-gray-600" 
                placeholder="Tên sẽ tự động điền"
              />
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default EditStudentAdvisorDialog;
