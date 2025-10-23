import React, { useState } from "react";
import Modal from "../../../util/Modal";
import type { Role, Status, Account } from "./AccountTypes";
import { roleLabel } from "./AccountTypes";
import { useToast } from "../../../components/UI/Toast";
import LoadingButton from "../../../components/UI/LoadingButton";

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

  const reset = () => {
    setName("");
    setEmail("");
    setRole("phong-dao-tao");
    setStatus("open");
    setPassword("");
    setConfirmPassword("");
    setIsSubmitting(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const submit = async () => {
    if (!name.trim()) {
      showWarning("Vui lòng nhập tên");
      return;
    }
    if (!email.trim()) {
      showWarning("Vui lòng nhập email");
      return;
    }
    if (!password.trim()) {
      showWarning("Vui lòng nhập mật khẩu");
      return;
    }
    if (password !== confirmPassword) {
      showWarning("Mật khẩu xác nhận không khớp");
      return;
    }
    if (password.length < 6) {
      showWarning("Mật khẩu phải có ít nhất 6 ký tự");
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
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tên <span className="text-red-500">*</span>
          </label>
          <input 
            className="w-full h-11 rounded-lg border border-gray-300 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500" 
            placeholder="VD: Nguyễn Văn A" 
            value={name} 
            onChange={(e) => setName(e.target.value)}
            disabled={isSubmitting}
          />
        </div>
        
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
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email <span className="text-red-500">*</span>
          </label>
          <input 
            type="email"
            className="w-full h-11 rounded-lg border border-gray-300 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500" 
            placeholder="name@huflit.edu.vn" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)}
            disabled={isSubmitting}
          />
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mật khẩu <span className="text-red-500">*</span>
            </label>
            <input 
              type="password" 
              className="w-full h-11 rounded-lg border border-gray-300 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500" 
              placeholder="Tối thiểu 6 ký tự" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Xác nhận mật khẩu <span className="text-red-500">*</span>
            </label>
            <input 
              type="password" 
              className="w-full h-11 rounded-lg border border-gray-300 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500" 
              placeholder="Nhập lại mật khẩu" 
              value={confirmPassword} 
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
        </div>
        
        <div className="text-xs text-gray-500">
          <span className="text-red-500">*</span> Các trường bắt buộc
        </div>
      </div>
    </Modal>
  );
};

export default CreateAccountDialog;
