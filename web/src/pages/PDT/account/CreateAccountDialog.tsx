import React, { useState, useEffect, useCallback } from "react";
import Modal from "../../../util/Modal";
import type { Role, Status, Account } from "./AccountTypes";
import { roleLabel } from "./AccountTypes";
import { useToast } from "../../../components/UI/Toast";
import LoadingButton from "../../../components/UI/LoadingButton";
import { useFormValidation } from "../../../hooks/useFormValidation";
import { ValidatedInput } from "../../../components/UI/ValidatedInput";
import { apiClient, type HocKy } from "../../../utils/api";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreate: (acc: Omit<Account, 'id'> & { password: string; hocKyId?: string }) => void;
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
  
  // Role-specific fields
  const [khoa, setKhoa] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [hocKyId, setHocKyId] = useState("");
  
  // Học kỳ list
  const [hocKyList, setHocKyList] = useState<HocKy[]>([]);
  const [loadingHocKy, setLoadingHocKy] = useState(false);
  
  // Khoa list
  const [khoaList, setKhoaList] = useState<string[]>([]);
  const [loadingKhoa, setLoadingKhoa] = useState(false);

  const fetchHocKyList = useCallback(async () => {
    setLoadingHocKy(true);
    try {
      const response = await apiClient.getHocKyList();
      setHocKyList(response || []);
    } catch (error) {
      console.error('Failed to fetch học kỳ:', error);
      showWarning('Không thể tải danh sách học kỳ');
      setHocKyList([]);
    } finally {
      setLoadingHocKy(false);
    }
  }, [showWarning]);

  const fetchKhoaList = useCallback(async () => {
    setLoadingKhoa(true);
    try {
      const response = await apiClient.getKhoaList();
      setKhoaList(response || []);
    } catch (error) {
      console.error('Failed to fetch khoa:', error);
      showWarning('Không thể tải danh sách khoa');
      setKhoaList([]);
    } finally {
      setLoadingKhoa(false);
    }
  }, [showWarning]);

  // Fetch học kỳ list when dialog opens and role is sinh-vien
  useEffect(() => {
    if (open && role === "sinh-vien") {
      fetchHocKyList();
    }
  }, [open, role, fetchHocKyList]);

  // Fetch khoa list when dialog opens and role requires khoa
  useEffect(() => {
    if (open && (role === "sinh-vien" || role === "giang-vien" || role === "ban-chu-nhiem")) {
      fetchKhoaList();
    }
  }, [open, role, fetchKhoaList]);

  const { validate, validateAll, getFieldError, hasError, setFieldTouched, clearErrors } = useFormValidation({
    name: {
      required: 'Vui lòng nhập tên',
      minLength: { value: 2, message: 'Tên phải có ít nhất 2 ký tự' }
    },
    email: {
      required: 'Vui lòng nhập email',
      email: 'Email không hợp lệ'
    },
    password: {
      required: 'Vui lòng nhập mật khẩu',
      minLength: { value: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự' }
    },
    confirmPassword: {
      required: 'Vui lòng xác nhận mật khẩu',
      match: { field: 'password', message: 'Mật khẩu xác nhận không khớp' }
    }
  });

  const reset = () => {
    setName("");
    setEmail("");
    setRole("phong-dao-tao");
    setStatus("open");
    setPassword("");
    setConfirmPassword("");
    setKhoa("");
    setYear(new Date().getFullYear());
    setHocKyId("");
    setIsSubmitting(false);
    clearErrors();
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const submit = async () => {
    // Validate all fields
    const isValid = validateAll({ name, email, password, confirmPassword });
    if (!isValid) {
      showWarning("Vui lòng kiểm tra lại thông tin nhập vào");
      return;
    }

    // Validate khoa for specific roles
    if ((role === "ban-chu-nhiem" || role === "giang-vien" || role === "sinh-vien") && !khoa.trim()) {
      showWarning("Vui lòng nhập khoa cho vai trò này");
      return;
    }

    // Validate học kỳ for sinh viên (required)
    if (role === "sinh-vien" && !hocKyId) {
      showWarning("Vui lòng chọn học kỳ cho sinh viên");
      return;
    }

    setIsSubmitting(true);
    try {
      const accountData: Omit<Account, 'id'> & { password: string; hocKyId?: string } = { 
        name: name.trim(), 
        email: email.trim(), 
        role, 
        status, 
        password 
      };

      // Add role-specific fields
      if (role === "sinh-vien") {
        accountData.khoa = khoa.trim();
        accountData.year = year;
        if (hocKyId) {
          accountData.hocKyId = hocKyId;
        }
      } else if (role === "giang-vien") {
        accountData.khoa = khoa.trim();
      } else if (role === "ban-chu-nhiem") {
        accountData.khoa = khoa.trim();
      }

      await onCreate(accountData);
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
        <ValidatedInput
          label="Tên"
          placeholder="VD: Nguyễn Văn A"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            validate('name', e.target.value, { name: e.target.value, email, password, confirmPassword });
          }}
          onBlur={() => {
            setFieldTouched('name');
            validate('name', name, { name, email, password, confirmPassword });
          }}
          error={getFieldError('name')}
          touched={hasError('name')}
          required
          disabled={isSubmitting}
        />
        
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
        
        <ValidatedInput
          label="Email"
          type="email"
          placeholder="name@gmail.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            validate('email', e.target.value, { name, email: e.target.value, password, confirmPassword });
          }}
          onBlur={() => {
            setFieldTouched('email');
            validate('email', email, { name, email, password, confirmPassword });
          }}
          error={getFieldError('email')}
          touched={hasError('email')}
          required
          disabled={isSubmitting}
        />
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ValidatedInput
            label="Mật khẩu"
            type="password"
            placeholder="Tối thiểu 6 ký tự"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              validate('password', e.target.value, { name, email, password: e.target.value, confirmPassword });
            }}
            onBlur={() => {
              setFieldTouched('password');
              validate('password', password, { name, email, password, confirmPassword });
            }}
            error={getFieldError('password')}
            touched={hasError('password')}
            required
            disabled={isSubmitting}
            helpText="Tối thiểu 6 ký tự"
          />
          <ValidatedInput
            label="Xác nhận mật khẩu"
            type="password"
            placeholder="Nhập lại mật khẩu"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              validate('confirmPassword', e.target.value, { name, email, password, confirmPassword: e.target.value });
            }}
            onBlur={() => {
              setFieldTouched('confirmPassword');
              validate('confirmPassword', confirmPassword, { name, email, password, confirmPassword });
            }}
            error={getFieldError('confirmPassword')}
            touched={hasError('confirmPassword')}
            required
            disabled={isSubmitting}
          />
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
                  <ValidatedInput
                    placeholder="VD: Công nghệ thông tin"
                    value={khoa}
                    onChange={(e) => setKhoa(e.target.value)}
                    required
                    disabled={isSubmitting}
                  />
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
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Năm học <span className="text-red-500">*</span>
                    </label>
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
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Học kỳ <span className="text-red-500">*</span>
                    </label>
                    <select
                      className="w-full h-11 rounded-lg border border-gray-300 px-3"
                      value={hocKyId}
                      onChange={(e) => setHocKyId(e.target.value)}
                      disabled={isSubmitting || loadingHocKy}
                    >
                      <option value="">-- Không chọn học kỳ --</option>
                      {hocKyList.map((hk) => (
                        <option key={hk.id} value={hk.id}>
                          Học kỳ {hk.hocKyNumber} - {hk.namHoc} ({new Date(hk.durationStart).toLocaleDateString('vi-VN')} - {new Date(hk.durationEnd).toLocaleDateString('vi-VN')})
                        </option>
                      ))}
                    </select>
                    {loadingHocKy && (
                      <p className="text-xs text-gray-500 mt-1">Đang tải danh sách học kỳ...</p>
                    )}
                    {!loadingHocKy && hocKyList.length === 0 && (
                      <p className="text-xs text-amber-600 mt-1">Chưa có học kỳ nào được tạo</p>
                    )}
                    {hocKyId && (
                      <p className="text-xs text-gray-500 mt-1">Sinh viên sẽ được tự động thêm vào học kỳ này</p>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
        
        <div className="text-xs text-gray-500">
          <span className="text-red-500">*</span> Các trường bắt buộc
        </div>
      </div>
    </Modal>
  );
};

export default CreateAccountDialog;
