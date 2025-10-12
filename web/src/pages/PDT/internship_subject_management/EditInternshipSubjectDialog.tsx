import React, { useEffect, useState } from "react";
import Modal from "../../../util/Modal";
import type { InternshipSubject, InternshipStatus } from "./InternshipSubjectTypes";
import { apiClient } from "../../../utils/api";

interface Props {
  open: boolean;
  onClose: () => void;
  internshipSubject?: InternshipSubject;
  onSave: (data: InternshipSubject) => void;
}

const EditInternshipSubjectDialog: React.FC<Props> = ({ open, onClose, internshipSubject, onSave }) => {
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<InternshipStatus>("open");
  const [maxStudents, setMaxStudents] = useState<number>(50);
  const [managerId, setManagerId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Available managers
  const [managers, setManagers] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [loadingManagers, setLoadingManagers] = useState(false);

  useEffect(() => {
    if (internshipSubject && open) {
      setTitle(internshipSubject.title);
      setStatus(internshipSubject.status);
      setMaxStudents(internshipSubject.maxStudents);
      setManagerId(internshipSubject.manager.id);
      setError("");
      loadManagers();
    }
  }, [internshipSubject, open]);

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
    if (!internshipSubject) return;
    
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
      onClose();
    } catch (err: Error | unknown) {
      console.error("Error updating internship subject:", err);
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra khi cập nhật môn thực tập");
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
            {loading ? "Đang lưu..." : "Lưu"}
          </button>
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
            <input 
              className="w-full h-11 rounded-lg border border-gray-300 px-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
