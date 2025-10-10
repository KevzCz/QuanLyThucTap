import React from "react";
import Modal from "../../../util/Modal";
import type { Account } from "./AccountTypes";
import { roleLabel } from "./AccountTypes";

interface Props {
  open: boolean;
  onClose: () => void;
  account?: Account;
}

const Item: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => (
  <div className="flex justify-between gap-6 py-2 text-sm">
    <span className="text-gray-600">{label}</span>
    <span className="font-medium text-gray-800">{value ?? "—"}</span>
  </div>
);

const ViewAccountDialog: React.FC<Props> = ({ open, onClose, account }) => {
  return (
    <Modal open={open} onClose={onClose} title="Xem tài khoản" widthClass="max-w-lg"
      actions={<button className="h-10 px-4 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700" onClick={onClose}>Đóng</button>}
    >
      {!account ? (
        <div className="text-gray-500">Không tìm thấy tài khoản.</div>
      ) : (
        <div className="rounded-xl border border-gray-200">
          <div className="px-5 py-4 text-center border-b">
            <div className="text-blue-600 font-semibold">{account.name}</div>
            <div className="text-xs text-gray-500 mt-0.5">{account.id}</div>
          </div>
          <div className="px-5 py-3">
            <Item label="Vai trò" value={roleLabel[account.role]} />
            <Item label="Email" value={account.email} />
            <Item label="Trạng thái" value={account.status === "open" ? "Mở" : "Khóa"} />
          </div>
        </div>
      )}
    </Modal>
  );
};

export default ViewAccountDialog;
