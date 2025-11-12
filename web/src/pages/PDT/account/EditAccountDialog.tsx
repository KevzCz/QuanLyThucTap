import React, { useEffect, useState, useCallback } from "react";
import Modal from "../../../util/Modal";
import type { Account, Role, Status } from "./AccountTypes";
import { roleLabel } from "./AccountTypes";
import { useToast } from "../../../components/UI/Toast";
import LoadingButton from "../../../components/UI/LoadingButton";
import { useFormValidation } from "../../../hooks/useFormValidation";
import { ValidatedInput } from "../../../components/UI/ValidatedInput";
import { apiClient } from "../../../utils/api";

interface Props {
  open: boolean;
  onClose: () => void;
  account?: Account;
  onSave: (acc: Account & { password?: string }) => void;
}

const EditAccountDialog: React.FC<Props> = ({ open, onClose, account, onSave }) => {
  const { showWarning } = useToast();
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("phong-dao-tao");
  const [status, setStatus] = useState<Status>("open");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Role-specific fields
  const [khoa, setKhoa] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  
  // Khoa list
  const [khoaList, setKhoaList] = useState<string[]>([]);
  const [loadingKhoa, setLoadingKhoa] = useState(false);

  const { validate, validateAll, getFieldError, setFieldTouched, clearErrors } = useFormValidation({
    name: {
      required: 'Vui lòng nhập tên',
      minLength: { value: 2, message: 'Tên phải có ít nhất 2 ký tự' }
    },
    email: {
      required: 'Vui lòng nhập email',
      email: 'Email không hợp lệ'
    },
    password: {
      minLength: { value: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự' }
    }
  });

  const fetchKhoaList = useCallback(async () => {
    setLoadingKhoa(true);
    try {
      const response = await apiClient.getKhoaList();
      setKhoaList(response || []);
    } catch (error) {
      console.error('Failed to fetch khoa:', error);
      setKhoaList([]);
    } finally {
      setLoadingKhoa(false);
    }
  }, []);

  useEffect(() => {
    if (account) {
      setName(account.name ?? "");
      setRole(account.role);
      setStatus(account.status);
      setEmail(account.email ?? "");
      setPassword("");
      setKhoa(account.khoa ?? "");
      setYear(account.year ?? new Date().getFullYear());
      clearErrors();
    }
  }, [account, open, clearErrors]);

  // Fetch khoa list when dialog opens and role requires khoa (but not for BCN)
  useEffect(() => {
    if (open && account && (account.role === "sinh-vien" || account.role === "giang-vien")) {
      fetchKhoaList();
    }
  }, [open, account, fetchKhoaList]);

  const submit = async () => {
    if (!account) return;
    
    // Validate required fields
    const isValid = validateAll({ name, email, password });
    if (!isValid) {
      showWarning("Vui lòng kiểm tra lại thông tin nhập vào");
      return;
    }

    // Validate khoa for specific roles
    if ((role === "ban-chu-nhiem" || role === "giang-vien" || role === "sinh-vien") && !khoa.trim()) {
      showWarning("Vui lòng nhập khoa cho vai trò này");
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
        updates.password = password;
      }

      // Add role-specific fields
      if (role === "sinh-vien") {
        updates.khoa = khoa.trim();
        updates.year = year;
      } else if (role === "giang-vien") {
        updates.khoa = khoa.trim();
      } else if (role === "ban-chu-nhiem") {
        updates.khoa = khoa.trim();
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
            className="h-10 px-4 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all font-medium" 
            onClick={onClose}
            disabled={isSubmitting}
          >
            Hủy
          </button>
          <LoadingButton
            onClick={submit}
            loading={isSubmitting}
            variant="primary"
            className="shadow-sm hover:shadow"
          >
            Lưu
          </LoadingButton>
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
            <ValidatedInput
              value={name} 
              onChange={e => {
                setName(e.target.value);
                validate('name', e.target.value, { name, email, password });
              }}
              onBlur={() => setFieldTouched('name')}
              error={getFieldError('name')}
              disabled={isSubmitting}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vai trò <span className="text-red-500">*</span>
              </label>
              <select 
                className="w-full h-11 rounded-lg border border-gray-200 px-3 bg-gray-50 cursor-not-allowed" 
                value={role} 
                onChange={e => setRole(e.target.value as Role)}
                disabled={true}
              >
                {Object.entries(roleLabel).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Không thể thay đổi vai trò sau khi tạo tài khoản
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <ValidatedInput
                type="email"
                value={email} 
                onChange={e => {
                  setEmail(e.target.value);
                  validate('email', e.target.value, { name, email, password });
                }}
                onBlur={() => setFieldTouched('email')}
                error={getFieldError('email')}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Đặt lại mật khẩu (tuỳ chọn)
            </label>
            <ValidatedInput
              type="password" 
              value={password} 
              onChange={e => {
                setPassword(e.target.value);
                validate('password', e.target.value, { name, email, password });
              }}
              onBlur={() => setFieldTouched('password')}
              error={getFieldError('password')}
              placeholder="Để trống nếu không đổi mật khẩu"
              disabled={isSubmitting}
            />
            {password && (
              <p className="mt-1 text-xs text-gray-500">
                Mật khẩu mới phải có ít nhất 6 ký tự
              </p>
            )}
          </div>

          {/* Role-specific fields */}
          {(role === "ban-chu-nhiem" || role === "giang-vien" || role === "sinh-vien") && (
            <div className="border-t pt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Thông tin bổ sung</h3>
              
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Khoa <span className="text-red-500">*</span>
                  </label>
                  {role === "ban-chu-nhiem" ? (
                    <>
                      <input
                        type="text"
                        className="w-full h-11 rounded-lg border border-gray-300 px-3"
                        placeholder="VD: Công nghệ thông tin"
                        value={khoa}
                        onChange={(e) => setKhoa(e.target.value)}
                        disabled={isSubmitting}
                      />
                      <p className="text-xs text-gray-500 mt-1">Mỗi khoa chỉ có một Ban Chủ Nhiệm</p>
                    </>
                  ) : (
                    <>
                      <select
                        className="w-full h-11 rounded-lg border border-gray-300 px-3"
                        value={khoa}
                        onChange={(e) => setKhoa(e.target.value)}
                        disabled={isSubmitting || loadingKhoa}
                      >
                        <option value="">-- Chọn khoa --</option>
                        {khoaList.map((k) => (
                          <option key={k} value={k}>
                            {k}
                          </option>
                        ))}
                      </select>
                      {loadingKhoa && (
                        <p className="text-xs text-gray-500 mt-1">Đang tải danh sách khoa...</p>
                      )}
                      {!loadingKhoa && khoaList.length === 0 && (
                        <p className="text-xs text-amber-600 mt-1">Chưa có khoa nào. Vui lòng tạo Ban Chủ Nhiệm trước.</p>
                      )}
                    </>
                  )}
                </div>
                
                {role === "sinh-vien" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Năm học</label>
                    <input
                      type="number"
                      className="w-full h-11 rounded-lg border border-gray-300 px-3"
                      value={year}
                      onChange={(e) => setYear(parseInt(e.target.value) || new Date().getFullYear())}
                      min={2000}
                      max={2100}
                      disabled={isSubmitting}
                    />
                  </div>
                )}
                
                {role === "giang-vien" && account.maxStudents !== undefined && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Số sinh viên tối đa:</span> {account.maxStudents} sinh viên
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Được tính tự động dựa trên tổng số sinh viên và giảng viên trong khoa
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};

export default EditAccountDialog;
