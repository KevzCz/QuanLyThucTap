import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '../../../components/UI/PageLayout';
import SearchInput from '../../../components/UI/SearchInput';
import FilterButtonGroup from '../../../components/UI/FilterButtonGroup';
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

const GradeReviewList: React.FC = () => {
  const navigate = useNavigate();
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
      setError('Không thể tải danh sách điểm cần duyệt. Vui lòng thử lại.');
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

  const statusOptions = [
    { key: 'all', label: 'Tất cả' },
    { key: 'submitted', label: 'Chờ duyệt' },
    { key: 'approved', label: 'Đã duyệt' },
    { key: 'rejected', label: 'Từ chối' }
  ];

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
    <PageLayout>
      <div className="space-y-6">
        {/* Filters */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Tìm kiếm theo tên sinh viên, MSSV, môn học, giảng viên..."
            />
            <FilterButtonGroup
              options={statusOptions}
              value={statusFilter}
              onChange={setStatusFilter}
            />
          </div>
        </div>

        {/* Statistics */}
        {grades.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-yellow-700">Chờ duyệt</p>
                  <p className="text-3xl font-bold text-yellow-900 mt-1">
                    {grades.filter(g => g.status === 'submitted').length}
                  </p>
                </div>
                <div className="w-10 h-10 flex items-center justify-center text-3xl">⏳</div>
              </div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-700">Đã duyệt</p>
                  <p className="text-3xl font-bold text-green-900 mt-1">
                    {grades.filter(g => g.status === 'approved').length}
                  </p>
                </div>
                <Icons.check className="w-10 h-10 text-green-400" />
              </div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-700">Từ chối</p>
                  <p className="text-3xl font-bold text-red-900 mt-1">
                    {grades.filter(g => g.status === 'rejected').length}
                  </p>
                </div>
                <Icons.close className="w-10 h-10 text-red-400" />
              </div>
            </div>
          </div>
        )}

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
  );
};

export default GradeReviewList;