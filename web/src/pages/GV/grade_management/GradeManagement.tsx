import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '../../../components/UI/PageLayout';
import SearchInput from '../../../components/UI/SearchInput';
import FilterButtonGroup from '../../../components/UI/FilterButtonGroup';
import Pagination from '../../../components/UI/Pagination';
import { Icons } from '../../../components/UI/Icons';
import { 
  getSupervisorGrades, 
  type GradeSummary,
  getGradeStatusText,
  getGradeStatusColor,
  getWorkTypeText
} from '../../../services/gradeApi';
import dayjs from 'dayjs';
import { useDebounce } from '../../../hooks/useDebounce';
import EmptyState from '../../../components/UI/EmptyState';
import { useToast } from '../../../components/UI/Toast';

const GradeManagement: React.FC = () => {
  const navigate = useNavigate();
  const { showError } = useToast();
  const [grades, setGrades] = useState<GradeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters and pagination
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const loadGrades = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getSupervisorGrades(statusFilter);
      setGrades(response.grades);
    } catch (err) {
      console.error('Failed to load grades:', err);
      const errorMsg = 'Không thể tải danh sách điểm. Vui lòng thử lại.';
      setError(errorMsg);
      showError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, showError]);

  useEffect(() => {
    loadGrades();
  }, [loadGrades]);

  // Filter and paginate grades
  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    return grades.filter(grade => {
      const byQuery = !q || 
        grade.student.name.toLowerCase().includes(q) ||
        grade.student.id.toLowerCase().includes(q) ||
        grade.subject.title.toLowerCase().includes(q);
      return byQuery;
    });
  }, [grades, debouncedQuery]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = filtered.slice((page - 1) * pageSize, page * pageSize);

  // Status filter options
  const statusOptions = [
    { key: 'all', label: 'Tất cả' },
    { key: 'in_progress', label: 'Đang thực hiện' },
    { key: 'draft_completed', label: 'Đã hoàn thành' },
    { key: 'submitted', label: 'Đã nộp' },
    { key: 'approved', label: 'Đã duyệt' },
    { key: 'rejected', label: 'Bị từ chối' }
  ];

  const handleGradeClick = (grade: GradeSummary) => {
    navigate(`/grade-management/${grade.student.id}`, {
      state: { student: grade.student, subject: grade.subject }
    });
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 60) return 'bg-yellow-500';
    if (percentage >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  if (loading) {
    return (
      <PageLayout>
        <div className="animate-pulse space-y-4">
          <div className="h-16 bg-gray-200 rounded"></div>
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
      {/* Search and Filters - Outside PageLayout */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
        <SearchInput
          value={query}
          onChange={(value) => {
            setQuery(value);
            setPage(1);
          }}
          placeholder="Tìm kiếm sinh viên, môn học..."
          width="w-[300px]"
        />

        <FilterButtonGroup
          options={statusOptions}
          value={statusFilter}
          onChange={(value) => {
            setStatusFilter(value);
            setPage(1);
          }}
        />

        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Icons.users className="w-4 h-4" />
          <span>{filtered.length} sinh viên</span>
        </div>
      </div>

      <PageLayout>

      <div className="space-y-4">
        {current.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
            <Icons.users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {query || statusFilter !== 'all' ? 'Không tìm thấy sinh viên nào' : 'Chưa có sinh viên được phân công'}
            </h3>
            <p className="text-gray-600">
              {query || statusFilter !== 'all' 
                ? 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm'
                : 'Bạn chưa được phân công hướng dẫn sinh viên nào.'
              }
            </p>
          </div>
        ) : (
          <>
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Sinh viên
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Môn thực tập
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Loại
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tiến độ
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Điểm
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Trạng thái
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cập nhật
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Thao tác
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {current.map((grade) => (
                      <tr 
                        key={grade.id} 
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => handleGradeClick(grade)}
                      >
                        <td className="px-6 py-4">
                          <div>
                            <div className="font-medium text-gray-900">{grade.student.name}</div>
                            <div className="text-sm text-gray-500">{grade.student.id}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <div className="font-medium text-gray-900">{grade.subject.title}</div>
                            <div className="text-sm text-gray-500">{grade.subject.id}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              grade.workType === 'thuc_tap' 
                                ? 'bg-blue-100 text-blue-800' 
                                : 'bg-purple-100 text-purple-800'
                            }`}>
                              {getWorkTypeText(grade.workType)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full transition-all ${getProgressColor(grade.progressPercentage)}`}
                                style={{ width: `${grade.progressPercentage}%` }}
                              />
                            </div>
                            <span className="text-sm text-gray-600 w-10 text-right">
                              {grade.progressPercentage}%
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {grade.finalGrade ? (
                            <div>
                              <div className="font-medium text-gray-900">
                                {grade.finalGrade.toFixed(1)}
                              </div>
                              <div className="text-sm text-gray-500">
                                {grade.letterGrade}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">Chưa chấm</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getGradeStatusColor(grade.status)}`}>
                            {getGradeStatusText(grade.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {dayjs(grade.updatedAt).format('DD/MM/YYYY')}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleGradeClick(grade);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            <Icons.edit className="w-4 h-4" />
                            Chấm điểm
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {current.length === 0 && !loading && (
                  <div className="py-12">
                    <EmptyState
                      icon={grades.length === 0 ? "📊" : "🔍"}
                      title={grades.length === 0 ? "Chưa có điểm cần chấm" : "Không tìm thấy điểm"}
                      description={
                        grades.length === 0
                          ? "Bạn sẽ thấy danh sách điểm của sinh viên được phân công tại đây."
                          : "Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc."
                      }
                      secondaryAction={
                        grades.length > 0
                          ? {
                              label: "Xóa bộ lọc",
                              onClick: () => {
                                setQuery("");
                                setStatusFilter("all");
                                setPage(1);
                              },
                            }
                          : undefined
                      }
                    />
                  </div>
                )}
              </div>
            </div>

            {pageCount > 1 && (
              <Pagination
                currentPage={page}
                totalPages={pageCount}
                onPageChange={setPage}
              />
            )}
          </>
        )}
      </div>
    </PageLayout>
    </>
  );
};

export default GradeManagement;