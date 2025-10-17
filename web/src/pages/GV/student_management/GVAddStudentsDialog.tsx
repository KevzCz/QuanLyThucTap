import React, { useState, useEffect } from "react";
import Modal from "../../../util/Modal";
import FileDrop from "../../BCN/internship_subject/_FileDrop";
import { apiClient } from "../../../utils/api";

interface RowLite { id: string; name: string }

interface Props {
  open: boolean;
  onClose: () => void;
  advisorId: string;
  advisorName: string;
  subjectId?: string;
  onParsed: (rows: RowLite[]) => void;
  onRequestSingle: (sv: RowLite) => void;
}

interface AvailableStudent {
  id: string;
  name: string;
  email: string;
  hasNoSupervisor: boolean;
  currentSupervisor?: string;
  isCurrentAdvisor: boolean; // Remove optional, make it required
}

const GVAddStudentsDialog: React.FC<Props> = ({ 
  open, 
  onClose, 
  advisorId, 
  advisorName, 
  subjectId,
  onParsed, 
  onRequestSingle 
}) => {
  const [svId, setSvId] = useState("");
  const [svName, setSvName] = useState("");
  const [availableStudents, setAvailableStudents] = useState<AvailableStudent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [validationError, setValidationError] = useState("");

  // Load available students when dialog opens
  useEffect(() => {
    if (open && subjectId) {
      loadAvailableStudents();
      // Reset form
      setSvId("");
      setSvName("");
      setError("");
      setValidationError("");
    }
  }, [open, subjectId]);

  const loadAvailableStudents = async () => {
    try {
      setLoading(true);
      setError("");
      
      // Get students in the subject who don't have supervisors
      const response = await apiClient.request<{
        success: boolean;
        subject: {
          students: Array<{
            id: string;
            name: string;
            email: string;
            supervisor?: { id: string; name: string };
          }>;
        };
      }>(`/internship-subjects/${subjectId}`);

      if (response.success && response.subject) {
        const studentsData = response.subject.students.map(student => ({
          id: student.id,
          name: student.name,
          email: student.email,
          hasNoSupervisor: !student.supervisor,
          currentSupervisor: student.supervisor?.name,
          isCurrentAdvisor: student.supervisor?.id === advisorId // This will be true/false, not undefined
        }));
        
        setAvailableStudents(studentsData);
      }
    } catch (err) {
      console.error("Error loading available students:", err);
      setError("Không thể tải danh sách sinh viên khả dụng");
    } finally {
      setLoading(false);
    }
  };

  const handleStudentIdChange = (value: string) => {
    setSvId(value);
    setValidationError("");
    
    const student = availableStudents.find(s => s.id === value);
    if (student) {
      setSvName(student.name);
      
      // Validate student eligibility
      if (student.isCurrentAdvisor) {
        setValidationError("Bạn đã đang hướng dẫn sinh viên này rồi");
      } else if (!student.hasNoSupervisor) {
        setValidationError(
          student.currentSupervisor 
            ? `Sinh viên này đã được hướng dẫn bởi ${student.currentSupervisor}`
            : "Sinh viên này đã có giảng viên hướng dẫn"
        );
      }
    } else if (value.trim()) {
      // Check if student ID exists but not in subject
      const allStudentsInDb = availableStudents.some(s => s.id.toLowerCase().includes(value.toLowerCase()));
      if (!allStudentsInDb && value.length >= 4) {
        setValidationError("Sinh viên này không tham gia môn thực tập hoặc không tồn tại trong hệ thống");
      }
      setSvName("");
    } else {
      setSvName("");
    }
  };

  const sendSingle = () => {
    if (!svId || !svName) {
      setValidationError("Vui lòng chọn sinh viên hợp lệ");
      return;
    }

    const student = availableStudents.find(s => s.id === svId);
    if (!student) {
      setValidationError("Sinh viên không tồn tại trong môn thực tập này");
      return;
    }

    if (student.isCurrentAdvisor) {
      setValidationError("Bạn đã đang hướng dẫn sinh viên này rồi");
      return;
    }

    if (!student.hasNoSupervisor) {
      setValidationError(
        student.currentSupervisor 
          ? `Sinh viên này đã được hướng dẫn bởi ${student.currentSupervisor}`
          : "Sinh viên này đã có giảng viên hướng dẫn"
      );
      return;
    }

    onRequestSingle({ id: svId.trim(), name: svName.trim() });
  };

  // Filter students to show only those without supervisors and not already supervised by current advisor
  const unassignedStudents = availableStudents.filter(s => s.hasNoSupervisor && !s.isCurrentAdvisor);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Gửi yêu cầu thêm sinh viên"
      widthClass="max-w-3xl"
      actions={
        <>
          <button className="h-10 px-4 rounded-md text-gray-700 border border-gray-300 hover:bg-gray-50" onClick={onClose}>HỦY</button>
          <button 
            className="h-10 px-5 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50" 
            onClick={sendSingle}
            disabled={!!validationError || !svId || !svName || loading}
          >
            Gửi yêu cầu
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Error Messages */}
        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {validationError && (
          <div className="rounded-md bg-yellow-50 border border-yellow-200 p-3">
            <p className="text-sm text-yellow-700">{validationError}</p>
          </div>
        )}

        {loading ? (
          <div className="text-center py-4 text-gray-500">Đang tải danh sách sinh viên...</div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ID Giảng viên</label>
                <input disabled value={advisorId} className="w-full h-11 rounded-lg border border-gray-200 px-3 bg-gray-50" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên giảng viên</label>
                <input disabled value={advisorName} className="w-full h-11 rounded-lg border border-gray-200 px-3 bg-gray-50" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ID Sinh viên <span className="text-red-500">*</span>
                </label>
                <input 
                  value={svId} 
                  onChange={(e) => handleStudentIdChange(e.target.value)}
                  placeholder="Chọn hoặc nhập ID sinh viên"
                  list="available-students"
                  className={`w-full h-11 rounded-lg border px-3 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                    validationError ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                />
                <datalist id="available-students">
                  {unassignedStudents.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.name} - {student.email}
                    </option>
                  ))}
                </datalist>
                {unassignedStudents.length === 0 && !loading && (
                  <p className="text-xs text-gray-500 mt-1">
                    Không có sinh viên nào chưa được phân giảng viên hướng dẫn
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tên sinh viên <span className="text-red-500">*</span>
                </label>
                <input 
                  value={svName} 
                  onChange={(e) => setSvName(e.target.value)} 
                  placeholder="Tên sẽ tự động điền"
                  className="w-full h-11 rounded-lg border border-gray-300 px-3 bg-gray-50"
                  readOnly
                />
              </div>
            </div>

            {/* Summary info */}
            {availableStudents.length > 0 && (
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
                <p className="text-sm text-blue-700">
                  <strong>Thống kê:</strong> Có {unassignedStudents.length} sinh viên chưa được phân giảng viên hướng dẫn 
                  trong tổng số {availableStudents.length} sinh viên tham gia môn thực tập này.
                  {availableStudents.filter(s => s.isCurrentAdvisor === true).length > 0 && (
                    <span className="block mt-1">
                      (Bạn đang hướng dẫn {availableStudents.filter(s => s.isCurrentAdvisor === true).length} sinh viên)
                    </span>
                  )}
                </p>
              </div>
            )}

            <div className="mt-4 pt-4 border-t">
              <div className="text-sm text-gray-600 mb-2">Hoặc nộp danh sách .csv để gửi yêu cầu theo lô</div>
              <FileDrop onParsed={(rows) => {
                // Validate bulk import
                const validRows: RowLite[] = [];
                const invalidRows: string[] = [];
                
                rows.forEach(row => {
                  const student = availableStudents.find(s => s.id === row.id);
                  if (!student) {
                    invalidRows.push(`${row.id}: Không tồn tại trong môn thực tập`);
                  } else if (student.isCurrentAdvisor === true) {
                    invalidRows.push(`${row.id}: Bạn đã đang hướng dẫn sinh viên này`);
                  } else if (!student.hasNoSupervisor) {
                    invalidRows.push(`${row.id}: Đã có giảng viên hướng dẫn (${student.currentSupervisor || 'không rõ'})`);
                  } else {
                    validRows.push({ id: row.id, name: student.name });
                  }
                });
                
                if (invalidRows.length > 0) {
                  alert(`Một số sinh viên không hợp lệ:\n${invalidRows.join('\n')}\n\nChỉ ${validRows.length} sinh viên hợp lệ sẽ được xử lý.`);
                }
                
                if (validRows.length > 0) {
                  onParsed(validRows);
                } else {
                  alert('Không có sinh viên hợp lệ nào để xử lý');
                }
              }} />
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

export default GVAddStudentsDialog;
