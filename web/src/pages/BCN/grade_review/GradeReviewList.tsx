import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '../../../components/UI/PageLayout';
import Pagination from '../../../components/UI/Pagination';
import { Icons } from '../../../components/UI/Icons';
import {
  getBCNSubmittedGrades,
  type InternshipGrade,
  getGradeStatusText,
  getGradeStatusColor
} from '../../../services/gradeApi';
import dayjs from 'dayjs';
import { useDebounce } from '../../../hooks/useDebounce';
import EmptyState from '../../../components/UI/EmptyState';
import { useToast } from '../../../components/UI/Toast';

const GradeReviewList: React.FC = () => {
  const navigate = useNavigate();
  const { showError } = useToast();
  const [grades, setGrades] = useState<InternshipGrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    loadSubmittedGrades();
  }, []);

  const loadSubmittedGrades = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getBCNSubmittedGrades();
      setGrades(response.grades);
    } catch (err) {
      console.error('Failed to load submitted grades:', err);
      const errorMsg = 'Không thể tải danh sách điểm cần duyệt. Vui lòng thử lại.';
      setError(errorMsg);
      showError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Filter grades
  const filteredGrades = grades.filter(grade => {
    const matchesSearch = 
      grade.student?.name?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      grade.student?.id?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      grade.subject?.title?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      (grade.supervisor?.name || '').toLowerCase().includes(debouncedSearchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || grade.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Pagination
  const totalPages = Math.ceil(filteredGrades.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedGrades = filteredGrades.slice(startIndex, startIndex + itemsPerPage);

  const handleReviewGrade = (gradeId: string) => {
    navigate(`/grade-review/${gradeId}`);
  };

  if (loading) {
    return (
      <PageLayout>
        <div className="animate-pulse space-y-4">
          <div className="h-20 bg-gray-200 rounded"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-800">
            <Icons.close className="w-5 h-5" />
            <span className="font-medium">Lỗi</span>
          </div>
          <p className="text-red-700 mt-1">{error}</p>
          <button
            onClick={loadSubmittedGrades}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Thử lại
          </button>
        </div>
      </PageLayout>
    );
  }

  return (
    <>
      {/* Search and Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="relative">
            <span className="absolute inset-y-0 left-3 flex items-center text-gray-400">
              <svg viewBox="0 0 24 24" className="h-4 w-4">
                <path
                  fill="currentColor"
                  d="M10 2a8 8 0 1 1-5.3 13.9l-3.4 3.4 1.4 1.4 3.4-3.4A8 8 0 0 1 10 2m0 2a6 6 0 1 0 0 12A6 6 0 0 0 10 4z"
                />
              </svg>
            </span>
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm theo tên sinh viên, MSSV, môn học..."
              className="w-[380px] h-10 rounded-lg border border-gray-300 bg-white pl-8 pr-3 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
          </div>

          <div className="flex gap-2">
            {(["all", "submitted", "approved", "rejected"] as const).map((k) => (
              <button
                key={k}
                onClick={() => {
                  setStatusFilter(k);
                  setCurrentPage(1);
                }}
                disabled={loading}
                className={`h-10 rounded-lg px-3 text-sm border transition disabled:opacity-50 ${
                  statusFilter === k
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                {k === "all" ? "Tất cả" : k === "submitted" ? "Chờ duyệt" : k === "approved" ? "Đã duyệt" : "Từ chối"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <PageLayout>
      <div className="space-y-6">

        {/* Grades list */}
        <div className="bg-white border border-gray-200 rounded-lg">
          {paginatedGrades.length === 0 ? (
            <EmptyState
              icon={grades.length === 0 ? "📊" : "🔍"}
              title={grades.length === 0 ? "Chưa có điểm nào cần duyệt" : "Không tìm thấy điểm phù hợp"}
              description={
                grades.length === 0
                  ? "Các điểm đã nộp sẽ xuất hiện tại đây để bạn duyệt"
                  : "Thử điều chỉnh bộ lọc để xem nhiều kết quả hơn"
              }
            />
          ) : (
            <>
              {/* Table header */}
              <div className="grid grid-cols-12 gap-4 p-4 bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-700">
                <div className="col-span-3">Sinh viên</div>
                <div className="col-span-3">Môn thực tập</div>
                <div className="col-span-2">Giảng viên</div>
                <div className="col-span-1">Điểm</div>
                <div className="col-span-2">Trạng thái</div>
                <div className="col-span-1">Thao tác</div>
              </div>

              {/* Table rows */}
              <div className="divide-y divide-gray-200">
                {paginatedGrades.map((grade, index) => (
                  <div key={grade.id || `grade-${index}`} className="grid grid-cols-12 gap-4 p-4 hover:bg-gray-50 transition-colors">
                    <div className="col-span-3">
                      <div className="font-medium text-gray-900">{grade.student?.name || 'Chưa có tên'}</div>
                      <div className="text-sm text-gray-500">{grade.student?.id || '--'}</div>
                    </div>
                    <div className="col-span-3">
                      <div className="font-medium text-gray-900">{grade.subject?.title || 'Chưa có môn học'}</div>
                      <div className="text-sm text-gray-500">
                        Nộp: {grade.submittedAt ? dayjs(grade.submittedAt).format('DD/MM/YYYY HH:mm') : '--'}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <div className="font-medium text-gray-900">{grade.supervisor?.name || 'Chưa có GVHD'}</div>
                      <div className="text-sm text-gray-500">{grade.supervisor?.email || '--'}</div>
                    </div>
                    <div className="col-span-1">
                      <div className="text-lg font-bold text-gray-900">
                        {grade.finalGrade ? grade.finalGrade.toFixed(1) : '--'}
                      </div>
                      <div className="text-sm text-gray-500">{grade.letterGrade || '--'}</div>
                    </div>
                    <div className="col-span-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getGradeStatusColor(grade.status)}`}>
                        {getGradeStatusText(grade.status)}
                      </span>
                      {grade.status === 'rejected' && grade.bcnComment && (
                        <div className="text-xs text-red-600 mt-1 truncate" title={grade.bcnComment}>
                          {grade.bcnComment}
                        </div>
                      )}
                    </div>
                    <div className="col-span-1">
                      <button
                        onClick={() => {
                          const gradeId = grade.id || grade._id;
                          if (gradeId) handleReviewGrade(gradeId);
                        }}
                        className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                        disabled={!grade.id && !grade._id}
                      >
                        {grade.status === 'submitted' ? 'Duyệt' : 'Xem'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        )}
      </div>
      </PageLayout>
    </>
  );
};

export default GradeReviewList;