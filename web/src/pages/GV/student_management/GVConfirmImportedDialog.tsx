import React, { useEffect, useState } from "react";
import Modal from "../../../util/Modal";
import Pagination from "../../../components/UI/Pagination";

interface RowLite { id: string; name: string }

interface Props {
  open: boolean;
  onClose: () => void;
  advisorName: string;
  rows: RowLite[];
  onConfirm: (rows: RowLite[]) => void;
}

const GVConfirmImportedDialog: React.FC<Props> = ({ open, onClose, advisorName, rows, onConfirm }) => {
  const [page, setPage] = useState(1);
  const pageSize = 8;
  useEffect(() => setPage(1), [open, rows]);

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = rows.slice((page - 1) * pageSize, page * pageSize);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Xác nhận danh sách gửi yêu cầu"
      widthClass="max-w-xl"
      actions={
        <>
          <button className="h-10 px-4 rounded-md text-rose-600 hover:bg-rose-50" onClick={onClose}>HỦY</button>
          <button className="h-10 px-5 rounded-md bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => onConfirm(rows)}>Gửi yêu cầu</button>
        </>
      }
    >
      <div className="mb-2 text-sm text-gray-700">Giảng viên: <span className="font-medium">{advisorName}</span></div>

      <div className="overflow-hidden rounded-xl border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr className="text-left text-xs font-semibold text-gray-600">
              <th className="px-4 py-3 w-[140px]">Mã</th>
              <th className="px-4 py-3">Tên</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {current.map((r, idx) => (
              <tr key={`${r.id}__${(page - 1) * pageSize + idx}`}>
                <td className="px-4 py-2 font-mono">{r.id}</td>
                <td className="px-4 py-2">{r.name}</td>
              </tr>
            ))}
            {current.length === 0 && (
              <tr><td className="px-4 py-8 text-center text-gray-500" colSpan={2}>Không có dòng nào.</td></tr>
            )}
          </tbody>
        </table>

        <Pagination
          currentPage={page}
          totalPages={pageCount}
          onPageChange={setPage}
        />
      </div>
    </Modal>
  );
};

export default GVConfirmImportedDialog;
