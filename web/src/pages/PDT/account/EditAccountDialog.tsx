import React, { useEffect, useState } from "react";
import Modal from "../../../util/Modal";
import type { Account, Role, Status } from "./AccountTypes";
import { roleLabel } from "./AccountTypes";
import { useToast } from "../../../components/UI/Toast";
import LoadingButton from "../../../components/UI/LoadingButton";
import { useFormValidation } from "../../../hooks/useFormValidation";
import { ValidatedInput } from "../../../components/UI/ValidatedInput";

interface Props {
  open: boolean;
  onClose: () => void;
  account?: Account;
  onSave: (acc: Account & { password?: string }) => void;
}

const EditAccountDialog: React.FC<Props> = ({ open, onClose, account, onSave }) => {
  const { showWarning } = useToast();
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("phong-dao-tao");
  const [status, setStatus] = useState<Status>("open");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { validate, validateAll, getFieldError, setFieldTouched, clearErrors } = useFormValidation({
    name: {
      required: 'Vui lòng nhập tên',
      minLength: { value: 2, message: 'Tên phải có ít nhất 2 ký tự' }
    },
    email: {
      required: 'Vui lòng nhập email',
      email: 'Email không hợp lệ'
    },
    password: {
      minLength: { value: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự' }
    }
  });

  useEffect(() => {
    if (account) {
      setName(account.name ?? "");
      setRole(account.role);
      setStatus(account.status);
      setEmail(account.email ?? "");
      setPassword("");
      clearErrors();
    }
  }, [account, open, clearErrors]);

  const submit = async () => {
    if (!account) return;
    
    // Validate required fields
    const isValid = validateAll({ name, email, password });
    if (!isValid) {
      showWarning("Vui lòng kiểm tra lại thông tin nhập vào");
      return;
    }

    setIsSubmitting(true);
    try {
      const updates: Account & { password?: string } = { 
        ...account, 
        name: name.trim(), 
        role, 
        status, 
        email: email.trim() 
      };
      
      if (password.trim()) {
        updates.password = password;
      }
      
      await onSave(updates);
    } catch {
      // Error handling is done in parent component
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Sửa tài khoản"
      actions={
        <>
          <button 
            className="h-10 px-4 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all font-medium" 
            onClick={onClose}
            disabled={isSubmitting}
          >
            Hủy
          </button>
          <LoadingButton
            onClick={submit}
            loading={isSubmitting}
            variant="primary"
            className="shadow-sm hover:shadow"
          >
            Lưu
          </LoadingButton>
        </>
      }
    >
      {!account ? (
        <div className="text-gray-500">Không tìm thấy tài khoản.</div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mã</label>
              <input 
                className="w-full h-11 rounded-lg border border-gray-200 px-3 bg-gray-50" 
                value={account.id} 
                disabled 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
              <select 
                className="w-full h-11 rounded-lg border border-gray-300 px-3" 
                value={status} 
                onChange={e => setStatus(e.target.value as Status)}
                disabled={isSubmitting}
              >
                <option value="open">Mở</option>
                <option value="locked">Khóa</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tên <span className="text-red-500">*</span>
            </label>
            <ValidatedInput
              value={name} 
              onChange={e => {
                setName(e.target.value);
                validate('name', e.target.value, { name, email, password });
              }}
              onBlur={() => setFieldTouched('name')}
              error={getFieldError('name')}
              disabled={isSubmitting}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vai trò <span className="text-red-500">*</span>
              </label>
              <select 
                className="w-full h-11 rounded-lg border border-gray-300 px-3" 
                value={role} 
                onChange={e => setRole(e.target.value as Role)}
                disabled={isSubmitting}
              >
                {Object.entries(roleLabel).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <ValidatedInput
                type="email"
                value={email} 
                onChange={e => {
                  setEmail(e.target.value);
                  validate('email', e.target.value, { name, email, password });
                }}
                onBlur={() => setFieldTouched('email')}
                error={getFieldError('email')}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Đặt lại mật khẩu (tuỳ chọn)
            </label>
            <ValidatedInput
              type="password" 
              value={password} 
              onChange={e => {
                setPassword(e.target.value);
                validate('password', e.target.value, { name, email, password });
              }}
              onBlur={() => setFieldTouched('password')}
              error={getFieldError('password')}
              placeholder="Để trống nếu không đổi mật khẩu"
              disabled={isSubmitting}
            />
            {password && (
              <p className="mt-1 text-xs text-gray-500">
                Mật khẩu mới phải có ít nhất 6 ký tự
              </p>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
};

export default EditAccountDialog;
