import React, { useMemo, useState, useEffect } from "react";
import type { InternshipSubject, TeacherRegistration } from "./InternshipSubjectTypes";
import ViewSubjectDialog from "./ViewSubjectDialog";
import RegisterSubjectDialog from "./RegisterSubjectDialog";
import AlreadyRegisteredDialog from "./AlreadyRegisteredDialog";
import dayjs from "dayjs";
import { apiClient } from "../../../utils/api";
import { useToast } from "../../../components/UI/Toast";

const StatusChip: React.FC<{ status: 'open' | 'full' | 'closed' | 'locked' }> = ({ status }) => {
  const statusMap = {
    open: { text: "Đang mở", color: "bg-green-50 text-green-700 ring-green-200" },
    full: { text: "Đã đầy", color: "bg-red-50 text-red-700 ring-red-200" },
    closed: { text: "Đã đóng", color: "bg-gray-50 text-gray-700 ring-gray-200" },
    locked: { text: "Đã khóa", color: "bg-gray-50 text-gray-700 ring-gray-200" },
  };
  const { text, color } = statusMap[status];
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${color}`}>
      {text}
    </span>
  );
};

const InternshipSubjectRegister: React.FC = () => {
  const { showWarning, showSuccess, showError } = useToast();
  const [subjects, setSubjects] = useState<InternshipSubject[]>([]);
  const [teacherRegistration, setTeacherRegistration] = useState<TeacherRegistration | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "full">("all");

  // Dialogs
  const [viewingSubject, setViewingSubject] = useState<InternshipSubject | null>(null);
  const [openView, setOpenView] = useState(false);
  const [registeringSubject, setRegisteringSubject] = useState<InternshipSubject | null>(null);
  const [openRegister, setOpenRegister] = useState(false);
  const [openAlreadyRegistered, setOpenAlreadyRegistered] = useState(false);

  // Fetch subjects and check if teacher is already registered
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        setLoading(true);
        setError(null);

        // Use teacher-specific endpoint
        const data = await apiClient.getTeacherAvailableSubjects() as {
          success: boolean;
          subjects?: InternshipSubject[];
          teacherRegistration?: TeacherRegistration;
          error?: string;
        };

        if (!data.success) throw new Error("Phản hồi không thành công");

        setSubjects(data.subjects || []);
        
        // Check if teacher is already registered
        setTeacherRegistration(data.teacherRegistration || null);
      } catch (e) {
        console.error("Error fetching subjects:", e);
        setError(e instanceof Error ? e.message : "Có lỗi xảy ra khi tải dữ liệu");
        setSubjects([]);
        setTeacherRegistration(null);
      } finally {
        setLoading(false);
      }
    };

    fetchSubjects();
  }, []);

  // Show already registered dialog on page load if teacher is registered
  useEffect(() => {
    if (teacherRegistration && subjects.length > 0) {
      setOpenAlreadyRegistered(true);
    }
  }, [teacherRegistration, subjects]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return subjects.filter((subject) => {
      const byStatus = statusFilter === "all" || subject.status === statusFilter;
      const byQuery = !q || 
        subject.title?.toLowerCase().includes(q) || 
        subject.id?.toLowerCase().includes(q) ||
        subject.manager?.name?.toLowerCase().includes(q);
      return byStatus && byQuery;
    });
  }, [subjects, query, statusFilter]);

  const handleRegisterClick = (subject: InternshipSubject) => {
    if (teacherRegistration) {
      setOpenAlreadyRegistered(true);
    } else {
      // Check if subject is open for registration
      if (subject.status !== "open") {
        showWarning('Môn thực tập này đã đóng đăng ký');
        return;
      }
      
      setRegisteringSubject(subject);
      setOpenRegister(true);
    }
  };

  const handleRegistrationSuccess = async (registration: TeacherRegistration) => {
    try {
      // Call teacher-specific registration endpoint
      const data = await apiClient.registerTeacherToSubject(registration.subjectId) as {
        success: boolean;
        registration?: TeacherRegistration;
        error?: string;
      };
      
      if (!data.success) throw new Error(data.error || "Đăng ký thất bại");
      
      setTeacherRegistration(data.registration || null);
      setOpenRegister(false);

      // Update the subject's lecturer count (not student capacity)
      setSubjects(prev =>
        prev.map(s =>
          s.id === registration.subjectId 
            ? { ...s, lecturers: [...(s.lecturers || []), { id: 'current-teacher', name: 'Current Teacher', email: '' }] }
            : s
        )
      );

      showSuccess("Đăng ký thành công! Bạn đã tham gia giảng dạy môn thực tập.");
    } catch (error) {
      console.error("Registration error:", error);
      showError(error instanceof Error ? error.message : "Đăng ký thất bại");
    }
  };

  const truncateText = (text: string, maxLines: number = 2) => {
    const words = text.split(' ');
    const wordsPerLine = 8; // Approximate words per line
    const maxWords = maxLines * wordsPerLine;
    if (words.length <= maxWords) return text;
    return words.slice(0, maxWords).join(' ') + '...';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <div className="ml-3 text-gray-500">Đang tải danh sách môn thực tập...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-4">{error}</div>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <span className="absolute inset-y-0 left-3 flex items-center text-gray-400">
              <svg viewBox="0 0 24 24" className="h-4 w-4">
                <path fill="currentColor" d="M10 2a8 8 0 1 1-5.3 13.9l-3.4 3.4 1.4 1.4 3.4-3.4A8 8 0 0 1 10 2m0 2a6 6 0 1 0 0 12A6 6 0 0 0 10 4z"/>
              </svg>
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm kiếm môn thực tập"
              className="w-[300px] h-10 rounded-lg border border-gray-300 bg-white pl-8 pr-3 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-2">
            {(["all", "open", "full"] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`h-9 rounded-md px-3 text-sm border transition ${
                  statusFilter === status
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                {status === "all" ? "Tất cả" : status === "open" ? "Đang mở" : "Đã đầy"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Subject Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((subject) => {
          const canRegister = subject.status === "open" && !teacherRegistration;
          
          return (
            <div key={subject.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow flex flex-col h-[450px]">
              <div className="p-6 flex flex-col flex-1">
                {/* Header with status */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 mb-1 line-clamp-1">
                      {subject.title || subject.name}
                    </h3>
                    <p className="text-sm text-gray-600 font-mono">{subject.id}</p>
                  </div>
                  <StatusChip status={subject.status === "open" ? "open" : "locked"} />
                </div>

                {/* Description */}
                <div className="mb-4 flex-shrink-0" style={{ height: '48px' }}>
                  <p className="text-sm text-gray-600 leading-6">
                    {truncateText(subject.description || 'Mô tả môn thực tập', 2)}
                  </p>
                </div>

                {/* Manager */}
                <div className="mb-4 flex-shrink-0">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500">Ban chủ nhiệm:</span>
                    <span className="font-medium text-blue-700">
                      {subject.manager?.name || subject.bcnManager?.name}
                    </span>
                  </div>
                </div>

                {/* Subject details */}
                <div className="space-y-2 text-sm flex-1">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Giảng viên:</span>
                    <span className="font-medium">{subject.lecturers?.length || 0} người</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Sinh viên:</span>
                    <span className="font-medium">
                      {subject.currentStudents}/{subject.maxStudents}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Chỗ trống:</span>
                    <span className="font-medium text-green-600">
                      {subject.maxStudents - subject.currentStudents} sinh viên
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Thời gian:</span>
                    <span className="font-medium">{subject.duration || '8 tuần'}</span>
                  </div>
                  {subject.registrationEndDate && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Hạn đăng ký:</span>
                      <span className="font-medium">{dayjs(subject.registrationEndDate).format("DD/MM/YYYY")}</span>
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="mt-6 flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => { setViewingSubject(subject); setOpenView(true); }}
                    className="flex-1 h-9 px-3 rounded-md border border-gray-300 bg-white text-gray-700 text-sm hover:bg-gray-50"
                  >
                    Xem chi tiết
                  </button>
                  <button
                    onClick={() => handleRegisterClick(subject)}
                    disabled={!canRegister}
                    className="flex-1 h-9 px-3 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    {subject.status === "locked" ? 'Đã khóa' :
                     teacherRegistration ? 'Đã tham gia' : 'Tham gia'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-2">Không tìm thấy môn thực tập phù hợp</div>
          <button
            onClick={() => { setQuery(""); setStatusFilter("all"); }}
            className="text-blue-600 hover:text-blue-700 text-sm"
          >
            Xóa bộ lọc
          </button>
        </div>
      )}

      {/* Dialogs */}
      <ViewSubjectDialog
        open={openView}
        onClose={() => setOpenView(false)}
        subject={viewingSubject}
        onRegister={(subject) => {
          setOpenView(false);
          handleRegisterClick(subject);
        }}
        canRegister={!teacherRegistration}
      />

      <RegisterSubjectDialog
        open={openRegister}
        onClose={() => setOpenRegister(false)}
        subject={registeringSubject}
        onSuccess={handleRegistrationSuccess}
      />

      <AlreadyRegisteredDialog
        open={openAlreadyRegistered}
        onClose={() => setOpenAlreadyRegistered(false)}
        currentRegistration={teacherRegistration}
        subjects={subjects}
      />
    </div>
  );
};

export default InternshipSubjectRegister;
