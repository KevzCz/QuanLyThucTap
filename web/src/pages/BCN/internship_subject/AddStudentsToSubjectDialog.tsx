import React, { useState, useEffect } from "react";
import Modal from "../../../util/Modal";
import FileDrop, { type ParsedRow } from "./_FileDrop";
import type { Participant } from "./ParticipantsTypes";
import { apiClient } from "../../../utils/api";

interface Props {
  open: boolean;
  onClose: () => void;
  onParsed: (rows: ParsedRow[]) => void;
  onAddSingle: (sv: Participant) => void;
  subjectId: string;
  subjectLecturers: Array<{ id: string; name: string; email: string }>; // Add this prop
}

const AddStudentsToSubjectDialog: React.FC<Props> = ({ 
  open, 
  onClose, 
  onParsed, 
  onAddSingle, 
  subjectId, 
  subjectLecturers 
}) => {
  const [svId, setSvId] = useState("");
  const [svName, setSvName] = useState("");
  const [gvId, setGvId] = useState("");
  const [gvName, setGvName] = useState("");
  
  // Available students and lecturers
  const [availableStudents, setAvailableStudents] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Load available students when dialog opens
  useEffect(() => {
    if (open && subjectId) {
      loadAvailableStudents();
      // Reset form
      setSvId("");
      setSvName("");
      setGvId("");
      setGvName("");
      setError("");
    }
  }, [open, subjectId]);

  const loadAvailableStudents = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getAvailableStudents(subjectId);
      setAvailableStudents(response.students);
    } catch (err: Error | unknown) {
      console.error("Error loading available students:", err);
      setError("Không thể tải danh sách sinh viên khả dụng");
    } finally {
      setLoading(false);
    }
  };

  const add = () => {
    if (!svId || !svName) {
      setError("Vui lòng nhập đầy đủ thông tin sinh viên");
      return;
    }

    onAddSingle({
      id: svId.trim(),
      name: svName.trim(),
      email: "", // Will be filled by backend
      role: "sinh-vien",
      status: gvId ? "duoc-huong-dan" : "chua-duoc-huong-dan",
      advisorId: gvId || undefined,
      advisorName: gvName || undefined,
    });
    onClose();
  };

  // Auto-fill name when selecting from dropdown
  const handleStudentIdChange = (value: string) => {
    setSvId(value);
    const student = availableStudents.find(s => s.id === value);
    if (student) {
      setSvName(student.name);
    }
  };

  const handleLecturerIdChange = (value: string) => {
    setGvId(value);
    const lecturer = subjectLecturers.find(l => l.id === value);
    if (lecturer) {
      setGvName(lecturer.name);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Thêm sinh viên vào môn thực tập"
      widthClass="max-w-3xl"
      actions={
        <>
          <button 
            className="h-10 px-4 rounded-md text-gray-700 border border-gray-300 hover:bg-gray-50" 
            onClick={onClose}
            disabled={loading}
          >
            HỦY
          </button>
          <button 
            className="h-10 px-5 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50" 
            onClick={add}
            disabled={loading || !svId || !svName}
          >
            Thêm
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="text-center py-4 text-gray-500">Đang tải dữ liệu...</div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ID Sinh viên <span className="text-red-500">*</span>
                </label>
                <input 
                  value={svId} 
                  onChange={(e) => handleStudentIdChange(e.target.value)}
                  placeholder="Chọn hoặc nhập ID"
                  list="available-students"
                  className="w-full h-11 rounded-lg border border-gray-300 px-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                />
                <datalist id="available-students">
                  {availableStudents.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.name}
                    </option>
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tên sinh viên <span className="text-red-500">*</span>
                </label>
                <input 
                  value={svName} 
                  onChange={(e) => setSvName(e.target.value)} 
                  placeholder="Tên sẽ tự động điền"
                  className="w-full h-11 rounded-lg border border-gray-300 px-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ID Giảng viên hướng dẫn (tuỳ chọn)</label>
                <input 
                  value={gvId} 
                  onChange={(e) => handleLecturerIdChange(e.target.value)}
                  placeholder="Chọn hoặc nhập ID"
                  list="available-lecturers"
                  className="w-full h-11 rounded-lg border border-gray-300 px-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                />
                <datalist id="available-lecturers">
                  {subjectLecturers.map((lecturer) => (
                    <option key={lecturer.id} value={lecturer.id}>
                      {lecturer.name}
                    </option>
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên giảng viên</label>
                <input 
                  value={gvName} 
                  onChange={(e) => setGvName(e.target.value)} 
                  placeholder="Tên sẽ tự động điền"
                  className="w-full h-11 rounded-lg border border-gray-300 px-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Hoặc nộp file danh sách</h3>
              <FileDrop onParsed={onParsed} />
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

export default AddStudentsToSubjectDialog;
