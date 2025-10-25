import React, { useState } from "react";
import Modal from "../../../util/Modal";
import type { HeaderBlock } from "./TeacherPageTypes";
import LoadingButton from "../../../components/UI/LoadingButton";
import { useToast } from "../../../components/UI/Toast";
import { useFormValidation } from "../../../hooks/useFormValidation";
import { ValidatedInput } from "../../../components/UI/ValidatedInput";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreate: (h: Omit<HeaderBlock, 'order' | 'subs'>) => void;
}

const CreateHeaderDialog: React.FC<Props> = ({ open, onClose, onCreate }) => {
  const { showWarning } = useToast();
  const [title, setTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { validate, validateAll, getFieldError, setFieldTouched, clearErrors } = useFormValidation({
    title: {
      required: 'Vui lòng nhập tên header',
      minLength: { value: 2, message: 'Tên header phải có ít nhất 2 ký tự' }
    }
  });

  const submit = async () => {
    const isValid = validateAll({ title });
    if (!isValid) {
      showWarning("Vui lòng kiểm tra lại thông tin nhập vào");
      return;
    }
    
    setIsSubmitting(true);
    try {
      onCreate({ 
        id: `h_${Date.now()}`,
        title: title.trim(),
        audience: 'tat-ca'
      });
      
      // Reset form
      setTitle("");
      clearErrors();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setTitle("");
    clearErrors();
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Tạo header mới"
      widthClass="max-w-lg"
      actions={
        <>
          <button 
            className="h-10 px-4 rounded-md text-gray-600 border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50" 
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Hủy
          </button>
          <LoadingButton
            loading={isSubmitting}
            loadingText="Đang tạo..."
            onClick={submit}
            variant="primary"
            icon="➕"
          >
            Tạo header
          </LoadingButton>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tên header <span className="text-red-500">*</span>
          </label>
          <ValidatedInput
            value={title} 
            onChange={(e) => {
              setTitle(e.target.value);
              validate('title', e.target.value, { title });
            }}
            onBlur={() => setFieldTouched('title')}
            onKeyDown={handleKeyDown}
            error={getFieldError('title')}
            placeholder="Ví dụ: Thông báo từ giảng viên"
            disabled={isSubmitting}
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
