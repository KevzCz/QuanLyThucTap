import React, { useState, useEffect } from "react";
import Modal from "../../../util/Modal";
import type { Participant } from "./ParticipantsTypes";
import { roleLabel } from "./ParticipantsTypes";
import { apiClient } from "../../../utils/api";
import { useToast } from "../../../components/UI/Toast";

interface Props {
  open: boolean;
  onClose: () => void;
  participant?: Participant;
  onStudentAdded?: () => void;
}

const ViewParticipantDialog: React.FC<Props> = ({ open, onClose, participant, onStudentAdded }) => {
  const isGV = participant?.role === "giang-vien";
  const { showSuccess, showError } = useToast();
  
  // State for adding students to lecturer
  const [availableStudents, setAvailableStudents] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Local state to track managed students for live updates
  const [localManagedStudents, setLocalManagedStudents] = useState<Array<{ id: string; name: string; email: string }>>([]);

  // Calculate max students from lecturer's maxStudents field
  const maxStudents = participant?.role === "giang-vien" && participant.maxStudents ? participant.maxStudents : null;
  
  // Update local managed students when participant changes
  useEffect(() => {
    setLocalManagedStudents(participant?.managedStudents || []);
  }, [participant]);

  const loadAvailableStudents = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getAvailableStudents();
      setAvailableStudents(response.students);
    } catch (err: unknown) {
      console.error("Error loading available students:", err);
      showError("Không thể tải danh sách sinh viên khả dụng");
    } finally {
      setLoading(false);
    }
  };

  // Load available students when viewing a lecturer
  useEffect(() => {
    if (open && isGV && participant) {
      loadAvailableStudents();
    } else {
      // Reset state when closing or viewing non-lecturer
      setAvailableStudents([]);
      setSelectedStudentIds([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isGV, participant]);

  const handleAddStudents = async () => {
    if (!participant || selectedStudentIds.length === 0) return;

    try {
      setLoading(true);
      
      // Get the students that are being added (for local update)
      const studentsToAdd = availableStudents.filter(s => selectedStudentIds.includes(s.id));
      
      // Add all selected students
      const promises = selectedStudentIds.map(studentId => 
        apiClient.updateStudentSupervisor(studentId, participant.id)
      );
      
      await Promise.all(promises);
      
      // Update local managed students list immediately
      setLocalManagedStudents(prev => [...prev, ...studentsToAdd]);
      
      showSuccess(`Đã thêm ${selectedStudentIds.length} sinh viên vào danh sách hướng dẫn`);
      setSelectedStudentIds([]);
      
      // Reload available students
      await loadAvailableStudents();
      
      // Notify parent to refresh data
      if (onStudentAdded) {
        onStudentAdded();
      }
    } catch (err: unknown) {
      console.error("Error adding students:", err);
      showError(err instanceof Error ? err.message : "Không thể thêm sinh viên");
    } finally {
      setLoading(false);
    }
  };

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudentIds(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const selectAllStudents = () => {
    if (selectedStudentIds.length === availableStudents.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(availableStudents.map(s => s.id));
    }
  };

  const handleRemoveStudent = async (studentId: string) => {
    if (!participant) return;

    try {
      setLoading(true);
      // Remove student's advisor (set to undefined)
      await apiClient.updateStudentSupervisor(studentId, undefined);
      
      // Update local managed students list immediately
      setLocalManagedStudents(prev => prev.filter(s => s.id !== studentId));
      
      showSuccess("Đã xóa sinh viên khỏi danh sách hướng dẫn");
      
      // Reload available students
      await loadAvailableStudents();
      
      // Notify parent to refresh data
      if (onStudentAdded) {
        onStudentAdded();
      }
    } catch (err: unknown) {
      console.error("Error removing student:", err);
      showError(err instanceof Error ? err.message : "Không thể xóa sinh viên");
    } finally {
      setLoading(false);
    }
  };

  // Use local managed students for live updates
  const currentStudentCount = localManagedStudents.length;
  const canAddMore = maxStudents === null || currentStudentCount < maxStudents;
  
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isGV ? "Xem giảng viên" : "Xem sinh viên"}
      widthClass="max-w-3xl"
      actions={<button className="h-10 px-4 rounded-md bg-blue-600 text-white hover:bg-blue-700" onClick={onClose}>Đóng</button>}
    >
      {!participant ? (
        <div className="text-gray-500">Không tìm thấy.</div>
      ) : (
        <div className="space-y-4">
          <div className="text-center">
            <h2 className="text-2xl font-extrabold text-blue-600">{participant.name}</h2>
            <div className="inline-block mt-2 rounded-full bg-blue-100 px-4 py-1 text-sm text-blue-800">{participant.id}</div>
          </div>

          <div className="rounded-xl border border-gray-200 p-4">
            <div className="text-gray-700">
              <div className="py-1"><span className="text-gray-500">Vai trò:</span> <span className="font-medium">{roleLabel[participant.role]}</span></div>
              <div className="py-1"><span className="text-gray-500">Email:</span> <span className="font-medium">{participant.email || "—"}</span></div>
              <div className="py-1"><span className="text-gray-500">Trạng thái:</span> <span className="font-medium">{participant.status}</span></div>
              {participant.role === "sinh-vien" && (
                <div className="py-1"><span className="text-gray-500">Giảng viên hướng dẫn:</span> <span className="font-medium">{participant.advisorName || "Chưa có"}</span></div>
              )}
              {participant.role === "giang-vien" && maxStudents && (
                <div className="py-1"><span className="text-gray-500">Giới hạn sinh viên:</span> <span className="font-medium">{currentStudentCount}/{maxStudents}</span></div>
              )}
            </div>
          </div>

          {isGV && (
            <div className="rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-gray-700 font-medium">
                  Sinh viên hướng dẫn ({currentStudentCount}{maxStudents ? `/${maxStudents}` : ''})
                </div>
              </div>

              {/* Add student form */}
              {loading && !availableStudents.length ? (
                <div className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200 text-sm text-blue-700">
                  Đang tải danh sách sinh viên...
                </div>
              ) : !canAddMore && maxStudents ? (
                <div className="mb-3 p-3 bg-amber-50 rounded-lg border border-amber-200 text-sm text-amber-800">
                  Đã đạt giới hạn số sinh viên tối đa ({maxStudents})
                </div>
              ) : availableStudents.length > 0 ? (
                <div className="mb-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-emerald-900">
                      Chọn sinh viên để thêm ({selectedStudentIds.length} đã chọn)
                    </label>
                    <button
                      onClick={selectAllStudents}
                      className="text-xs text-emerald-700 hover:text-emerald-800 font-medium"
                      disabled={loading}
                    >
                      {selectedStudentIds.length === availableStudents.length ? "Bỏ chọn tất cả" : "Chọn tất cả"}
                    </button>
                  </div>
                  
                  <div className="max-h-60 overflow-y-auto space-y-1 mb-3 border border-emerald-200 rounded-lg p-2 bg-white">
                    {availableStudents.map((student) => (
                      <label
                        key={student.id}
                        className="flex items-center p-2 hover:bg-emerald-50 rounded cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedStudentIds.includes(student.id)}
                          onChange={() => toggleStudentSelection(student.id)}
                          disabled={loading}
                          className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                        />
                        <span className="ml-3 text-sm text-gray-900 flex-1">
                          <span className="font-medium">{student.id}</span> - {student.name}
                        </span>
                      </label>
                    ))}
                  </div>

                  <button
                    onClick={handleAddStudents}
                    disabled={selectedStudentIds.length === 0 || loading}
                    className="w-full h-9 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? "Đang thêm..." : `Thêm ${selectedStudentIds.length} sinh viên`}
                  </button>
                </div>
              ) : (
                <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200 text-sm text-gray-600">
                  Không có sinh viên khả dụng. Tất cả sinh viên trong khoa đã có giảng viên hướng dẫn.
                </div>
              )}

              {localManagedStudents && localManagedStudents.length > 0 ? (
                <div className="space-y-2">
                  {localManagedStudents.map((student) => (
                    <div key={student.id} className="flex items-center justify-between py-2 px-3 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex-1">
                        <div className="font-medium text-green-900">{student.name}</div>
                        <div className="text-sm text-green-700">ID: {student.id}</div>
                        {student.email && (
                          <div className="text-xs text-green-600">{student.email}</div>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemoveStudent(student.id)}
                        disabled={loading}
                        className="ml-2 p-1.5 rounded-md text-red-600 hover:bg-red-100 disabled:opacity-50"
                        title="Xóa khỏi danh sách hướng dẫn"
                      >
                        <svg viewBox="0 0 24 24" className="h-4 w-4">
                          <path fill="currentColor" d="M6 7h12v2H6zm2 3h8l-1 10H9L8 10Zm3-7h2l1 2h4v2H6V5h4l1-2Z"/>
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-lg">
                  Chưa hướng dẫn sinh viên nào
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};

export default ViewParticipantDialog;
