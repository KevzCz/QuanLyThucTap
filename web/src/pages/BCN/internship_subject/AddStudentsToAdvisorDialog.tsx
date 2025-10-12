import React, { useEffect, useMemo, useState } from "react";
import Modal from "../../../util/Modal";
import FileDrop, { type ParsedRow } from "./_FileDrop";
import type { Participant } from "./ParticipantsTypes";
import { apiClient } from "../../../utils/api";

interface Props {
  open: boolean;
  onClose: () => void;
  advisors: Participant[]; // role==="giang-vien"
  onParsed: (rows: ParsedRow[]) => void;
  onAddSingle: (sv: Participant) => void;
  subjectId: string;
}

const AddStudentsToAdvisorDialog: React.FC<Props> = ({ open, onClose, advisors, onParsed, onAddSingle, subjectId }) => {
  const [gvId, setGvId] = useState("");
  const [gvName, setGvName] = useState("");
  const [svId, setSvId] = useState("");
  const [svName, setSvName] = useState("");
  
  // Available students
  const [availableStudents, setAvailableStudents] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const advisorOptions = useMemo(() => advisors.map(a => ({ id: a.id, name: a.name })), [advisors]);

  // Load available students when dialog opens
  useEffect(() => {
    if (open && subjectId) {
      loadAvailableStudents();
      // Reset form
      setGvId("");
      setGvName("");
      setSvId("");
      setSvName("");
      setError("");
    }
  }, [open, subjectId]);

  const loadAvailableStudents = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getAvailableStudents(subjectId);
      setAvailableStudents(response.students);
    } catch (err: unknown) {
      console.error("Error loading available students:", err);
      setError("Không thể tải danh sách sinh viên khả dụng");
    } finally {
      setLoading(false);
    }
  };

  const add = () => {
    if (!gvId || !svId || !svName) {
      setError("Vui lòng nhập đầy đủ thông tin");
      return;
    }

    onAddSingle({
      id: svId.trim(),
      name: svName.trim(),
      email: "", // Will be filled by backend
      role: "sinh-vien",
      status: "dang-thuc-tap",
      advisorId: gvId,
      advisorName: gvName || advisorOptions.find(x => x.id === gvId)?.name,
    });
    setSvId(""); 
    setSvName("");
  };

  // Auto-fill names when selecting from dropdowns
  const handleStudentIdChange = (value: string) => {
    setSvId(value);
    const student = availableStudents.find(s => s.id === value);
    if (student) {
      setSvName(student.name);
    }
  };

  const handleLecturerIdChange = (value: string) => {
    setGvId(value);
    const lecturer = advisorOptions.find(l => l.id === value);
    if (lecturer) {
      setGvName(lecturer.name);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Thêm sinh viên vào danh sách giảng viên"
      widthClass="max-w-3xl"
      actions={
        <>
          <button 
            className="h-10 px-4 rounded-md text-rose-600 hover:bg-rose-50" 
            onClick={onClose}
            disabled={loading}
          >
            HỦY
          </button>
          <button 
            className="h-10 px-5 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50" 
            onClick={onClose}
            disabled={loading}
          >
            Lưu
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
                  ID Giảng viên hướng dẫn <span className="text-red-500">*</span>
                </label>
                <input 
                  value={gvId} 
                  onChange={(e) => handleLecturerIdChange(e.target.value)}
                  placeholder="Chọn giảng viên"
                  list="advisor-options"
                  className="w-full h-11 rounded-lg border border-gray-300 px-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                />
                <datalist id="advisor-options">
                  {advisorOptions.map((advisor) => (
                    <option key={advisor.id} value={advisor.id}>
                      {advisor.name}
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

              <div className="sm:col-span-2">
                <button 
                  className="rounded-md bg-emerald-600 text-white px-4 h-9 hover:bg-emerald-700 disabled:opacity-50" 
                  onClick={add}
                  disabled={!gvId || !svId || !svName}
                >
                  Thêm
                </button>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Hoặc nộp file danh sách</h3>
              <FileDrop onParsed={(rows) => {
                // attach advisor columns for confirm screen
                const enriched = rows.map(r => ({ ...r, advisorId: gvId || r.advisorId, advisorName: gvName || r.advisorName }));
                onParsed(enriched);
              }} acceptAdvisor />
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

export default AddStudentsToAdvisorDialog;
