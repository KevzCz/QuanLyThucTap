import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageLayout from '../../../components/UI/PageLayout';
import { Icons } from '../../../components/UI/Icons';
import {
  getGradeDetailsForReview,
  reviewGrade,
  type InternshipGrade,
  getGradeComponentName,
  getMilestoneStatusText,
  getGradeStatusText,
  getGradeStatusColor
} from '../../../services/gradeApi';
import { resolveFileHref } from '../../../utils/fileLinks';
import dayjs from 'dayjs';

const GradeReviewDetail: React.FC = () => {
  const { gradeId } = useParams<{ gradeId: string }>();
  const navigate = useNavigate();

  const [grade, setGrade] = useState<InternshipGrade | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [bcnComment, setBcnComment] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  const loadGradeDetails = useCallback(async () => {
    if (!gradeId) return;
    
    try {
      setLoading(true);
      setError(null);
      const response = await getGradeDetailsForReview(gradeId);
      setGrade(response.grade);
      setBcnComment(response.grade.bcnComment || '');
    } catch (err) {
      console.error('Failed to load grade details:', err);
      setError('Không thể tải thông tin điểm. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, [gradeId]);

  useEffect(() => {
    loadGradeDetails();
  }, [loadGradeDetails]);

  const handleApprove = async () => {
    if (!gradeId || !grade) return;

    if (!confirm('Bạn có chắc chắn muốn duyệt điểm này? Sau khi duyệt sẽ không thể thay đổi.')) {
      return;
    }

    try {
      setProcessing(true);
      await reviewGrade(gradeId, 'approve', bcnComment.trim() || undefined);
      
      setGrade(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          status: 'approved' as const,
          bcnComment: bcnComment.trim() || '',
          approvedAt: new Date().toISOString()
        };
      });

      alert('Đã duyệt điểm thành công!');
    } catch (err) {
      console.error('Failed to approve grade:', err);
      alert('Không thể duyệt điểm. Vui lòng thử lại.');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!gradeId || !grade) return;

    if (!bcnComment.trim()) {
      alert('Vui lòng nhập lý do từ chối trước khi thực hiện.');
      return;
    }

    if (!confirm('Bạn có chắc chắn muốn từ chối điểm này? Điểm sẽ được trả về cho giảng viên chỉnh sửa.')) {
      return;
    }

    try {
      setProcessing(true);
      await reviewGrade(gradeId, 'reject', bcnComment.trim());
      
      setGrade(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          status: 'rejected' as const,
          bcnComment: bcnComment.trim(),
          rejectedAt: new Date().toISOString()
        };
      });

      alert('Đã từ chối điểm. Giảng viên sẽ nhận được thông báo.');
      setShowRejectDialog(false);
    } catch (err) {
      console.error('Failed to reject grade:', err);
      alert('Không thể từ chối điểm. Vui lòng thử lại.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <PageLayout title="Duyệt điểm chi tiết">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </PageLayout>
    );
  }

  if (error || !grade) {
    return (
      <PageLayout title="Duyệt điểm chi tiết">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-800">
            <Icons.close className="w-5 h-5" />
            <span className="font-medium">Lỗi</span>
          </div>
          <p className="text-red-700 mt-1">{error || 'Không tìm thấy thông tin điểm'}</p>
          <button
            onClick={() => navigate('/grade-review')}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Quay lại
          </button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Duyệt điểm chi tiết">
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <button
                  onClick={() => navigate('/grade-review')}
                  className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <Icons.close className="w-4 h-4" />
                  Quay lại
                </button>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">{grade.student?.name || 'Chưa có tên'}</h2>
              <p className="text-gray-600">{grade.student?.id || '--'} • {grade.student?.email || '--'}</p>
              <p className="text-gray-600">{grade.subject?.title || 'Chưa có môn học'}</p>
              {grade.supervisor && (
                <p className="text-gray-600">GVHD: {grade.supervisor.name}</p>
              )}
            </div>
            <div className="text-right">
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getGradeStatusColor(grade.status)}`}>
                {getGradeStatusText(grade.status)}
              </div>
              {grade.finalGrade && (
                <div className="mt-2">
                  <div className="text-2xl font-bold text-gray-900">{grade.finalGrade.toFixed(1)}</div>
                  <div className="text-sm text-gray-500">{grade.letterGrade}</div>
                </div>
              )}
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Ngày bắt đầu:</span>
                <div className="font-medium">{dayjs(grade.startDate).format('DD/MM/YYYY')}</div>
              </div>
              <div>
                <span className="text-gray-500">Ngày kết thúc:</span>
                <div className="font-medium">{dayjs(grade.endDate).format('DD/MM/YYYY')}</div>
              </div>
              <div>
                <span className="text-gray-500">Tiến độ:</span>
                <div className="font-medium">{grade.progressPercentage}%</div>
              </div>
              <div>
                <span className="text-gray-500">Nộp lúc:</span>
                <div className="font-medium">
                  {grade.submittedAt ? dayjs(grade.submittedAt).format('DD/MM/YYYY HH:mm') : '--'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Milestones */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Timeline thực tập</h3>
          <div className="space-y-3">
            {grade.milestones.map((milestone) => (
              <div key={milestone.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h4 className="font-medium text-gray-900">{milestone.title}</h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      milestone.status === 'completed' ? 'bg-green-100 text-green-800' :
                      milestone.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                      milestone.status === 'overdue' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {getMilestoneStatusText(milestone.status)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Hạn: {dayjs(milestone.dueDate).format('DD/MM/YYYY')}
                  </p>
                  {milestone.supervisorNotes && (
                    <p className="text-sm text-gray-700 mt-2 bg-white p-2 rounded border">
                      <strong>Ghi chú GVHD:</strong> {milestone.supervisorNotes}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Grade Components */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Chi tiết điểm</h3>
          <div className="space-y-4">
            {grade.gradeComponents.map((component) => (
              <div key={component.type} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900">{getGradeComponentName(component.type)}</h4>
                  <p className="text-sm text-gray-500">Trọng số: {(component.weight * 100)}%</p>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-900">{component.score.toFixed(1)}</div>
                  <div className="text-sm text-gray-500">Điểm</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-600">
                    {(component.score * component.weight).toFixed(1)}
                  </div>
                  <div className="text-sm text-gray-500">Điểm có trọng số</div>
                </div>
                <div>
                  {component.comment && (
                    <p className="text-sm text-gray-700 bg-white p-2 rounded border">
                      {component.comment}
                    </p>
                  )}
                </div>
              </div>
            ))}
            
            {/* Final grade calculation */}
            <div className="border-t pt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-blue-50 rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-900">{grade.finalGrade?.toFixed(1) || '--'}</div>
                  <div className="text-sm text-blue-700">Điểm tổng kết</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-900">{grade.letterGrade || '--'}</div>
                  <div className="text-sm text-blue-700">Điểm chữ</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-900">{grade.progressPercentage}%</div>
                  <div className="text-sm text-blue-700">Hoàn thành</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Supervisor Final Comment */}
        {grade.supervisorFinalComment && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Nhận xét của giảng viên hướng dẫn</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-700">{grade.supervisorFinalComment}</p>
            </div>
          </div>
        )}

        {/* Grading Notes and Files */}
        {(grade.gradingNotes || (grade.gradingFiles && grade.gradingFiles.length > 0)) && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Ghi chú và tài liệu chấm điểm</h3>
            
            {grade.gradingNotes && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Ghi chú chi tiết:</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-700 whitespace-pre-wrap">{grade.gradingNotes}</p>
                </div>
              </div>
            )}
            
            {grade.gradingFiles && grade.gradingFiles.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Tài liệu đính kèm:</h4>
                <div className="space-y-2">
                  {grade.gradingFiles.map((file, index) => (
                    <div key={file.id || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="text-blue-500">📎</div>
                        <div>
                          <p className="font-medium text-gray-900">{file.fileName}</p>
                          <p className="text-sm text-gray-500">
                            Tải lên: {dayjs(file.uploadedAt).format('DD/MM/YYYY HH:mm')}
                          </p>
                        </div>
                      </div>
                      <a
                        href={resolveFileHref(file.fileUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                      >
                        Tải xuống
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* BCN Review Section */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Duyệt điểm</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nhận xét của khoa
              </label>
              <textarea
                value={bcnComment}
                onChange={(e) => setBcnComment(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={4}
                placeholder="Nhập nhận xét về điểm thực tập của sinh viên..."
                disabled={grade.status === 'approved' || grade.status === 'rejected'}
              />
            </div>

            {grade.status === 'submitted' && (
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleApprove}
                  disabled={processing}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processing ? 'Đang xử lý...' : 'Duyệt điểm'}
                </button>
                <button
                  onClick={() => setShowRejectDialog(true)}
                  disabled={processing}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Từ chối
                </button>
              </div>
            )}

            {grade.status === 'approved' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-800">
                  <Icons.check className="w-5 h-5" />
                  <span className="font-medium">Điểm đã được duyệt</span>
                </div>
                <p className="text-green-700 mt-1">
                  Được duyệt vào {grade.approvedAt ? dayjs(grade.approvedAt).format('DD/MM/YYYY HH:mm') : dayjs(grade.submittedAt).format('DD/MM/YYYY HH:mm')}
                </p>
              </div>
            )}

            {grade.status === 'rejected' && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-red-800">
                  <Icons.close className="w-5 h-5" />
                  <span className="font-medium">Điểm đã bị từ chối</span>
                </div>
                <p className="text-red-700 mt-1">
                  Từ chối vào {grade.rejectedAt ? dayjs(grade.rejectedAt).format('DD/MM/YYYY HH:mm') : dayjs(grade.submittedAt).format('DD/MM/YYYY HH:mm')}
                </p>
                {grade.bcnComment && (
                  <p className="text-red-700 mt-2 font-medium">
                    Lý do: {grade.bcnComment}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Reject Dialog */}
        {showRejectDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Xác nhận từ chối điểm</h3>
              <p className="text-gray-600 mb-4">
                Bạn có chắc chắn muốn từ chối điểm này? Điểm sẽ được trả về cho giảng viên để chỉnh sửa.
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lý do từ chối (bắt buộc)
                </label>
                <textarea
                  value={bcnComment}
                  onChange={(e) => setBcnComment(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Nhập lý do từ chối..."
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowRejectDialog(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  onClick={handleReject}
                  disabled={!bcnComment.trim() || processing}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processing ? 'Đang xử lý...' : 'Từ chối'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
};

export default GradeReviewDetail;