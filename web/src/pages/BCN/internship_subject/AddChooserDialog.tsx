import React from "react";
import Modal from "../../../util/Modal";

interface Props {
  open: boolean;
  onClose: () => void;
  onChoose: (type: "sv-into-subject" | "sv-into-advisor") => void;
}

const AddChooserDialog: React.FC<Props> = ({ open, onClose, onChoose }) => (
  <Modal open={open} onClose={onClose} title="Thêm" widthClass="max-w-xl">
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <button
        className="rounded-xl border border-gray-200 p-6 text-left shadow hover:shadow-md transition"
        onClick={() => onChoose("sv-into-subject")}
      >
        <div className="text-2xl mb-2">👨‍🎓</div>
        <div className="font-semibold">Thêm sinh viên vào môn thực tập</div>
        <div className="text-sm text-gray-600 mt-1">Thêm nhanh một SV hoặc nộp file CSV/XLSX</div>
      </button>

      <button
        className="rounded-xl border border-gray-200 p-6 text-left shadow hover:shadow-md transition"
        onClick={() => onChoose("sv-into-advisor")}
      >
        <div className="text-2xl mb-2">🧑‍🏫</div>
        <div className="font-semibold">Thêm sinh viên vào danh sách hướng dẫn của giảng viên</div>
        <div className="text-sm text-gray-600 mt-1">Chọn GV, thêm SV hoặc nộp file CSV/XLSX</div>
      </button>
    </div>
  </Modal>
);

export default AddChooserDialog;
