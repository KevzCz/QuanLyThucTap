import React, { useMemo, useState, useEffect } from "react";
import type { InternshipSubject, StudentRegistration } from "./InternshipSubjectTypes";
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
  const { showSuccess, showError, showWarning } = useToast();
  const [subjects, setSubjects] = useState<InternshipSubject[]>([]);
  const [studentRegistration, setStudentRegistration] = useState<StudentRegistration | null>(null);
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

  // Fetch subjects and registration status
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await apiClient.getStudentAvailableSubjects();

        if (!data.success) throw new Error("Phản hồi không thành công");

        setSubjects(data.subjects || []);
        setStudentRegistration(data.studentRegistration || null);
      } catch (e) {
        console.error("Error fetching subjects:", e);
        setError(e instanceof Error ? e.message : "Có lỗi xảy ra khi tải dữ liệu");
        setSubjects([]);
        setStudentRegistration(null);
      } finally {
        setLoading(false);
      }
    };


    fetchSubjects();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return subjects.filter((subject) => {
      const byStatus = statusFilter === "all" || subject.status === statusFilter;
      const byQuery = !q || 
        subject.name?.toLowerCase().includes(q) || 
        subject.code?.toLowerCase().includes(q) ||
        subject.instructors?.some(inst => inst.name.toLowerCase().includes(q));
      return byStatus && byQuery;
    });
  }, [subjects, query, statusFilter]);

  const handleRegisterClick = (subject: InternshipSubject) => {
    if (studentRegistration) {
      setOpenAlreadyRegistered(true);
    } else {
      // Check registration status
      const now = new Date();
      const regStart = subject.registrationStartDate ? new Date(subject.registrationStartDate) : null;
      const regEnd = subject.registrationEndDate ? new Date(subject.registrationEndDate) : null;
      
      if (regStart && now < regStart) {
        showWarning('Chưa đến thời gian đăng ký');
        return;
      }
      if (regEnd && now > regEnd) {
        showWarning('Đã hết thời gian đăng ký');
        return;
      }
      if (subject.currentStudents >= subject.maxStudents) {
        showWarning('Môn thực tập đã đầy');
        return;
      }
      
      setRegisteringSubject(subject);
      setOpenRegister(true);
    }
  };

  const handleRegistrationSuccess = async (registration: StudentRegistration) => {
    try {
      const data = await apiClient.registerStudentToSubject(registration.subjectId);
      if (!data.success) throw new Error("Đăng ký thất bại");

      setStudentRegistration(data.registration);
      setOpenRegister(false);

      setSubjects(prev =>
        prev.map(s =>
          s.id === registration.subjectId ? { ...s, currentStudents: s.currentStudents + 1 } : s
        )
      );

      showSuccess("Đăng ký thành công! Bạn đã tham gia môn thực tập.");
    } catch (error) {
      console.error("Registration error:", error);
      showError(error instanceof Error ? error.message : "Đăng ký thất bại");
    }

  };

  const remainingSpots = (subject: InternshipSubject) => subject.maxStudents - subject.currentStudents;

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
        <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-blue-600"></div>
        <div className="ml-3 text-xs sm:text-sm text-gray-500">Đang tải danh sách môn thực tập...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 sm:py-12 px-3">
        <div className="text-red-500 mb-4 text-xs sm:text-sm">{error}</div>
        <button 
          onClick={() => window.location.reload()}
          className="px-3 py-2 sm:px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-xs sm:text-sm touch-manipulation"
        >
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">

      {/* Filters */}
      <div className="flex flex-col gap-2 sm:gap-3">
        <div className="relative w-full sm:w-[300px]">
          <span className="absolute inset-y-0 left-3 flex items-center text-gray-400">
            <svg viewBox="0 0 24 24" className="h-4 w-4">
              <path fill="currentColor" d="M10 2a8 8 0 1 1-5.3 13.9l-3.4 3.4 1.4 1.4 3.4-3.4A8 8 0 0 1 10 2m0 2a6 6 0 1 0 0 12A6 6 0 0 0 10 4z"/>
            </svg>
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm kiếm môn thực tập"
            className="w-full h-9 rounded-lg border border-gray-300 bg-white pl-9 pr-3 text-xs sm:text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 touch-manipulation"
          />
        </div>

        <div className="flex gap-1.5 sm:gap-2 overflow-x-auto touch-manipulation">
          {(["all", "open", "full"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`h-8 sm:h-9 rounded-md px-2.5 sm:px-3 text-xs sm:text-sm border transition whitespace-nowrap touch-manipulation ${
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

      {/* Subject Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
        {filtered.map((subject) => {
          // Calculate registration status
          const now = new Date();
          const regStart = subject.registrationStartDate ? new Date(subject.registrationStartDate) : null;
          const regEnd = subject.registrationEndDate ? new Date(subject.registrationEndDate) : null;
          
          let regStatus: 'not-started' | 'open' | 'full' | 'ended' = 'open';
          if (regStart && now < regStart) regStatus = 'not-started';
          else if (regEnd && now > regEnd) regStatus = 'ended';
          else if (subject.currentStudents >= subject.maxStudents) regStatus = 'full';
          else if (subject.status === 'locked') regStatus = 'ended';
          
          const canRegister = regStatus === 'open' && !studentRegistration;
          
          return (
            <div key={subject.id} className="bg-white rounded-lg sm:rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow flex flex-col h-auto sm:h-[450px]">
              <div className="p-3 sm:p-6 flex flex-col flex-1">
                <div className="flex items-start justify-between mb-2 sm:mb-3 gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm sm:text-base text-gray-900 mb-1 line-clamp-1">
                      {subject.title || subject.name}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-600 font-mono">{subject.id}</p>
                  </div>
                  <StatusChip status={regStatus === 'full' ? 'full' : regStatus === 'open' ? 'open' : 'closed'} />
                </div>

                <div className="mb-3 sm:mb-4 flex-shrink-0" style={{ height: 'auto', minHeight: '40px' }}>
                  <p className="text-xs sm:text-sm text-gray-600 leading-5 sm:leading-6 line-clamp-2">
                    {truncateText(subject.description || 'Mô tả môn thực tập', 2)}
                  </p>
                </div>

                <div className="mb-3 sm:mb-4 flex-shrink-0">
                  <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
                    <span className="text-gray-500">Ban chủ nhiệm:</span>
                    <span className="font-medium text-blue-700 truncate">
                      {subject.manager?.name || subject.bcnManager?.name}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm flex-1">
                  <div className="flex justify-between gap-2">
                    <span className="text-gray-500">Giảng viên:</span>
                    <span className="font-medium">{subject.lecturers?.length || 0} người</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-gray-500">Số lượng:</span>
                    <span className="font-medium">
                      {remainingSpots(subject)} chỗ trống
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-gray-500">Thời gian:</span>
                    <span className="font-medium">{subject.duration || '8 tuần'}</span>
                  </div>
                  {subject.registrationEndDate && (
                    <div className="flex justify-between gap-2">
                      <span className="text-gray-500">Hạn đăng ký:</span>
                      <span className="font-medium">{dayjs(subject.registrationEndDate).format("DD/MM/YYYY")}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 sm:mt-6 flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => { setViewingSubject(subject); setOpenView(true); }}
                    className="flex-1 h-8 sm:h-9 px-2 sm:px-3 rounded-md border border-gray-300 bg-white text-gray-700 text-xs sm:text-sm hover:bg-gray-50 touch-manipulation"
                  >
                    Xem chi tiết
                  </button>
                  <button
                    onClick={() => handleRegisterClick(subject)}
                    disabled={!canRegister}
                    className="flex-1 h-8 sm:h-9 px-2 sm:px-3 rounded-md bg-blue-600 text-white text-xs sm:text-sm hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed touch-manipulation"
                  >
                    {regStatus === 'full' ? 'Đã đầy' : 
                     regStatus === 'ended' ? 'Hết hạn' :
                     regStatus === 'not-started' ? 'Chưa mở' :
                     studentRegistration ? 'Đã đăng ký' : 'Đăng ký'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-8 sm:py-12 px-3">
          <div className="text-gray-500 mb-2 text-xs sm:text-sm">Không tìm thấy môn thực tập phù hợp</div>
          <button
            onClick={() => { setQuery(""); setStatusFilter("all"); }}
            className="text-blue-600 hover:text-blue-700 text-xs sm:text-sm touch-manipulation"
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
        canRegister={!studentRegistration}
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
        currentRegistration={studentRegistration}
        subjects={subjects}
      />
    </div>
  );
};

export default InternshipSubjectRegister;
