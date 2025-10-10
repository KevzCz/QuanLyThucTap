import React, { useEffect, useState } from "react";
import Modal from "../../../util/Modal";
import type { InternshipSubject, InternshipStatus } from "./InternshipSubjectTypes";

interface Props {
  open: boolean;
  onClose: () => void;
  internshipSubject?: InternshipSubject;
  onSave: (data: InternshipSubject) => void;
}

const EditInternshipSubjectDialog: React.FC<Props> = ({ open, onClose, internshipSubject, onSave }) => {
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<InternshipStatus>("open");
  const [maxStudents, setMaxStudents] = useState<number>(50);
  const [departmentLead, setDepartmentLead] = useState("");

  useEffect(() => {
    if (internshipSubject) {
      setTitle(internshipSubject.title);
      setStatus(internshipSubject.status);
      setMaxStudents(internshipSubject.maxStudents);
      setDepartmentLead(internshipSubject.departmentLead);
    }
  }, [internshipSubject, open]);

  const submit = () => {
    if (!internshipSubject) return;
    onSave({ ...internshipSubject, title, status, maxStudents, departmentLead });
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Sửa môn thực tập"
      widthClass="max-w-3xl"
      actions={
        <>
          <button className="h-10 px-4 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50" onClick={onClose}>
            Hủy
          </button>
          <button className="h-10 px-5 rounded-md bg-emerald-600 text-white font-medium hover:bg-emerald-700" onClick={submit}>
            Lưu
          </button>
        </>
      }
    >
      {!internshipSubject ? (
        <div className="text-gray-500">Không tìm thấy môn thực tập.</div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mã</label>
              <input disabled className="w-full h-11 rounded-lg border border-gray-200 px-3 bg-gray-50" value={internshipSubject.id} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
              <select
                className="w-full h-11 rounded-lg border border-gray-300 px-3"
                value={status}
                onChange={(e) => setStatus(e.target.value as InternshipStatus)}
              >
                <option value="open">Mở</option>
                <option value="locked">Khóa</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tên môn</label>
            <input className="w-full h-11 rounded-lg border border-gray-300 px-3" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max sinh viên</label>
              <input
                type="number"
                min={0}
                className="w-full h-11 rounded-lg border border-gray-300 px-3"
                value={maxStudents}
                onChange={(e) => setMaxStudents(parseInt(e.target.value || "0", 10))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ban chủ nhiệm / Người phụ trách</label>
              <input className="w-full h-11 rounded-lg border border-gray-300 px-3" value={departmentLead} onChange={(e) => setDepartmentLead(e.target.value)} />
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default EditInternshipSubjectDialog;
