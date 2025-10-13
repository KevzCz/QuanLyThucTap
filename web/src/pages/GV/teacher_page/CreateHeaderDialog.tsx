import React, { useState } from "react";
import Modal from "../../../util/Modal";
import type { HeaderBlock } from "./TeacherPageTypes";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreate: (h: Omit<HeaderBlock, 'order' | 'subs'>) => void;
}

const CreateHeaderDialog: React.FC<Props> = ({ open, onClose, onCreate }) => {
  const [title, setTitle] = useState("");

  const submit = () => {
    if (!title.trim()) {
      alert("Vui lòng nhập tên header");
      return;
    }
    
    onCreate({ 
      id: `h_${Date.now()}`,
      title: title.trim()
    });
    
    // Reset form
    setTitle("");
  };

  const handleClose = () => {
    setTitle("");
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Tạo header mới"
      widthClass="max-w-lg"
      actions={
        <>
          <button className="h-10 px-4 rounded-md text-gray-600 border border-gray-300 hover:bg-gray-50 transition-colors" onClick={handleClose}>
            Hủy
          </button>
          <button className="h-10 px-5 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 transition-colors" onClick={submit}>
            Tạo header
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tên header <span className="text-red-500">*</span>
          </label>
          <input 
            className="w-full h-11 rounded-lg border border-gray-300 px-3 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors" 
            value={title} 
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ví dụ: Thông báo từ giảng viên"
            autoFocus
          />
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Thứ tự tự động</p>
              <p>Header mới sẽ được đặt ở cuối danh sách. Bạn có thể kéo thả để sắp xếp lại sau khi tạo.</p>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default CreateHeaderDialog;
