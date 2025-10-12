import React, { useState, useEffect } from "react";
import Modal from "../../../util/Modal";
import type { InternshipSubject } from "./InternshipSubjectTypes";
import { apiClient } from "../../../utils/api";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreate: (data: InternshipSubject) => void;
}

const CreateInternshipSubjectDialog: React.FC<Props> = ({ open, onClose, onCreate }) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("8 tuần");
  const [registrationStartDate, setRegistrationStartDate] = useState("");
  const [registrationEndDate, setRegistrationEndDate] = useState("");
  const [maxStudents, setMaxStudents] = useState<number>(50);
  const [managerId, setManagerId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Available managers
  const [managers, setManagers] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [loadingManagers, setLoadingManagers] = useState(false);

  // Load available managers when dialog opens
  useEffect(() => {
    if (open) {
      loadManagers();
      resetForm();
    }
  }, [open]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setDuration("8 tuần");
    setMaxStudents(50);
    setManagerId("");
    setError("");
    
    // Set default dates
    const now = new Date();
    const regStart = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    const regEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    setRegistrationStartDate(regStart.toISOString().split('T')[0]);
    setRegistrationEndDate(regEnd.toISOString().split('T')[0]);
  };

  const loadManagers = async () => {
    try {
      setLoadingManagers(true);
      const response = await apiClient.getAvailableManagers();
      setManagers(response.managers);
    } catch (err) {
      console.error("Error loading managers:", err);
      setError("Không thể tải danh sách ban chủ nhiệm");
    } finally {
      setLoadingManagers(false);
    }
  };

  const submit = async () => {
    if (!title.trim()) {
      setError("Vui lòng nhập tên môn thực tập");
      return;
    }
    if (!managerId) {
      setError("Vui lòng chọn ban chủ nhiệm");
      return;
    }
    if (maxStudents < 1) {
      setError("Số lượng sinh viên phải lớn hơn 0");
      return;
    }
    if (new Date(registrationEndDate) <= new Date(registrationStartDate)) {
      setError("Ngày kết thúc đăng ký phải sau ngày bắt đầu đăng ký");
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
      onClose();
    } catch (err: Error | unknown) {
      console.error("Error creating internship subject:", err);
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra khi tạo môn thực tập");
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
            className="h-10 px-4 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50" 
            onClick={onClose}
            disabled={loading}
          >
            Hủy
          </button>
          <button 
            className="h-10 px-5 rounded-md bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:opacity-50" 
            onClick={submit}
            disabled={loading || !title.trim() || !managerId}
          >
            {loading ? "Đang tạo..." : "Thêm"}
          </button>
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
            <input
              className="w-full h-11 rounded-lg border border-gray-300 px-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="VD: Thực tập Phát triển Web"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
            <textarea
              className="w-full h-20 rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              placeholder="Mô tả chi tiết về môn thực tập..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
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
              <input
                type="number"
                min={1}
                max={100}
                className="w-full h-11 rounded-lg border border-gray-300 px-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={maxStudents}
                onChange={(e) => setMaxStudents(parseInt(e.target.value) || 1)}
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
              <input
                type="date"
                className="w-full h-11 rounded-lg border border-gray-300 px-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={registrationStartDate}
                onChange={(e) => setRegistrationStartDate(e.target.value)}
                disabled={loading}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ngày kết thúc đăng ký <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                className="w-full h-11 rounded-lg border border-gray-300 px-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={registrationEndDate}
                onChange={(e) => setRegistrationEndDate(e.target.value)}
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

              