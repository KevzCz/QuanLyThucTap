import React, { useEffect, useState } from "react";
import Modal from "../../../util/Modal";
import type { HeaderBlock } from "./TeacherPageTypes";
import LoadingButton from "../../../components/UI/LoadingButton";
import { useToast } from "../../../components/UI/Toast";
import { useFormValidation } from "../../../hooks/useFormValidation";
import { ValidatedInput } from "../../../components/UI/ValidatedInput";

interface Props {
  open: boolean;
  header?: HeaderBlock;
  onClose: () => void;
  onSave: (h: HeaderBlock) => void;
  onDelete: (id: string) => void;
}

const EditHeaderDialog: React.FC<Props> = ({ open, header, onClose, onSave, onDelete }) => {
  const { showWarning } = useToast();
  const [title, setTitle] = useState("");
  const [order, setOrder] = useState(1);
  const [audience, setAudience] = useState<"tat-ca" | "sinh-vien" | "giang-vien">("sinh-vien");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { validate, validateAll, getFieldError, setFieldTouched, clearErrors } = useFormValidation({
    title: {
      required: 'Vui lòng nhập tên header',
      minLength: { value: 2, message: 'Tên header phải có ít nhất 2 ký tự' }
    }
  });

  useEffect(() => {
    if (!header) return;
    setTitle(header.title);
    setOrder(header.order);
    setAudience(header.audience);
    clearErrors();
  }, [header, open, clearErrors]);

  const save = async () => {
    if (!header) return;
    const isValid = validateAll({ title });
    if (!isValid) {
      showWarning("Vui lòng kiểm tra lại thông tin nhập vào");
      return;
    }
    
    setIsSubmitting(true);
    try {
      await onSave({ ...header, title: title.trim(), order, audience });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isSubmitting) {
      e.preventDefault();
      save();
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Sửa header"
      widthClass="max-w-xl"
      actions={
        <>
          {header && (
            <button 
              className="mr-auto h-10 px-4 rounded-md text-rose-600 hover:bg-rose-50 disabled:opacity-50" 
              onClick={() => onDelete(header.id)}
              disabled={isSubmitting}
            >
              Xóa
            </button>
          )}
          <button 
            className="h-10 px-4 rounded-md text-gray-700 border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Hủy
          </button>
          <LoadingButton 
            onClick={save}
            loading={isSubmitting}
            variant="primary"
          >
            Lưu
          </LoadingButton>
        </>
      }
    >
      {!header ? (
        <div className="text-gray-500">Không tìm thấy header.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
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
              disabled={isSubmitting}
              placeholder="Nhập tên header"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Thứ tự hiện tại</label>
            <div className="relative">
              <input 
                type="number" 
                min={1} 
                className="w-full h-11 rounded-lg border border-gray-300 px-3 bg-gray-50 text-gray-600" 
                value={order} 
                readOnly
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              <svg className="w-3 h-3 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                <path d="M10 4a2 2 0 100-4 2 2 0 000 4z"/>
                <path d="M10 20a2 2 0 100-4 2 2 0 000 4z"/>
              </svg>
              Kéo thả ở danh sách để thay đổi thứ tự
            </p>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Ai có thể thấy</label>
            <select 
              className="w-full h-11 rounded-lg border border-gray-300 px-3 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors" 
              value={audience} 
              onChange={(e) => setAudience(e.target.value as "tat-ca" | "sinh-vien" | "giang-vien")}
            >
              <option value="tat-ca">Sinh viên / Giảng viên / Tất cả</option>
              <option value="sinh-vien">Chỉ sinh viên</option>
              <option value="giang-vien">Chỉ giảng viên</option>
            </select>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default EditHeaderDialog;
