import React, { useEffect, useState } from "react";
import Modal from "../../../util/Modal";
import type { InternshipSubject, InternshipStatus } from "./InternshipSubjectTypes";
import { apiClient } from "../../../utils/api";
import LoadingButton from "../../../components/UI/LoadingButton";
import { useFormValidation } from "../../../hooks/useFormValidation";
import { ValidatedInput } from "../../../components/UI/ValidatedInput";
import { useToast } from "../../../components/UI/Toast";

interface Props {
  open: boolean;
  onClose: () => void;
  internshipSubject?: InternshipSubject;
  onSave: (data: InternshipSubject) => void;
}

const EditInternshipSubjectDialog: React.FC<Props> = ({ open, onClose, internshipSubject, onSave }) => {
  const { showSuccess, showError } = useToast();
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<InternshipStatus>("open");
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
    }
  });

  useEffect(() => {
    if (internshipSubject && open) {
      setTitle(internshipSubject.title);
      setStatus(internshipSubject.status);
      setMaxStudents(internshipSubject.maxStudents);
      setManagerId(internshipSubject.manager.id);
      setError("");
      clearErrors();
      loadManagers();
    }
  }, [internshipSubject, open, clearErrors]);

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
    if (!internshipSubject) return;
    
    // Validate all fields
    const isValid = validateAll({ title, maxStudents });
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
      
      const response = await apiClient.updateInternshipSubject(internshipSubject.id, {
        title: title.trim(),
        maxStudents,
        managerId,
        status
      });

      onSave({
        ...internshipSubject,
        ...response.subject
      });
      showSuccess("Đã cập nhật môn thực tập thành công");
      onClose();
    } catch (err: Error | unknown) {
      console.error("Error updating internship subject:", err);
      const errorMessage = err instanceof Error ? err.message : "Có lỗi xảy ra khi cập nhật môn thực tập";
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Include current manager in the list if not already present
  const allManagers = internshipSubject ? [
    ...managers,
    ...(!managers.some(m => m.id === internshipSubject.manager.id) ? [internshipSubject.manager] : [])
  ] : managers;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Sửa môn thực tập"
      widthClass="max-w-2xl"
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
            loadingText="Đang lưu..."
            disabled={!title.trim() || !managerId}
            variant="primary"
            className="bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500 disabled:bg-emerald-300 shadow-sm hover:shadow"
          >
            Lưu
          </LoadingButton>
        </>
      }
    >
      {!internshipSubject ? (
        <div className="text-gray-500">Không tìm thấy môn thực tập.</div>
      ) : (
        <div className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mã môn</label>
              <input 
                disabled 
                className="w-full h-11 rounded-lg border border-gray-200 px-3 bg-gray-50 text-gray-500" 
                value={internshipSubject.id} 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
              <select
                className="w-full h-11 rounded-lg border border-gray-300 px-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={status}
                onChange={(e) => setStatus(e.target.value as InternshipStatus)}
                disabled={loading}
              >
                <option value="open">Mở</option>
                <option value="locked">Khóa</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tên môn thực tập <span className="text-red-500">*</span>
            </label>
            <ValidatedInput
              value={title} 
              onChange={(e) => {
                setTitle(e.target.value);
                validate('title', e.target.value, { title, maxStudents });
              }}
              onBlur={() => setFieldTouched('title')}
              error={getFieldError('title')}
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  validate('maxStudents', value, { title, maxStudents: value });
                }}
                onBlur={() => setFieldTouched('maxStudents')}
                error={getFieldError('maxStudents')}
                disabled={loading}
              />
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
                {allManagers.map((manager) => (
                  <option key={manager.id} value={manager.id}>
                    {manager.name} ({manager.id})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default EditInternshipSubjectDialog;
