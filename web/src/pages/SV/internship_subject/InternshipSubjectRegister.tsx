import React, { useMemo, useState } from "react";
import type { InternshipSubject, StudentRegistration } from "./InternshipSubjectTypes";
import ViewSubjectDialog from "./ViewSubjectDialog";
import RegisterSubjectDialog from "./RegisterSubjectDialog";
import AlreadyRegisteredDialog from "./AlreadyRegisteredDialog";
import dayjs from "dayjs";

// Mock data with updated structure
const MOCK_SUBJECTS: InternshipSubject[] = [
  {
    id: "sub1",
    name: "Thực tập Phát triển Web",
    code: "CNTT-TT001",
    description: "Thực tập tại các công ty công nghệ về phát triển ứng dụng web với các framework hiện đại như React, Vue.js và Node.js",
    instructors: [
      { id: "GV001", name: "TS. Nguyễn Văn A", studentCount: 8, maxStudents: 10 },
      { id: "GV002", name: "ThS. Trần Thị B", studentCount: 6, maxStudents: 10 },
      { id: "GV003", name: "TS. Lê Văn C", studentCount: 9, maxStudents: 10 },
    ],
    bcnManager: { id: "BCN001", name: "PGS. Phạm Văn D" },
    maxStudents: 30,
    currentStudents: 23,
    credits: 4,
    duration: "8 tuần",
    startDate: "2025-02-01",
    endDate: "2025-03-30",
    requirements: ["Hoàn thành môn Lập trình Web", "GPA >= 2.5", "Đã học xong năm 3"],
    status: "open",
  },
  {
    id: "sub2",
    name: "Thực tập Phân tích Dữ liệu",
    code: "CNTT-TT002",
    description: "Thực tập về phân tích và xử lý dữ liệu lớn sử dụng các công cụ như Python, R và các framework machine learning",
    instructors: [
      { id: "GV004", name: "PGS. Hoàng Thị E", studentCount: 10, maxStudents: 10 },
      { id: "GV005", name: "TS. Võ Văn F", studentCount: 10, maxStudents: 10 },
    ],
    bcnManager: { id: "BCN001", name: "PGS. Phạm Văn D" },
    maxStudents: 20,
    currentStudents: 20,
    credits: 4,
    duration: "8 tuần",
    startDate: "2025-02-01",
    endDate: "2025-03-30",
    requirements: ["Hoàn thành môn Cơ sở dữ liệu", "Hoàn thành môn Thống kê", "GPA >= 3.0"],
    status: "full",
  },
  {
    id: "sub3",
    name: "Thực tập An toàn Thông tin",
    code: "CNTT-TT003",
    description: "Thực tập về bảo mật hệ thống và mạng máy tính trong môi trường doanh nghiệp thực tế",
    instructors: [
      { id: "GV006", name: "TS. Đặng Văn G", studentCount: 4, maxStudents: 8 },
      { id: "GV007", name: "ThS. Bùi Thị H", studentCount: 3, maxStudents: 7 },
    ],
    bcnManager: { id: "BCN002", name: "TS. Nguyễn Thị I" },
    maxStudents: 15,
    currentStudents: 7,
    credits: 4,
    duration: "8 tuần",
    startDate: "2025-02-15",
    endDate: "2025-04-15",
    requirements: ["Hoàn thành môn An toàn Mạng", "GPA >= 2.8"],
    status: "open",
  },
];

const MOCK_REGISTRATION: StudentRegistration | null = null;

const StatusChip: React.FC<{ status: InternshipSubject['status'] }> = ({ status }) => {
  const statusMap = {
    open: { text: "Đang mở", color: "bg-green-50 text-green-700 ring-green-200" },
    full: { text: "Đã đầy", color: "bg-red-50 text-red-700 ring-red-200" },
    closed: { text: "Đã đóng", color: "bg-gray-50 text-gray-700 ring-gray-200" },
  };
  const { text, color } = statusMap[status];
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${color}`}>
      {text}
    </span>
  );
};

const InternshipSubjectRegister: React.FC = () => {
  const [subjects] = useState<InternshipSubject[]>(MOCK_SUBJECTS);
  const [studentRegistration, setStudentRegistration] = useState<StudentRegistration | null>(MOCK_REGISTRATION);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "full">("all");

  // Dialogs
  const [viewingSubject, setViewingSubject] = useState<InternshipSubject | null>(null);
  const [openView, setOpenView] = useState(false);
  const [registeringSubject, setRegisteringSubject] = useState<InternshipSubject | null>(null);
  const [openRegister, setOpenRegister] = useState(false);
  const [openAlreadyRegistered, setOpenAlreadyRegistered] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return subjects.filter((subject) => {
      const byStatus = statusFilter === "all" || subject.status === statusFilter;
      const byQuery = !q || 
        subject.name.toLowerCase().includes(q) || 
        subject.code.toLowerCase().includes(q) ||
        subject.instructors.some(inst => inst.name.toLowerCase().includes(q));
      return byStatus && byQuery;
    });
  }, [subjects, query, statusFilter]);

  const handleRegisterClick = (subject: InternshipSubject) => {
    if (studentRegistration) {
      setOpenAlreadyRegistered(true);
    } else if (subject.status === "full") {
      // Should not happen due to button being disabled, but just in case
      return;
    } else {
      setRegisteringSubject(subject);
      setOpenRegister(true);
    }
  };

  const handleRegistrationSuccess = (registration: StudentRegistration) => {
    setStudentRegistration(registration);
    setOpenRegister(false);
  };

  const remainingSpots = (subject: InternshipSubject) => subject.maxStudents - subject.currentStudents;

  const truncateText = (text: string, maxLines: number = 2) => {
    const words = text.split(' ');
    const wordsPerLine = 8; // Approximate words per line
    const maxWords = maxLines * wordsPerLine;
    if (words.length <= maxWords) return text;
    return words.slice(0, maxWords).join(' ') + '...';
  };

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
        {filtered.map((subject) => (
          <div key={subject.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow flex flex-col h-[400px]">
            <div className="p-6 flex flex-col flex-1">
              {/* Header with status */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 mb-1 line-clamp-1">{subject.name}</h3>
                  <p className="text-sm text-gray-600 font-mono">{subject.code}</p>
                </div>
                <StatusChip status={subject.status} />
              </div>

              {/* Description - fixed height */}
              <div className="mb-4 flex-shrink-0" style={{ height: '48px' }}>
                <p className="text-sm text-gray-600 leading-6">
                  {truncateText(subject.description, 2)}
                </p>
              </div>

              {/* BCN Manager */}
              <div className="mb-4 flex-shrink-0">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500">Ban chủ nhiệm:</span>
                  <span className="font-medium text-blue-700">{subject.bcnManager.name}</span>
                </div>
              </div>

              {/* Subject details */}
              <div className="space-y-2 text-sm flex-1">
                <div className="flex justify-between">
                  <span className="text-gray-500">Giảng viên:</span>
                  <span className="font-medium">{subject.instructors.length} người</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Số lượng:</span>
                  <span className="font-medium">
                    {remainingSpots(subject)} chỗ trống
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Thời gian:</span>
                  <span className="font-medium">{subject.duration}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Bắt đầu:</span>
                  <span className="font-medium">{dayjs(subject.startDate).format("DD/MM/YYYY")}</span>
                </div>
              </div>

              {/* Action buttons - always at bottom */}
              <div className="mt-6 flex gap-2 flex-shrink-0">
                <button
                  onClick={() => { setViewingSubject(subject); setOpenView(true); }}
                  className="flex-1 h-9 px-3 rounded-md border border-gray-300 bg-white text-gray-700 text-sm hover:bg-gray-50"
                >
                  Xem chi tiết
                </button>
                <button
                  onClick={() => handleRegisterClick(subject)}
                  disabled={subject.status === "full" || !!studentRegistration}
                  className="flex-1 h-9 px-3 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {subject.status === "full" ? "Đã đầy" : studentRegistration ? "Đã đăng ký" : "Đăng ký"}
                </button>
              </div>
            </div>
          </div>
        ))}
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
