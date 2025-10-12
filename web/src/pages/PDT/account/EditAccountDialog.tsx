import React, { useEffect, useState } from "react";
import Modal from "../../../util/Modal";
import type { Account, Role, Status } from "./AccountTypes";
import { roleLabel } from "./AccountTypes";

interface Props {
  open: boolean;
  onClose: () => void;
  account?: Account;
  onSave: (acc: Account & { password?: string }) => void;
}

const EditAccountDialog: React.FC<Props> = ({ open, onClose, account, onSave }) => {
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("phong-dao-tao");
  const [status, setStatus] = useState<Status>("open");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (account) {
      setName(account.name ?? "");
      setRole(account.role);
      setStatus(account.status);
      setEmail(account.email ?? "");
      setPassword("");
    }
  }, [account, open]);

  const submit = async () => {
    if (!account) return;
    
    if (!name.trim()) {
      alert("Vui lòng nhập tên");
      return;
    }
    if (!email.trim()) {
      alert("Vui lòng nhập email");
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
        if (password.length < 6) {
          alert("Mật khẩu phải có ít nhất 6 ký tự");
          return;
        }
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
            className="h-10 px-4 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50" 
            onClick={onClose}
            disabled={isSubmitting}
          >
            Hủy
          </button>
          <button 
            className="h-10 px-5 rounded-md bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:opacity-50" 
            onClick={submit}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Đang lưu..." : "Lưu"}
          </button>
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
            <input 
              className="w-full h-11 rounded-lg border border-gray-300 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500" 
              value={name} 
              onChange={e => setName(e.target.value)}
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
              <input 
                type="email"
                className="w-full h-11 rounded-lg border border-gray-300 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                value={email} 
                onChange={e => setEmail(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Đặt lại mật khẩu (tuỳ chọn)
            </label>
            <input 
              type="password" 
              className="w-full h-11 rounded-lg border border-gray-300 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
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
