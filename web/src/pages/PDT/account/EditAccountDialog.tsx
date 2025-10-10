import React, { useEffect, useState } from "react";
import Modal from "../../../util/Modal";
import type { Account, Role, Status } from "./AccountTypes";
import { roleLabel } from "./AccountTypes";

interface Props {
  open: boolean;
  onClose: () => void;
  account?: Account;
  onSave: (acc: Account) => void;
}

const EditAccountDialog: React.FC<Props> = ({ open, onClose, account, onSave }) => {
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("phong-dao-tao");
  const [status, setStatus] = useState<Status>("open");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (account) {
      setName(account.name ?? "");
      setRole(account.role);
      setStatus(account.status);
      setEmail(account.email ?? "");
      setPassword("");
    }
  }, [account, open]);

  const submit = () => {
    if (!account) return;
    onSave({ ...account, name, role, status, email });
    onClose();
    // password ignored (UI only)
  };

  return (
    <Modal open={open} onClose={onClose} title="Sửa tài khoản"
      actions={
        <>
          <button className="h-10 px-4 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50" onClick={onClose}>Hủy</button>
          <button className="h-10 px-5 rounded-md bg-emerald-600 text-white font-medium hover:bg-emerald-700" onClick={submit}>Lưu</button>
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
              <input className="w-full h-11 rounded-lg border border-gray-200 px-3 bg-gray-50" value={account.id} disabled />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
              <select className="w-full h-11 rounded-lg border border-gray-300 px-3" value={status} onChange={e=>setStatus(e.target.value as Status)}>
                <option value="open">Mở</option>
                <option value="locked">Khóa</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tên</label>
            <input className="w-full h-11 rounded-lg border border-gray-300 px-3" value={name} onChange={e=>setName(e.target.value)} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vai trò</label>
              <select className="w-full h-11 rounded-lg border border-gray-300 px-3" value={role} onChange={e=>setRole(e.target.value as Role)}>
                {Object.entries(roleLabel).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input className="w-full h-11 rounded-lg border border-gray-300 px-3" value={email} onChange={e=>setEmail(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Đặt lại mật khẩu (tuỳ chọn)</label>
            <input type="password" className="w-full h-11 rounded-lg border border-gray-300 px-3" value={password} onChange={e=>setPassword(e.target.value)} placeholder="********" />
          </div>
        </div>
      )}
    </Modal>
  );
};

export default EditAccountDialog;
