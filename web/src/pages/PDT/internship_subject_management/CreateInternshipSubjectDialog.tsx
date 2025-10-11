import React, { useState } from "react";
import Modal from "../../../util/Modal";
import type { InternshipSubject, InternshipStatus } from "./InternshipSubjectTypes";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreate: (data: InternshipSubject) => void;
}

const CreateInternshipSubjectDialog: React.FC<Props> = ({ open, onClose, onCreate }) => {
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<InternshipStatus>("open");
  const [maxStudents, setMaxStudents] = useState<number>(50);
  const [departmentLead, setDepartmentLead] = useState("");

  const submit = () => {
    const id = (title || "TT").toUpperCase().replace(/\s+/g, "-").slice(0, 12) +
               "-" + Math.floor(100 + Math.random() * 900);
    onCreate({ id, title: title || "Môn thực tập mới", maxStudents, departmentLead, status });
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Thêm môn thực tập"
      widthClass="max-w-3xl"
      actions={
        <>
          <button className="h-10 px-4 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50" onClick={onClose}>
            Hủy
          </button>
          <button className="h-10 px-5 rounded-md bg-emerald-600 text-white font-medium hover:bg-emerald-700" onClick={submit}>
            Thêm
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tên môn thực tập</label>
          <input
            className="w-full h-11 rounded-lg border border-gray-300 px-3"
            placeholder="VD: CNTT - TT2025"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
            <input
              className="w-full h-11 rounded-lg border border-gray-300 px-3"
              placeholder="Nguyễn Văn A"
              value={departmentLead}
              onChange={(e) => setDepartmentLead(e.target.value)}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default CreateInternshipSubjectDialog;
