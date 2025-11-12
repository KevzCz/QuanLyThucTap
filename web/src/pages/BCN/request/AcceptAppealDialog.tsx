import React, { useState, useEffect, useCallback } from "react";
import Modal from "../../../util/Modal";
import type { GradeAppeal } from "../../../utils/api";
import { apiClient } from "../../../utils/api";
import { useToast } from "../../../components/UI/Toast";

interface Props {
  open: boolean;
  onClose: () => void;
  appeal?: GradeAppeal | null;
  onConfirm: (newSupervisorId: string, reviewNote?: string) => void;
}

const AcceptAppealDialog: React.FC<Props> = ({ open, onClose, appeal, onConfirm }) => {
  const [reviewNote, setReviewNote] = useState("");
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [teachers, setTeachers] = useState<Array<{ _id: string; id: string; name: string }>>([]);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const loadTeachers = useCallback(async () => {
    if (!appeal) return;
    
    try {
      setLoading(true);
      const response = await apiClient.getLecturersByKhoa(appeal.khoa);
      
      // Filter out the original supervisor
      const originalSupervisorId = typeof appeal.originalSupervisor === 'object' 
        ? appeal.originalSupervisor._id 
        : appeal.originalSupervisor;
        
      const availableTeachers = response.lecturers.filter(
        t => t._id !== originalSupervisorId
      );
      
      setTeachers(availableTeachers);
    } catch (error) {
      console.error('Error loading teachers:', error);
      toast.showError('Không thể tải danh sách giảng viên');
    } finally {
      setLoading(false);
    }
  }, [appeal, toast]);

  useEffect(() => {
    if (open && appeal) {
      loadTeachers();
      setReviewNote("");
      setSelectedTeacher("");
    }
  }, [open, appeal, loadTeachers]);

  const handleConfirm = () => {
    if (!selectedTeacher) {
      toast.showError('Vui lòng chọn giảng viên phúc khảo');
      return;
    }
    onConfirm(selectedTeacher, reviewNote.trim() || undefined);
    setReviewNote("");
    setSelectedTeacher("");
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Chấp nhận yêu cầu phúc khảo"
      widthClass="max-w-lg"
      actions={
        <>
          <button className="h-10 px-4 rounded-md text-gray-700 border border-gray-300 hover:bg-gray-50" onClick={onClose}>
            Hủy
          </button>
          <button 
            className="h-10 px-5 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50" 
            onClick={handleConfirm}
            disabled={!selectedTeacher || loading}
          >
            Chấp nhận
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-gray-700">
          Chọn giảng viên sẽ phụ trách phúc khảo cho sinh viên{' '}
          <span className="font-semibold">
            {typeof appeal?.student === 'object' && appeal.student.name}
          </span>
        </p>

        {/* Teacher Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Giảng viên phúc khảo <span className="text-red-500">*</span>
          </label>
          <select
            value={selectedTeacher}
            onChange={(e) => setSelectedTeacher(e.target.value)}
            disabled={loading}
            className="w-full h-11 rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-50"
          >
            <option value="">-- Chọn giảng viên --</option>
            {teachers.map((teacher) => (
              <option key={teacher._id} value={teacher._id}>
                {teacher.name} ({teacher.id})
              </option>
            ))}
          </select>
          {loading && (
            <p className="text-xs text-gray-500 mt-1">Đang tải danh sách giảng viên...</p>
          )}
          {!loading && teachers.length === 0 && (
            <p className="text-xs text-red-500 mt-1">Không có giảng viên nào khác trong khoa</p>
          )}
        </div>

        {/* Original Supervisor Info */}
        {appeal && (
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <p className="text-sm text-gray-600">
              <span className="font-medium">Giảng viên ban đầu:</span>{' '}
              {typeof appeal.originalSupervisor === 'object' && 
                `${appeal.originalSupervisor.name} (${appeal.originalSupervisor.id})`}
            </p>
          </div>
        )}
        
        {/* Review Note */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Ghi chú (tùy chọn)
          </label>
          <textarea
            value={reviewNote}
            onChange={(e) => setReviewNote(e.target.value)}
            placeholder="Nhập ghi chú cho yêu cầu phúc khảo..."
            className="w-full h-20 rounded-lg border border-gray-300 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>
    </Modal>
  );
};

export default AcceptAppealDialog;
