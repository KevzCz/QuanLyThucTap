import React, { useState, useEffect } from "react";
import {
  type Account,
  type Role,
  type Status,
  type CreateAccountDTO,
  type UpdateAccountDTO,
  roleLabel,
  CreateAccountDialog,
  EditAccountDialog,
  ViewAccountDialog,
  DeleteAccountDialog,
  ConfirmStatusAccountDialog
} from "../index";
import { apiClient } from "../../../utils/api";
import { useToast } from "../../../components/UI/Toast";
import Pagination from "../../../components/UI/Pagination";

const statusChip = (s: Status) =>
  s === "open" ? (
    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
      Mở
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700 ring-1 ring-inset ring-rose-200">
      Khóa
    </span>
  );

const IconBtn: React.FC<
  React.PropsWithChildren<{ className?: string; title?: string; onClick?: () => void }>
> = ({ className = "", title, onClick, children }) => (
  <button
    type="button"
    title={title}
    onClick={onClick}
    className={`inline-flex h-7 w-7 items-center justify-center rounded-md text-white shadow ${className}`}
  >
    {children}
  </button>
);

/* --- Page --- */
const AccountManagement: React.FC = () => {
  const { showSuccess, showError } = useToast();
  
  // table/filter state
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | Status>("all");
  const [role, setRole] = useState<"all" | Role>("all");
  const [rows, setRows] = useState<Account[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pageSize = 10;

  // dialogs state
  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [openView, setOpenView] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const [selected, setSelected] = useState<Account | undefined>(undefined);

  // lock/unlock confirm
  const [openConfirmStatus, setOpenConfirmStatus] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<Status>("open");

  // Fetch accounts from API
  const fetchAccounts = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: {
        page: number;
        limit: number;
        status?: Status;
        role?: Role;
        search?: string;
      } = {
        page,
        limit: pageSize
      };
      
      if (status !== "all") params.status = status;
      if (role !== "all") params.role = role;
      if (query.trim()) params.search = query.trim();

      const response = await apiClient.getAccounts(params);
      
      setRows(response.accounts);
      setTotalPages(response.pagination.pages);
      
      // Reset to last available page if current page is out of bounds
      if (page > response.pagination.pages && response.pagination.pages > 0) {
        setPage(response.pagination.pages);
      }
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
      const errorMessage = error instanceof Error ? error.message : 'Không thể tải danh sách tài khoản';
      setError(errorMessage);
      showError(errorMessage);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch accounts when filters change
  useEffect(() => {
    fetchAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status, role, query]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [status, role, query]);

// dialog handlers
const onCreate = async (acc: Omit<Account, 'id'> & { password: string }) => {
  try {
    if (!acc.email) {
      throw new Error("Email is required");
    }
    const accountData: CreateAccountDTO = {
      name: acc.name,
      email: acc.email,
      role: acc.role,
      status: acc.status,
      password: acc.password
    };
    await apiClient.createAccount(accountData);
    setOpenCreate(false);
    showSuccess("Tài khoản đã được tạo thành công");
    await fetchAccounts(); // Refresh list
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Không thể tạo tài khoản";
    showError(msg);
    throw error;
  }
};

  const onSave = async (acc: Account & { password?: string }) => {
  try {
    if (!acc.email) {
      throw new Error("Email is required");
    }
    const updates: UpdateAccountDTO = {
      name: acc.name,
      email: acc.email,
      role: acc.role,
      status: acc.status,
      ...(acc.password ? { password: acc.password } : {})
    };
    await apiClient.updateAccount(acc.id, updates);
    setOpenEdit(false);
    showSuccess("Tài khoản đã được cập nhật thành công");
    await fetchAccounts(); // Refresh list
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Không thể cập nhật tài khoản";
    showError(msg);
    throw error;
  }
};

  const onDelete = async () => {
    if (!selected) return;
    
    try {
      await apiClient.deleteAccount(selected.id);
      setOpenDelete(false);
      showSuccess("Tài khoản đã được xóa thành công");
      await fetchAccounts(); // Refresh list
    } catch (error) {
      console.error('Failed to delete account:', error);
      const errorMessage = error instanceof Error ? error.message : 'Không thể xóa tài khoản';
      showError(errorMessage);
    }
  };

  const requestToggleStatus = (acc: Account) => {
    setSelected(acc);
    setPendingStatus(acc.status === "open" ? "locked" : "open");
    setOpenConfirmStatus(true);
  };

  const confirmToggleStatus = async (id: string, next: Status) => {
    try {
      await apiClient.updateAccount(id, { status: next });
      setOpenConfirmStatus(false);
      showSuccess(`Trạng thái tài khoản đã được ${next === "open" ? "mở" : "khóa"}`);
      await fetchAccounts(); // Refresh list
    } catch (error) {
      console.error('Failed to update status:', error);
      const errorMessage = error instanceof Error ? error.message : 'Không thể cập nhật trạng thái';
      showError(errorMessage);
    }
  };

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-col gap-3">
        {/* Search bar - full width on mobile */}
        <div className="relative w-full sm:w-auto">
          <span className="absolute inset-y-0 left-3 flex items-center text-gray-400">
            <svg viewBox="0 0 24 24" className="h-4 w-4">
              <path
                fill="currentColor"
                d="M10 2a8 8 0 1 1-5.3 13.9l-3.4 3.4 1.4 1.4 3.4-3.4A8 8 0 0 1 10 2m0 2a6 6 0 1 0 0 12A6 6 0 0 0 10 4z"
              />
            </svg>
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm kiếm tên hoặc id"
            className="w-full sm:w-[320px] h-10 rounded-lg border border-gray-300 bg-white pl-8 pr-3 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Filters row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Status filters */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {(["all", "open", "locked"] as const).map((k) => (
                <button
                  key={k}
                  onClick={() => setStatus(k)}
                  className={`h-9 rounded-md px-3 text-sm border transition whitespace-nowrap ${
                    status === k
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {k === "all" ? "Tất cả" : k === "open" ? "Mở" : "Khóa"}
                </button>
              ))}
            </div>

            {/* Role filter */}
            <select 
              value={role} 
              onChange={(e) => setRole(e.target.value as "all" | Role)}
              className="h-9 rounded-md px-3 text-sm border border-gray-300 bg-white w-full sm:w-auto"
            >
              <option value="all">Tất cả vai trò</option>
              {Object.entries(roleLabel).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          {/* Add button */}
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-cyan-600 px-3 h-10 text-white text-sm hover:bg-cyan-700 touch-manipulation whitespace-nowrap"
            title="Thêm tài khoản"
            onClick={() => setOpenCreate(true)}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 flex-shrink-0">
              <path fill="currentColor" d="M19 11h-6V5h-2v6H5v2h6v6h2v-6h6z" />
            </svg>
            <span>Thêm tài khoản</span>
          </button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-600">{error}</p>
          <button 
            onClick={fetchAccounts}
            className="mt-2 text-sm text-red-700 hover:text-red-800 underline"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr className="text-left text-xs font-semibold text-gray-600">
                <th className="px-3 sm:px-4 py-3 w-[100px] sm:w-[120px]">Mã</th>
                <th className="px-3 sm:px-4 py-3 min-w-[150px]">Tên</th>
                <th className="px-3 sm:px-4 py-3 min-w-[180px] sm:w-[200px]">Email</th>
                <th className="px-3 sm:px-4 py-3 min-w-[140px] sm:w-[180px]">Vai trò</th>
                <th className="px-3 sm:px-4 py-3 w-[100px] sm:w-[140px]">Trạng thái</th>
                <th className="px-3 sm:px-4 py-3 w-[140px] sm:w-[160px]">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-2"></div>
                      Đang tải...
                    </div>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                    Không có tài khoản phù hợp.
                  </td>
                </tr>
              ) : (
                rows.map((acc) => (
                  <tr key={acc.id} className="hover:bg-gray-50/50">
                    <td className="px-3 sm:px-4 py-3 font-mono text-xs sm:text-sm text-gray-700">{acc.id}</td>
                    <td className="px-3 sm:px-4 py-3 text-gray-800">{acc.name}</td>
                    <td className="px-3 sm:px-4 py-3 text-gray-600 text-xs sm:text-sm">{acc.email}</td>
                    <td className="px-3 sm:px-4 py-3 text-gray-700 text-xs sm:text-sm">{roleLabel[acc.role]}</td>
                    <td className="px-3 sm:px-4 py-3">{statusChip(acc.status)}</td>
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-1 sm:gap-2">
                        <IconBtn
                          className="bg-sky-500 hover:bg-sky-600"
                          title="Xem"
                          onClick={() => {
                            setSelected(acc);
                            setOpenView(true);
                          }}
                        >
                          <svg viewBox="0 0 24 24" className="h-4 w-4">
                            <path
                              fill="currentColor"
                              d="M12 5c-7 0-10 7-10 7s3 7 10 7 10-7 10-7-3-7-10-7Zm0 12a5 5 0 1 1 0-10a5 5 0 0 1 0 10Z"
                            />
                          </svg>
                        </IconBtn>

                        <IconBtn
                          className="bg-emerald-500 hover:bg-emerald-600"
                          title="Sửa"
                          onClick={() => {
                            setSelected(acc);
                            setOpenEdit(true);
                          }}
                        >
                          <svg viewBox="0 0 24 24" className="h-4 w-4">
                            <path
                              fill="currentColor"
                              d="M3 17.2V21h3.8l11-11L14 6.2l-11 11ZM20.7 7.04a1 1 0 0 0 0-1.41L18.37 3.3a1 1 0 0 0-1.41 0L15.1 5.16l3.33 3.33l2.27-1.45Z"
                            />
                          </svg>
                        </IconBtn>

                        <IconBtn
                          className={`${
                            acc.status === "open" ? "bg-amber-500 hover:bg-amber-600" : "bg-indigo-500 hover:bg-indigo-600"
                          }`}
                          title={acc.status === "open" ? "Khóa" : "Mở"}
                          onClick={() => requestToggleStatus(acc)}
                        >
                          {acc.status === "open" ? (
                            <svg viewBox="0 0 24 24" className="h-4 w-4">
                              <path
                                fill="currentColor"
                                d="M17 8h-1V6a4 4 0 1 0-8 0v2H7a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2Zm-3 0h-4V6a2 2 0 1 1 4 0v2Z"
                              />
                            </svg>
                          ) : (
                            <svg viewBox="0 0 24 24" className="h-4 w-4">
                              <path
                                fill="currentColor"
                                d="M7 8h10a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2Zm5-6a4 4 0 0 1 4 4h-2a2 2 0 1 0-4 0H8a4 4 0 0 1 4-4Z"
                              />
                            </svg>
                          )}
                        </IconBtn>

                        <IconBtn
                          className="bg-rose-500 hover:bg-rose-600"
                          title="Xóa"
                          onClick={() => {
                            setSelected(acc);
                            setOpenDelete(true);
                          }}
                        >
                          <svg viewBox="0 0 24 24" className="h-4 w-4">
                            <path fill="currentColor" d="M6 7h12v2H6zm2 3h8l-1 10H9L8 10Zm3-7h2l1 2h4v2H6V5h4l1-2Z" />
                          </svg>
                        </IconBtn>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </div>

      {/* Dialogs */}
      <CreateAccountDialog
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        onCreate={onCreate} // <-- onCreate: (data: CreateAccountDTO) => Promise<void>
      />
      <EditAccountDialog open={openEdit} onClose={() => setOpenEdit(false)} account={selected} onSave={onSave} />
      <ViewAccountDialog open={openView} onClose={() => setOpenView(false)} account={selected} />
      <DeleteAccountDialog
        open={openDelete}
        onClose={() => setOpenDelete(false)}
        account={selected}
        onConfirm={onDelete}
      />
      <ConfirmStatusAccountDialog
        open={openConfirmStatus}
        onClose={() => setOpenConfirmStatus(false)}
        account={selected}
        nextStatus={pendingStatus}
        onConfirm={confirmToggleStatus}
      />
    </div>
  );
};

export default AccountManagement;
