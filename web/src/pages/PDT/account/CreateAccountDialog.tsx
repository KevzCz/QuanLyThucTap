import React, { useState } from "react";
import Modal from "../../../util/Modal";
import type { Role, Status, Account } from "./AccountTypes";
import { roleLabel } from "./AccountTypes";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreate: (acc: Account) => void; // provide a full Account back to parent
}

const prefixes: Record<Role, string> = {
  "phong-dao-tao": "PDT",
  "ban-chu-nhiem": "BCN",
  "giang-vien": "GV",
  "sinh-vien": "SV",
};

const CreateAccountDialog: React.FC<Props> = ({ open, onClose, onCreate }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("phong-dao-tao");
  const [status, setStatus] = useState<Status>("open");
  const [password, setPassword] = useState("");

  const submit = () => {
    const id = `${prefixes[role]}${Math.floor(1000 + Math.random() * 9000)}X`;
    onCreate({ id, name: name || "Chưa đặt tên", email, role, status });
    onClose();
    // (UI only) Ignore password for now
  };

  return (
    <Modal open={open} onClose={onClose} title="Thêm tài khoản" widthClass="max-w-3xl"
      actions={
        <>
          <button className="h-10 px-4 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50" onClick={onClose}>Hủy</button>
          <button className="h-10 px-5 rounded-md bg-emerald-600 text-white font-medium hover:bg-emerald-700" onClick={submit}>Thêm</button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tên</label>
          <input className="w-full h-11 rounded-lg border border-gray-300 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="VD: Nguyễn Văn A" value={name} onChange={(e)=>setName(e.target.value)} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
            <select className="w-full h-11 rounded-lg border border-gray-300 px-3" value={status} onChange={e=>setStatus(e.target.value as Status)}>
              <option value="open">Mở</option>
              <option value="locked">Khóa</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Vai trò</label>
            <select className="w-full h-11 rounded-lg border border-gray-300 px-3" value={role} onChange={e=>setRole(e.target.value as Role)}>
              {Object.entries(roleLabel).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input className="w-full h-11 rounded-lg border border-gray-300 px-3" placeholder="name@huflit.edu.vn" value={email} onChange={(e)=>setEmail(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label>
          <input type="password" className="w-full h-11 rounded-lg border border-gray-300 px-3" placeholder="********" value={password} onChange={(e)=>setPassword(e.target.value)} />
        </div>
      </div>
    </Modal>
  );
};

export default CreateAccountDialog;
