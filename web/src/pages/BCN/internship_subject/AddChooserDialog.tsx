import React from "react";
import Modal from "../../../util/Modal";

interface Props {
  open: boolean;
  onClose: () => void;
  onChoose: (type: "sv-into-subject" | "sv-into-advisor") => void;
}

const AddChooserDialog: React.FC<Props> = ({ open, onClose, onChoose }) => (
  <Modal
    open={open}
    onClose={onClose}
    title="Chọn hình thức thêm"
    widthClass="max-w-4xl"
    actions={
      <button
        className="h-10 px-4 rounded-md text-gray-600 hover:bg-gray-50 border border-gray-300"
        onClick={onClose}
      >
        Đóng
      </button>
    }
  >
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Add students to subject */}
      <button
        className="group relative rounded-2xl border-2 border-gray-200 p-8 text-left shadow-sm hover:shadow-lg hover:border-blue-300 transition-all duration-200 bg-gradient-to-br from-blue-50 to-white"
        onClick={() => onChoose("sv-into-subject")}
      >
        <div className="flex items-center justify-center w-16 h-16 mb-4 rounded-xl bg-blue-100 group-hover:bg-blue-200 transition-colors">
          <svg
            className="w-8 h-8 text-blue-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-800 transition-colors">
            Thêm sinh viên vào môn thực tập
          </h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            Thêm nhanh một sinh viên hoặc nộp file CSV/XLSX chứa danh sách sinh viên.
            Có thể chọn giảng viên hướng dẫn từ danh sách giảng viên đã tham gia môn thực tập.
          </p>
        </div>
        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
          <svg
            className="w-6 h-6 text-blue-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </div>
      </button>

      {/* Add students to advisor */}
      <button
        className="group relative rounded-2xl border-2 border-gray-200 p-8 text-left shadow-sm hover:shadow-lg hover:border-emerald-300 transition-all duration-200 bg-gradient-to-br from-emerald-50 to-white"
        onClick={() => onChoose("sv-into-advisor")}
      >
        <div className="flex items-center justify-center w-16 h-16 mb-4 rounded-xl bg-emerald-100 group-hover:bg-emerald-200 transition-colors">
          <svg
            className="w-8 h-8 text-emerald-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-gray-900 group-hover:text-emerald-800 transition-colors">
            Thêm sinh viên vào danh sách hướng dẫn của giảng viên
          </h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            Chọn giảng viên từ danh sách đã tham gia môn thực tập, sau đó thêm sinh viên
            vào danh sách hướng dẫn của giảng viên đó.
          </p>
        </div>
        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
          <svg
            className="w-6 h-6 text-emerald-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </div>
      </button>
    </div>

    {/* Info section */}
    <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
      <div className="flex items-start space-x-3">
        <svg
          className="w-5 h-5 text-blue-500 mt-0.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <div className="text-sm text-gray-600">
          <p className="font-medium text-gray-700 mb-1">Lưu ý:</p>
          <ul className="space-y-1">
            <li>• Chỉ có thể chọn giảng viên hướng dẫn từ những giảng viên đã tham gia môn thực tập này</li>
            <li>• File CSV/XLSX cần có định dạng: ID sinh viên, Tên sinh viên, [ID giảng viên], [Tên giảng viên]</li>
            <li>• Sinh viên chỉ có thể tham gia một môn thực tập tại một thời điểm</li>
          </ul>
        </div>
      </div>
    </div>
  </Modal>
);

export default AddChooserDialog;
