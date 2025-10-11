import React, { useEffect, useState } from "react";
import Modal from "../../../util/Modal";
import type { RequestRow } from "./RequestManagement";

interface Props {
  open: boolean;
  onClose: () => void;
  row?: RequestRow;
  onAccept: () => void;
  onReject: () => void;
}

const ViewRequestDialog: React.FC<Props> = ({ open, onClose, row, onAccept, onReject }) => {
  const [page, setPage] = useState(1);
  const pageSize = 3;

  useEffect(() => setPage(1), [open, row]);

  const students = row?.payload?.students ?? [];
  const pageCount = Math.max(1, Math.ceil(students.length / pageSize));
  const current = students.slice((page - 1) * pageSize, page * pageSize);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Thêm sinh viên vào danh sách giảng viên"
      widthClass="max-w-3xl"
      actions={
        <>
          <button className="h-10 px-4 rounded-md text-rose-600 hover:bg-rose-50" onClick={onReject}>
            Từ chối
          </button>
          <button className="h-10 px-5 rounded-md bg-emerald-600 text-white hover:bg-emerald-700" onClick={onAccept}>
            Chấp nhận
          </button>
        </>
      }
    >
      {!row ? (
        <div className="text-gray-500">Không tìm thấy yêu cầu.</div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ID Giáo viên hướng dẫn</label>
              <input
                disabled
                value={row.payload?.advisorId || ""}
                className="w-full h-11 rounded-lg border border-gray-200 px-3 bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tên giảng viên</label>
              <input
                disabled
                value={row.payload?.advisorName || ""}
                className="w-full h-11 rounded-lg border border-gray-200 px-3 bg-gray-50"
              />
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr className="text-left text-xs font-semibold text-gray-600">
                  <th className="px-4 py-3 w-[120px]">Mã</th>
                  <th className="px-4 py-3">Tên sinh viên</th>
                  <th className="px-4 py-3 w-[260px]">Tên giảng viên hướng dẫn</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {current.map((s, idx) => (
                  <tr key={`${s.id}__${(page - 1) * pageSize + idx}`}>
                    <td className="px-4 py-2 font-mono">{s.id}</td>
                    <td className="px-4 py-2">{s.name}</td>
                    <td className="px-4 py-2">{row.payload?.advisorName || "—"}</td>
                  </tr>
                ))}
                {current.length === 0 && (
                  <tr>
                    <td className="px-4 py-8 text-center text-gray-500" colSpan={3}>
                      Không có dòng nào.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            <div className="flex items-center justify-center gap-2 border-t bg-white px-4 py-3">
              <button
                className="h-8 w-8 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                ‹
              </button>
              <span className="text-sm text-gray-700">
                <span className="font-semibold">{page}</span> / {pageCount}
              </span>
              <button
                className="h-8 w-8 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                disabled={page === pageCount}
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              >
                ›
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default ViewRequestDialog;
