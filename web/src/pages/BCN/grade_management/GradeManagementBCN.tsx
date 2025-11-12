import React, { useState, useEffect } from 'react';
import PageLayout from '../../../components/UI/PageLayout';
import Pagination from '../../../components/UI/Pagination';
import { Icons } from '../../../components/UI/Icons';
import {
  getBCNSubmittedGrades,
  type InternshipGrade,
  getGradeStatusText,
  getGradeStatusColor,
  getWorkTypeText
} from '../../../services/gradeApi';
import dayjs from 'dayjs';
import { useDebounce } from '../../../hooks/useDebounce';
import EmptyState from '../../../components/UI/EmptyState';
import { useToast } from '../../../components/UI/Toast';
import ViewGradeDialog from './ViewGradeDialog';

const GradeManagementBCN: React.FC = () => {
  const { showError } = useToast();
  const [grades, setGrades] = useState<InternshipGrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGrade, setSelectedGrade] = useState<InternshipGrade | null>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    loadGrades();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadGrades = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getBCNSubmittedGrades();
      setGrades(response.grades);
    } catch (err) {
      console.error('Failed to load grades:', err);
      const errorMsg = 'Không thể tải danh sách điểm. Vui lòng thử lại.';
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
      grade.khoa?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      (grade.supervisor?.name || '').toLowerCase().includes(debouncedSearchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || grade.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Pagination
  const totalPages = Math.ceil(filteredGrades.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedGrades = filteredGrades.slice(startIndex, startIndex + itemsPerPage);

  const handleViewGrade = (grade: InternshipGrade) => {
    setSelectedGrade(grade);
    setShowViewDialog(true);
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
            onClick={loadGrades}
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
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-4 sm:mb-6 flex-wrap sm:items-center">
        <div className="relative w-full sm:w-[380px]">
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
            placeholder="Tìm kiếm theo tên sinh viên, MSSV, khoa..."
            className="w-full h-9 sm:h-10 rounded-lg border border-gray-300 bg-white pl-8 pr-3 text-xs sm:text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 touch-manipulation"
            disabled={loading}
          />
        </div>

        {(["all", "submitted", "approved", "rejected"] as const).map((k) => (
          <button
            key={k}
            onClick={() => {
              setStatusFilter(k);
              setCurrentPage(1);
            }}
            disabled={loading}
            className={`h-9 sm:h-10 rounded-lg px-3 text-xs sm:text-sm border transition disabled:opacity-50 touch-manipulation w-full sm:w-auto ${
              statusFilter === k
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            }`}
          >
            {k === "all" ? "Tất cả" : k === "submitted" ? "Chờ duyệt" : k === "approved" ? "Đã duyệt" : "Từ chối"}
          </button>
        ))}
      </div>

      <PageLayout>
      <div className="space-y-6">

        {/* Grades list */}
        <div className="bg-white border border-gray-200 rounded-lg sm:rounded-xl overflow-hidden">
          {paginatedGrades.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={grades.length === 0 ? "📊" : "🔍"}
                title={grades.length === 0 ? "Chưa có điểm nào" : "Không tìm thấy điểm phù hợp"}
                description={
                  grades.length === 0
                    ? "Các điểm đã nộp sẽ xuất hiện tại đây"
                    : "Thử điều chỉnh bộ lọc để xem nhiều kết quả hơn"
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr className="text-left text-xs font-semibold text-gray-600">
                    <th className="px-3 sm:px-4 py-2.5 sm:py-3 min-w-[150px]">Sinh viên</th>
                    <th className="px-3 sm:px-4 py-2.5 sm:py-3 min-w-[120px]">Khoa</th>
                    <th className="px-3 sm:px-4 py-2.5 sm:py-3 min-w-[140px]">Giảng viên</th>
                    <th className="px-3 sm:px-4 py-2.5 sm:py-3 min-w-[140px]">Công việc</th>
                    <th className="px-3 sm:px-4 py-2.5 sm:py-3 min-w-[80px]">Điểm</th>
                    <th className="px-3 sm:px-4 py-2.5 sm:py-3 min-w-[140px]">Trạng thái</th>
                    <th className="px-3 sm:px-4 py-2.5 sm:py-3 min-w-[100px]">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedGrades.map((grade, index) => (
                    <tr key={grade.id || `grade-${index}`} className="hover:bg-gray-50 transition-colors">
                      <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                        <div className="font-medium text-xs sm:text-sm text-gray-900">{grade.student?.name || 'Chưa có tên'}</div>
                        <div className="text-xs text-gray-500">{grade.student?.id || '--'}</div>
                      </td>
                      <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                        <div className="font-medium text-xs sm:text-sm text-gray-900">{grade.khoa || 'Chưa có khoa'}</div>
                        <div className="text-xs text-gray-500">
                          Nộp: {grade.submittedAt ? dayjs(grade.submittedAt).format('DD/MM/YYYY HH:mm') : '--'}
                        </div>
                      </td>
                      <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                        <div className="font-medium text-xs sm:text-sm text-gray-900">{grade.supervisor?.name || 'Chưa có GVHD'}</div>
                        <div className="text-xs text-gray-500">{grade.supervisor?.email || '--'}</div>
                      </td>
                      <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                        <div className="text-xs sm:text-sm text-gray-900">{getWorkTypeText(grade.workType)}</div>
                        {grade.workType === 'thuc_tap' && grade.company && (
                          <div className="text-xs text-gray-500">{grade.company.name}</div>
                        )}
                        {grade.workType === 'do_an' && grade.projectTopic && (
                          <div className="text-xs text-gray-500 truncate max-w-[140px]" title={grade.projectTopic}>
                            {grade.projectTopic}
                          </div>
                        )}
                      </td>
                      <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                        <div className="text-base sm:text-lg font-bold text-gray-900">
                          {grade.finalGrade ? grade.finalGrade.toFixed(1) : '--'}
                        </div>
                        <div className="text-xs text-gray-500">{grade.letterGrade || '--'}</div>
                      </td>
                      <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getGradeStatusColor(grade.status)}`}>
                          {getGradeStatusText(grade.status)}
                        </span>
                      </td>
                      <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                        <button
                          onClick={() => handleViewGrade(grade)}
                          className="text-blue-600 hover:text-blue-800 font-medium text-xs sm:text-sm touch-manipulation"
                        >
                          Xem
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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

      {/* View Grade Dialog */}
      {selectedGrade && (
        <ViewGradeDialog
          open={showViewDialog}
          grade={selectedGrade}
          onClose={() => {
            setShowViewDialog(false);
            setSelectedGrade(null);
          }}
        />
      )}
    </>
  );
};

export default GradeManagementBCN;
