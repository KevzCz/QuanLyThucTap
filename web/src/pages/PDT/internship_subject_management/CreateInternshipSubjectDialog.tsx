import React, { useState, useEffect, useCallback } from "react";
import Modal from "../../../util/Modal";
import type { InternshipSubject } from "./InternshipSubjectTypes";
import { apiClient } from "../../../utils/api";
import LoadingButton from "../../../components/UI/LoadingButton";
import { useFormValidation } from "../../../hooks/useFormValidation";
import { ValidatedInput, ValidatedTextarea } from "../../../components/UI/ValidatedInput";
import { useToast } from "../../../components/UI/Toast";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreate: (data: InternshipSubject) => void;
}

const CreateInternshipSubjectDialog: React.FC<Props> = ({ open, onClose, onCreate }) => {
  const { showSuccess, showError } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("8 tuần");
  const [registrationStartDate, setRegistrationStartDate] = useState("");
  const [registrationEndDate, setRegistrationEndDate] = useState("");
  const [maxStudents, setMaxStudents] = useState<number>(50);
  const [managerId, setManagerId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [managers, setManagers] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [loadingManagers, setLoadingManagers] = useState(false);

  const { validate, validateAll, getFieldError, setFieldTouched, clearErrors } = useFormValidation({
    title: {
      required: 'Vui lòng nhập tên môn thực tập',
      minLength: { value: 3, message: 'Tên môn thực tập phải có ít nhất 3 ký tự' }
    },
    maxStudents: {
      required: 'Vui lòng nhập số lượng sinh viên tối đa',
      min: { value: 1, message: 'Số lượng sinh viên phải lớn hơn 0' },
      max: { value: 100, message: 'Số lượng sinh viên không được quá 100' }
    },
    registrationStartDate: {
      required: 'Vui lòng chọn ngày bắt đầu đăng ký'
    },
    registrationEndDate: {
      required: 'Vui lòng chọn ngày kết thúc đăng ký',
      custom: (value, formData) => {
        if (!value || !formData.registrationStartDate) return '';
        const start = new Date(formData.registrationStartDate as string);
        const end = new Date(value as string);
        if (end <= start) {
          return 'Ngày kết thúc phải sau ngày bắt đầu đăng ký';
        }
        return '';
      }
    }
  });

  const resetForm = useCallback(() => {
    setTitle("");
    setDescription("");
    setDuration("8 tuần");
    setMaxStudents(50);
    setManagerId("");
    setError("");
    clearErrors();
    
    // Set default dates
    const now = new Date();
    const regStart = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    const regEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    setRegistrationStartDate(regStart.toISOString().split('T')[0]);
    setRegistrationEndDate(regEnd.toISOString().split('T')[0]);
  }, [clearErrors]);

  // Load available managers when dialog opens
  useEffect(() => {
    if (open) {
      loadManagers();
      resetForm();
    }
  }, [open, resetForm]);

  const loadManagers = async () => {
    try {
      setLoadingManagers(true);
      const response = await apiClient.getAvailableManagers();
      setManagers(response.managers);
    } catch (err) {
      console.error("Error loading managers:", err);
      const errorMessage = "Không thể tải danh sách ban chủ nhiệm";
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setLoadingManagers(false);
    }
  };

  const submit = async () => {
    // Validate all fields
    const isValid = validateAll({ title, maxStudents, registrationStartDate, registrationEndDate });
    if (!isValid) {
      setError("Vui lòng kiểm tra lại thông tin nhập vào");
      return;
    }

    if (!managerId) {
      setError("Vui lòng chọn ban chủ nhiệm");
      return;
    }

    try {
      setLoading(true);
      setError("");
      
      const response = await apiClient.createInternshipSubject({
        title: title.trim(),
        description: description.trim() || undefined,
        duration,
        registrationStartDate,
        registrationEndDate,
        maxStudents,
        managerId
      });

      onCreate({
        ...response.subject,
        duration,
        registrationStartDate,
        registrationEndDate,
        maxStudents
      });
      showSuccess("Đã thêm môn thực tập thành công");
      onClose();
    } catch (err: Error | unknown) {
      console.error("Error creating internship subject:", err);
      const errorMessage = err instanceof Error ? err.message : "Có lỗi xảy ra khi tạo môn thực tập";
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Thêm môn thực tập"
      widthClass="max-w-4xl"
      actions={
        <>
          <button 
            className="h-10 px-4 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all font-medium disabled:opacity-50" 
            onClick={onClose}
            disabled={loading}
          >
            Hủy
          </button>
          <LoadingButton
            onClick={submit}
            loading={loading}
            loadingText="Đang tạo..."
            disabled={!title.trim() || !managerId}
            variant="primary"
            className="bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500 disabled:bg-emerald-300 shadow-sm hover:shadow"
          >
            Thêm
          </LoadingButton>
        </>
      }
    >
      <div className="space-y-6">
        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Basic Info */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Thông tin cơ bản</h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tên môn thực tập <span className="text-red-500">*</span>
            </label>
            <ValidatedInput
              placeholder="VD: Thực tập Phát triển Web"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                validate('title', e.target.value, { title, maxStudents, registrationStartDate, registrationEndDate });
              }}
              onBlur={() => setFieldTouched('title')}
              error={getFieldError('title')}
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
            <ValidatedTextarea
              placeholder="Mô tả chi tiết về môn thực tập..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Thời lượng</label>
              <input
                className="w-full h-11 rounded-lg border border-gray-300 px-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Số lượng sinh viên tối đa <span className="text-red-500">*</span>
              </label>
              <ValidatedInput
                type="number"
                min={1}
                max={100}
                value={maxStudents.toString()}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 1;
                  setMaxStudents(value);
                  validate('maxStudents', value, { title, maxStudents: value, registrationStartDate, registrationEndDate });
                }}
                onBlur={() => setFieldTouched('maxStudents')}
                error={getFieldError('maxStudents')}
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ban chủ nhiệm <span className="text-red-500">*</span>
            </label>
            <select
              className="w-full h-11 rounded-lg border border-gray-300 px-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={managerId}
              onChange={(e) => setManagerId(e.target.value)}
              disabled={loading || loadingManagers}
            >
              <option value="">
                {loadingManagers ? "Đang tải..." : "Chọn ban chủ nhiệm"}
              </option>
              {managers.map((manager) => (
                <option key={manager.id} value={manager.id}>
                  {manager.name} ({manager.id})
                </option>
              ))}
            </select>
            {managers.length === 0 && !loadingManagers && (
              <p className="text-xs text-amber-600 mt-1">
                Không có ban chủ nhiệm khả dụng
              </p>
            )}
          </div>
        </div>

        {/* Dates */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Thời gian đăng ký</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ngày bắt đầu đăng ký <span className="text-red-500">*</span>
              </label>
              <ValidatedInput
                type="date"
                value={registrationStartDate}
                onChange={(e) => {
                  setRegistrationStartDate(e.target.value);
                  validate('registrationStartDate', e.target.value, { title, maxStudents, registrationStartDate: e.target.value, registrationEndDate });
                  // Re-validate end date when start date changes
                  if (registrationEndDate) {
                    validate('registrationEndDate', registrationEndDate, { title, maxStudents, registrationStartDate: e.target.value, registrationEndDate });
                  }
                }}
                onBlur={() => setFieldTouched('registrationStartDate')}
                error={getFieldError('registrationStartDate')}
                disabled={loading}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ngày kết thúc đăng ký <span className="text-red-500">*</span>
              </label>
              <ValidatedInput
                type="date"
                value={registrationEndDate}
                onChange={(e) => {
                  setRegistrationEndDate(e.target.value);
                  validate('registrationEndDate', e.target.value, { title, maxStudents, registrationStartDate, registrationEndDate: e.target.value });
                }}
                onBlur={() => setFieldTouched('registrationEndDate')}
                error={getFieldError('registrationEndDate')}
                disabled={loading}
              />
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default CreateInternshipSubjectDialog;

              