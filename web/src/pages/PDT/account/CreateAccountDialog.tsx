import React, { useState } from "react";
import Modal from "../../../util/Modal";
import type { Role, Status, Account } from "./AccountTypes";
import { roleLabel } from "./AccountTypes";
import { useToast } from "../../../components/UI/Toast";
import LoadingButton from "../../../components/UI/LoadingButton";
import { useFormValidation } from "../../../hooks/useFormValidation";
import { ValidatedInput } from "../../../components/UI/ValidatedInput";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreate: (acc: Omit<Account, 'id'> & { password: string }) => void;
}

const CreateAccountDialog: React.FC<Props> = ({ open, onClose, onCreate }) => {
  const { showWarning } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("phong-dao-tao");
  const [status, setStatus] = useState<Status>("open");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { validate, validateAll, getFieldError, hasError, setFieldTouched, clearErrors } = useFormValidation({
    name: {
      required: 'Vui lòng nhập tên',
      minLength: { value: 2, message: 'Tên phải có ít nhất 2 ký tự' }
    },
    email: {
      required: 'Vui lòng nhập email',
      email: 'Email không hợp lệ'
    },
    password: {
      required: 'Vui lòng nhập mật khẩu',
      minLength: { value: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự' }
    },
    confirmPassword: {
      required: 'Vui lòng xác nhận mật khẩu',
      match: { field: 'password', message: 'Mật khẩu xác nhận không khớp' }
    }
  });

  const reset = () => {
    setName("");
    setEmail("");
    setRole("phong-dao-tao");
    setStatus("open");
    setPassword("");
    setConfirmPassword("");
    setIsSubmitting(false);
    clearErrors();
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const submit = async () => {
    // Validate all fields
    const isValid = validateAll({ name, email, password, confirmPassword });
    if (!isValid) {
      showWarning("Vui lòng kiểm tra lại thông tin nhập vào");
      return;
    }

    setIsSubmitting(true);
    try {
      await onCreate({ 
        name: name.trim(), 
        email: email.trim(), 
        role, 
        status, 
        password 
      });
      reset();
    } catch {
      // Error handling is done in parent component
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="Thêm tài khoản" widthClass="max-w-3xl"
      actions={
        <>
          <button 
            className="h-10 px-4 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50" 
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Hủy
          </button>
          <LoadingButton
            onClick={submit}
            loading={isSubmitting}
            variant="primary"
          >
            Thêm
          </LoadingButton>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4">
        <ValidatedInput
          label="Tên"
          placeholder="VD: Nguyễn Văn A"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            validate('name', e.target.value, { name: e.target.value, email, password, confirmPassword });
          }}
          onBlur={() => {
            setFieldTouched('name');
            validate('name', name, { name, email, password, confirmPassword });
          }}
          error={getFieldError('name')}
          touched={hasError('name')}
          required
          disabled={isSubmitting}
        />
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
          <div className="sm:col-span-2">
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
        </div>
        
        <ValidatedInput
          label="Email"
          type="email"
          placeholder="name@huflit.edu.vn"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            validate('email', e.target.value, { name, email: e.target.value, password, confirmPassword });
          }}
          onBlur={() => {
            setFieldTouched('email');
            validate('email', email, { name, email, password, confirmPassword });
          }}
          error={getFieldError('email')}
          touched={hasError('email')}
          required
          disabled={isSubmitting}
        />
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ValidatedInput
            label="Mật khẩu"
            type="password"
            placeholder="Tối thiểu 6 ký tự"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              validate('password', e.target.value, { name, email, password: e.target.value, confirmPassword });
            }}
            onBlur={() => {
              setFieldTouched('password');
              validate('password', password, { name, email, password, confirmPassword });
            }}
            error={getFieldError('password')}
            touched={hasError('password')}
            required
            disabled={isSubmitting}
            helpText="Tối thiểu 6 ký tự"
          />
          <ValidatedInput
            label="Xác nhận mật khẩu"
            type="password"
            placeholder="Nhập lại mật khẩu"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              validate('confirmPassword', e.target.value, { name, email, password, confirmPassword: e.target.value });
            }}
            onBlur={() => {
              setFieldTouched('confirmPassword');
              validate('confirmPassword', confirmPassword, { name, email, password, confirmPassword });
            }}
            error={getFieldError('confirmPassword')}
            touched={hasError('confirmPassword')}
            required
            disabled={isSubmitting}
          />
        </div>
        
        <div className="text-xs text-gray-500">
          <span className="text-red-500">*</span> Các trường bắt buộc
        </div>
      </div>
    </Modal>
  );
};

export default CreateAccountDialog;
