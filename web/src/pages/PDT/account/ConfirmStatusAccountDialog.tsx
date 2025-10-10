import React from "react";
import Modal from "../../../util/Modal";
import type { Account, Status } from "./AccountTypes";

interface Props {
  open: boolean;
  onClose: () => void;
  account?: Account;
  nextStatus: Status; // the status we are about to apply
  onConfirm: (id: string, next: Status) => void;
}

const ConfirmStatusDialog: React.FC<Props> = ({ open, onClose, account, nextStatus, onConfirm }) => {
  const isLock = nextStatus === "locked";
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isLock ? "Khóa tài khoản" : "Mở khóa tài khoản"}
      widthClass="max-w-lg"
      actions={
        <>
          <button className="h-10 px-4 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50" onClick={onClose}>
            Hủy
          </button>
          <button
            className={`h-10 px-5 rounded-md text-white font-medium ${isLock ? "bg-amber-600 hover:bg-amber-700" : "bg-indigo-600 hover:bg-indigo-700"}`}
            onClick={() => account && onConfirm(account.id, nextStatus)}
          >
            {isLock ? "Khóa" : "Mở"}
          </button>
        </>
      }
    >
      <p className="text-sm text-gray-700">
        Bạn chắc chắn muốn {isLock ? <b>khóa</b> : <b>mở</b>} tài khoản{" "}
        <span className="font-semibold">{account?.name}</span> ({account?.id})?
      </p>
    </Modal>
  );
};

export default ConfirmStatusDialog;
