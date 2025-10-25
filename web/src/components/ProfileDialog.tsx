import React, { useState, useEffect } from 'react';
import Modal from '../util/Modal';
import { useAuth } from '../contexts/UseAuth';
import { useToast } from './UI/Toast';
import { profileAPI, type Profile, type UpdateProfileData } from '../services/profileApi';
import LoadingButton from './UI/LoadingButton';
import { useFormValidation } from '../hooks/useFormValidation';
import { ValidatedInput } from './UI/ValidatedInput';
import dayjs from 'dayjs';

interface Props {
  open: boolean;
  onClose: () => void;
}

const ProfileDialog: React.FC<Props> = ({ open, onClose }) => {
  const { user, updateUser } = useAuth();
  const { showSuccess, showError } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [personalEmail, setPersonalEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [bio, setBio] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswordSection, setShowPasswordSection] = useState(false);

  const { validate, validateAll, getFieldError, setFieldTouched, clearErrors } = useFormValidation({
    name: {
      required: 'Vui lòng nhập họ tên',
      minLength: { value: 2, message: 'Họ tên phải có ít nhất 2 ký tự' }
    },
    email: {
      required: 'Vui lòng nhập email',
      custom: (value) => {
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value as string)) {
          return 'Email không hợp lệ';
        }
        return '';
      }
    },
    personalEmail: {
      custom: (value) => {
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value as string)) {
          return 'Email cá nhân không hợp lệ';
        }
        return '';
      }
    },
    phone: {
      custom: (value) => {
        if (value && !/^[0-9]{10,11}$/.test(value as string)) {
          return 'Số điện thoại phải có 10-11 chữ số';
        }
        return '';
      }
    },
    currentPassword: {
      custom: (value, formData) => {
        if (formData.newPassword && !value) {
          return 'Vui lòng nhập mật khẩu hiện tại';
        }
        return '';
      }
    },
    newPassword: {
      custom: (value) => {
        if (value && (value as string).length < 6) {
          return 'Mật khẩu mới phải có ít nhất 6 ký tự';
        }
        return '';
      }
    },
    confirmPassword: {
      custom: (value, formData) => {
        if (formData.newPassword && value !== formData.newPassword) {
          return 'Mật khẩu xác nhận không khớp';
        }
        return '';
      }
    }
  });

  useEffect(() => {
    if (open) {
      loadProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await profileAPI.getMyProfile();
      setProfile(response.profile);
      
      // Populate form fields
      setName(response.profile.account.name);
      setEmail(response.profile.account.email);
      setPersonalEmail(response.profile.personalEmail || '');
      setPhone(response.profile.phone || '');
      setAddress(response.profile.address || '');
      setDateOfBirth(response.profile.dateOfBirth ? dayjs(response.profile.dateOfBirth).format('YYYY-MM-DD') : '');
      setBio(response.profile.bio || '');
      
      clearErrors();
    } catch (error) {
      console.error('Failed to load profile:', error);
      showError('Không thể tải thông tin cá nhân');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const formData: Record<string, string> = {
      name,
      email,
      personalEmail,
      phone,
      currentPassword,
      newPassword,
      confirmPassword
    };

    const isValid = validateAll(formData);
    if (!isValid) {
      showError('Vui lòng kiểm tra lại thông tin nhập vào');
      return;
    }

    try {
      setSaving(true);
      
      const updateData: UpdateProfileData = {
        name,
        email,
        personalEmail,
        phone,
        address,
        dateOfBirth: dateOfBirth || undefined,
        bio
      };

      // Include password change if provided
      if (newPassword && currentPassword) {
        updateData.currentPassword = currentPassword;
        updateData.newPassword = newPassword;
      }

      const response = await profileAPI.updateMyProfile(updateData);
      
      // Update auth context with new name/email
      if (user) {
        updateUser({
          ...user,
          name: response.profile.account.name,
          email: response.profile.account.email
        });
      }
      
      showSuccess(response.message || 'Cập nhật thông tin thành công');
      
      // Reset password fields
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordSection(false);
      
      onClose();
    } catch (error: unknown) {
      console.error('Failed to update profile:', error);
      const errorMessage = error instanceof Error ? error.message : 'Không thể cập nhật thông tin';
      showError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    clearErrors();
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowPasswordSection(false);
    onClose();
  };

  const getRoleName = (role: string) => {
    const roleMap: Record<string, string> = {
      'phong-dao-tao': 'Phòng Đào Tạo',
      'ban-chu-nhiem': 'Ban Chủ Nhiệm',
      'giang-vien': 'Giảng viên',
      'sinh-vien': 'Sinh viên'
    };
    return roleMap[role] || role;
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Thông tin cá nhân"
      widthClass="max-w-2xl"
      actions={
        <>
          <button
            onClick={handleClose}
            disabled={saving}
            className="h-10 px-4 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Hủy
          </button>
          <LoadingButton
            onClick={handleSave}
            loading={saving}
            loadingText="Đang lưu..."
            variant="primary"
            className="bg-blue-600 hover:bg-blue-700"
          >
            Lưu thay đổi
          </LoadingButton>
        </>
      }
    >
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Role Badge */}
          {profile && (
            <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center text-xl font-bold">
                {name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="font-medium text-gray-900">{profile.account.id}</div>
                <div className="text-sm text-blue-700">{getRoleName(profile.account.role)}</div>
              </div>
            </div>
          )}

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Họ tên <span className="text-red-500">*</span>
              </label>
              <ValidatedInput
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  validate('name', e.target.value, { name: e.target.value, email, personalEmail, phone, currentPassword, newPassword, confirmPassword });
                }}
                onBlur={() => setFieldTouched('name')}
                error={getFieldError('name')}
                placeholder="Nhập họ tên"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email <span className="text-red-500">*</span>
              </label>
              <ValidatedInput
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  validate('email', e.target.value, { name, email: e.target.value, personalEmail, phone, currentPassword, newPassword, confirmPassword });
                }}
                onBlur={() => setFieldTouched('email')}
                error={getFieldError('email')}
                placeholder="email@example.com"
              />
              <div className="text-xs text-gray-500 mt-1">Email tổ chức/trường</div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email cá nhân
              </label>
              <ValidatedInput
                type="email"
                value={personalEmail}
                onChange={(e) => {
                  setPersonalEmail(e.target.value);
                  validate('personalEmail', e.target.value, { name, email, personalEmail: e.target.value, phone, currentPassword, newPassword, confirmPassword });
                }}
                onBlur={() => setFieldTouched('personalEmail')}
                error={getFieldError('personalEmail')}
                placeholder="your@email.com"
              />
              <div className="text-xs text-gray-500 mt-1">Email liên hệ cá nhân</div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Số điện thoại
              </label>
              <ValidatedInput
                type="text"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  validate('phone', e.target.value, { name, email, personalEmail, phone: e.target.value, currentPassword, newPassword, confirmPassword });
                }}
                onBlur={() => setFieldTouched('phone')}
                error={getFieldError('phone')}
                placeholder="0123456789"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ngày sinh
              </label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="w-full h-11 rounded-lg border border-gray-300 px-3 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Địa chỉ
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full h-11 rounded-lg border border-gray-300 px-3 focus:ring-2 focus:ring-blue-500"
              placeholder="Nhập địa chỉ"
            />
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Giới thiệu
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              maxLength={500}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Giới thiệu ngắn về bản thân..."
            />
            <div className="text-xs text-gray-500 mt-1 text-right">
              {bio.length}/500 ký tự
            </div>
          </div>

          {/* Password Change Section */}
          <div className="border-t pt-6">
            <button
              onClick={() => setShowPasswordSection(!showPasswordSection)}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              {showPasswordSection ? 'Ẩn đổi mật khẩu' : 'Đổi mật khẩu'}
            </button>

            {showPasswordSection && (
              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mật khẩu hiện tại <span className="text-red-500">*</span>
                  </label>
                  <ValidatedInput
                    type="password"
                    value={currentPassword}
                    onChange={(e) => {
                      setCurrentPassword(e.target.value);
                      validate('currentPassword', e.target.value, { name, email, personalEmail, phone, currentPassword: e.target.value, newPassword, confirmPassword });
                    }}
                    onBlur={() => setFieldTouched('currentPassword')}
                    error={getFieldError('currentPassword')}
                    placeholder="Nhập mật khẩu hiện tại"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mật khẩu mới <span className="text-red-500">*</span>
                  </label>
                  <ValidatedInput
                    type="password"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      validate('newPassword', e.target.value, { name, email, personalEmail, phone, currentPassword, newPassword: e.target.value, confirmPassword });
                      if (confirmPassword) {
                        validate('confirmPassword', confirmPassword, { name, email, personalEmail, phone, currentPassword, newPassword: e.target.value, confirmPassword });
                      }
                    }}
                    onBlur={() => setFieldTouched('newPassword')}
                    error={getFieldError('newPassword')}
                    placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Xác nhận mật khẩu mới <span className="text-red-500">*</span>
                  </label>
                  <ValidatedInput
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      validate('confirmPassword', e.target.value, { name, email, personalEmail, phone, currentPassword, newPassword, confirmPassword: e.target.value });
                    }}
                    onBlur={() => setFieldTouched('confirmPassword')}
                    error={getFieldError('confirmPassword')}
                    placeholder="Nhập lại mật khẩu mới"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
};

export default ProfileDialog;
