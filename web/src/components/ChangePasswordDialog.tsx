import React, { useState } from 'react';
import StandardDialog from './UI/StandardDialog';
import { Icons } from './UI/Icons';
import { useToast } from './UI/Toast';
import { apiClient } from '../utils/api';

interface ChangePasswordDialogProps {
  open: boolean;
  onClose?: () => void;
  isForced?: boolean; // If true, user cannot close dialog
  onSuccess?: () => void;
}

const ChangePasswordDialog: React.FC<ChangePasswordDialogProps> = ({
  open,
  onClose,
  isForced = false,
  onSuccess
}) => {
  const { showSuccess, showError } = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      showError('Vui lòng điền đầy đủ thông tin');
      return;
    }

    if (newPassword.length < 6) {
      showError('Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }

    if (newPassword !== confirmPassword) {
      showError('Mật khẩu xác nhận không khớp');
      return;
    }

    if (currentPassword === newPassword) {
      showError('Mật khẩu mới phải khác mật khẩu hiện tại');
      return;
    }

    try {
      setLoading(true);
      await apiClient.changePassword(currentPassword, newPassword);
      showSuccess('Đổi mật khẩu thành công!');
      
      // Reset form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      if (onSuccess) {
        onSuccess();
      }
      
      if (onClose && !isForced) {
        onClose();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không thể đổi mật khẩu. Vui lòng thử lại.';
      showError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <StandardDialog
      open={open}
      onClose={isForced ? () => {} : (onClose || (() => {}))}
      title={isForced ? '🔒 Bắt buộc đổi mật khẩu' : 'Đổi mật khẩu'}
      size="md"
      primaryAction={{
        label: loading ? 'Đang xử lý...' : 'Đổi mật khẩu',
        onClick: handleSubmit,
        variant: 'primary',
        loading: loading
      }}
      secondaryAction={!isForced && onClose ? {
        label: 'Hủy',
        onClick: onClose
      } : undefined}
    >
      <div className="space-y-4">
        {isForced && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <div className="flex items-start">
              <span className="text-2xl mr-3">⚠️</span>
              <div>
                <h4 className="text-sm font-medium text-yellow-900">Đổi mật khẩu bắt buộc</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  Đây là lần đăng nhập đầu tiên của bạn. Vì lý do bảo mật, bạn phải đổi mật khẩu mặc định trước khi tiếp tục sử dụng hệ thống.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Current Password */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Mật khẩu hiện tại <span className="text-red-500">*</span>
          </label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Nhập mật khẩu hiện tại..."
            autoComplete="current-password"
          />
        </div>

        {/* New Password */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Mật khẩu mới <span className="text-red-500">*</span>
          </label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)..."
            autoComplete="new-password"
          />
          {newPassword && newPassword.length < 6 && (
            <p className="text-xs text-red-600 mt-1">Mật khẩu phải có ít nhất 6 ký tự</p>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Xác nhận mật khẩu mới <span className="text-red-500">*</span>
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Nhập lại mật khẩu mới..."
            autoComplete="new-password"
          />
          {confirmPassword && newPassword !== confirmPassword && (
            <p className="text-xs text-red-600 mt-1">Mật khẩu xác nhận không khớp</p>
          )}
        </div>

        {/* Password Requirements */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <p className="text-xs font-medium text-gray-700 mb-2">Yêu cầu mật khẩu:</p>
          <ul className="text-xs text-gray-600 space-y-1">
            <li className="flex items-center">
              <Icons.check className={`w-3 h-3 mr-2 ${newPassword.length >= 6 ? 'text-green-600' : 'text-gray-400'}`} />
              Tối thiểu 6 ký tự
            </li>
            <li className="flex items-center">
              <Icons.check className={`w-3 h-3 mr-2 ${newPassword && currentPassword !== newPassword ? 'text-green-600' : 'text-gray-400'}`} />
              Khác mật khẩu hiện tại
            </li>
            <li className="flex items-center">
              <Icons.check className={`w-3 h-3 mr-2 ${newPassword && confirmPassword && newPassword === confirmPassword ? 'text-green-600' : 'text-gray-400'}`} />
              Mật khẩu xác nhận khớp
            </li>
          </ul>
        </div>
      </div>
    </StandardDialog>
  );
};

export default ChangePasswordDialog;
