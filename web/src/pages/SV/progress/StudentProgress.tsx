import React, { useState, useEffect, useCallback } from 'react';
import PageLayout from '../../../components/UI/PageLayout';
import { Icons } from '../../../components/UI/Icons';
import { useToast } from '../../../components/UI/Toast';
import { 
  getStudentProgress,
  type InternshipGrade,
  getMilestoneStatusText,
  getGradeStatusText,
  getGradeStatusColor,
  getWorkTypeText,
  getGradeComponentName,
  uploadGradingFiles,
  uploadMilestoneFiles,
  deleteMilestoneFile
} from '../../../services/gradeApi';
import { resolveFileHref } from '../../../utils/fileLinks';
import dayjs from 'dayjs';
import { useAuth } from '../../../contexts/UseAuth';

const StudentProgress: React.FC = () => {
  const { user } = useAuth();
  const [grade, setGrade] = useState<InternshipGrade | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingFileForMilestone, setUploadingFileForMilestone] = useState<string | null>(null);
  const { showError, showSuccess } = useToast();

  const loadProgress = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getStudentProgress();
      setGrade(response.grade);
    } catch (err) {
      console.error('Failed to load progress:', err);
      showError('Không thể tải thông tin tiến độ');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  const handleFileUpload = async (milestoneId: string, files: FileList | null) => {
    if (!files || files.length === 0 || !grade || !user) return;

    try {
      setUploadingFileForMilestone(milestoneId);

      // Upload files to server
      const uploadResponse = await uploadGradingFiles(files);

      // Prepare file data for milestone
      const fileData = uploadResponse.files.map((file) => ({
        id: file.filename,
        fileName: file.originalName,
        fileUrl: file.path
      }));

      // Add files to milestone
      const response = await uploadMilestoneFiles(user.id, milestoneId, fileData);

      // Update local state
      setGrade(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          milestones: prev.milestones.map(m =>
            m.id === milestoneId
              ? { ...m, fileSubmissions: response.fileSubmissions }
              : m
          )
        };
      });

      showSuccess('Tải file lên thành công');
    } catch (err) {
      console.error('Failed to upload files:', err);
      showError('Không thể tải file lên');
    } finally {
      setUploadingFileForMilestone(null);
    }
  };

  const handleFileDelete = async (milestoneId: string, fileId: string) => {
    if (!grade || !user) return;

    try {
      const response = await deleteMilestoneFile(user.id, milestoneId, fileId);

      // Update local state
      setGrade(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          milestones: prev.milestones.map(m =>
            m.id === milestoneId
              ? { ...m, fileSubmissions: response.fileSubmissions }
              : m
          )
        };
      });

      showSuccess('Xóa file thành công');
    } catch (err) {
      console.error('Failed to delete file:', err);
      showError('Không thể xóa file');
    }
  };

  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  if (loading) {
    return (
      <PageLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </PageLayout>
    );
  }

  if (!grade) {
    return (
      <PageLayout>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-center">
            <Icons.info className="h-6 w-6 text-yellow-600 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-yellow-800">Chưa có thông tin tiến độ</h3>
              <p className="text-sm text-yellow-700 mt-1">
                Bạn chưa được phân công giảng viên hướng dẫn hoặc chưa có thông tin đề tài.
              </p>
            </div>
          </div>
        </div>
      </PageLayout>
    );
  }

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 60) return 'bg-yellow-500';
    if (percentage >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getMilestoneStatusColor = (status: string) => {
    const colors = {
      'pending': 'bg-gray-100 text-gray-800',
      'in_progress': 'bg-blue-100 text-blue-800',
      'completed': 'bg-green-100 text-green-800',
      'overdue': 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <PageLayout>
      <div className="space-y-6">
        {/* Overview Card */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900">Tổng quan</h2>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getGradeStatusColor(grade.status)}`}>
              {getGradeStatusText(grade.status)}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-gray-500">Đề tài:</span>
                  <p className="text-sm text-gray-900">{grade.subject.title}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Loại:</span>
                  <p className="text-sm text-gray-900">{getWorkTypeText(grade.workType)}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Giảng viên hướng dẫn:</span>
                  <p className="text-sm text-gray-900">{grade.supervisor?.name || 'Chưa phân công'}</p>
                </div>
                {grade.workType === 'thuc_tap' && grade.company && (
                  <>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Công ty thực tập:</span>
                      <p className="text-sm text-gray-900">{grade.company.name}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Người hướng dẫn (công ty):</span>
                      <p className="text-sm text-gray-900">{grade.company.supervisorName || 'Chưa cập nhật'}</p>
                    </div>
                    {grade.company.supervisorPhone && (
                      <div>
                        <span className="text-sm font-medium text-gray-500">Điện thoại:</span>
                        <p className="text-sm text-gray-900">{grade.company.supervisorPhone}</p>
                      </div>
                    )}
                    {grade.company.supervisorEmail && (
                      <div>
                        <span className="text-sm font-medium text-gray-500">Email:</span>
                        <p className="text-sm text-gray-900">{grade.company.supervisorEmail}</p>
                      </div>
                    )}
                    {grade.company.address && (
                      <div>
                        <span className="text-sm font-medium text-gray-500">Địa chỉ:</span>
                        <p className="text-sm text-gray-900">{grade.company.address}</p>
                      </div>
                    )}
                  </>
                )}
                {grade.workType === 'do_an' && grade.projectTopic && (
                  <div>
                    <span className="text-sm font-medium text-gray-500">Chủ đề đồ án:</span>
                    <p className="text-sm text-gray-900">{grade.projectTopic}</p>
                  </div>
                )}
              </div>
            </div>

            <div>
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-gray-500">Ngày bắt đầu:</span>
                  <p className="text-sm text-gray-900">{dayjs(grade.startDate).format('DD/MM/YYYY')}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Ngày kết thúc:</span>
                  <p className="text-sm text-gray-900">{dayjs(grade.endDate).format('DD/MM/YYYY')}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Tiến độ:</span>
                  <div className="mt-1">
                    <div className="flex items-center">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${getProgressColor(grade.progressPercentage)}`}
                          style={{ width: `${grade.progressPercentage}%` }}
                        ></div>
                      </div>
                      <span className="ml-2 text-sm font-medium text-gray-700">
                        {grade.progressPercentage}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Milestones */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Các mốc thực hiện</h2>
          {grade.milestones.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Chưa có mốc thực hiện nào được thiết lập.</p>
          ) : (
            <div className="space-y-4">
              {grade.milestones.map((milestone) => (
                <div key={milestone.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-gray-900">{milestone.title}</h3>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getMilestoneStatusColor(milestone.status)}`}>
                      {getMilestoneStatusText(milestone.status)}
                    </span>
                  </div>
                  
                  {milestone.description && (
                    <p className="text-sm text-gray-600 mb-3">{milestone.description}</p>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-500">Hạn hoàn thành:</span>
                      <p className="text-gray-900">{dayjs(milestone.dueDate).format('DD/MM/YYYY HH:mm')}</p>
                    </div>
                    {milestone.completedAt && (
                      <div>
                        <span className="font-medium text-gray-500">Hoàn thành:</span>
                        <p className="text-gray-900">{dayjs(milestone.completedAt).format('DD/MM/YYYY HH:mm')}</p>
                      </div>
                    )}
                  </div>
                  
                  {milestone.supervisorNotes && (
                    <div className="mt-3 p-3 bg-blue-50 rounded">
                      <span className="font-medium text-blue-900 text-sm">Ghi chú từ giảng viên:</span>
                      <p className="text-blue-800 text-sm mt-1 whitespace-pre-wrap">{milestone.supervisorNotes}</p>
                    </div>
                  )}
                  
                  {/* File submissions (new system) */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-700 text-sm">Tài liệu nộp:</span>
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          multiple
                          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png"
                          onChange={(e) => handleFileUpload(milestone.id, e.target.files)}
                          className="hidden"
                          disabled={uploadingFileForMilestone === milestone.id}
                        />
                        <span className="inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:bg-gray-400">
                          {uploadingFileForMilestone === milestone.id ? (
                            <>
                              <div className="w-3 h-3 mr-1 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              Đang tải...
                            </>
                          ) : (
                            <>
                              <Icons.upload className="w-3 h-3 mr-1" />
                              Tải file lên
                            </>
                          )}
                        </span>
                      </label>
                    </div>

                    {milestone.fileSubmissions && milestone.fileSubmissions.length > 0 ? (
                      <div className="space-y-2">
                        {milestone.fileSubmissions.map((file) => (
                          <div key={file.id} className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <Icons.file className="w-4 h-4 text-gray-500 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <a
                                  href={resolveFileHref(file.fileUrl)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 text-sm truncate block"
                                >
                                  {file.fileName}
                                </a>
                                <p className="text-xs text-gray-500">
                                  {dayjs(file.uploadedAt).format('DD/MM/YYYY HH:mm')}
                                  {file.uploadedBy === 'student' ? ' (Bạn)' : ' (GV)'}
                                </p>
                              </div>
                            </div>
                            {file.uploadedBy === 'student' && (
                              <button
                                onClick={() => handleFileDelete(milestone.id, file.id)}
                                className="ml-2 p-1 text-red-600 hover:bg-red-50 rounded"
                                title="Xóa file"
                              >
                                <Icons.delete className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 italic">Chưa có tài liệu nào được nộp.</p>
                    )}
                  </div>
                  
                  {milestone.submittedDocuments && milestone.submittedDocuments.length > 0 && (
                    <div className="mt-3">
                      <span className="font-medium text-gray-500 text-sm">Tài liệu đã nộp (cũ):</span>
                      <ul className="mt-1 space-y-1">
                        {milestone.submittedDocuments.map((doc, index) => (
                          <li key={index} className="text-sm">
                            <a 
                              href={resolveFileHref(doc.fileUrl)} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 underline"
                            >
                              {doc.fileName}
                            </a>
                            <span className="text-gray-500 ml-2">
                              ({dayjs(doc.submittedAt).format('DD/MM/YYYY HH:mm')})
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Grades */}
        {grade.gradeComponents && grade.gradeComponents.length > 0 && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Điểm số</h2>
            <div className="space-y-4">
              {grade.gradeComponents.map((component, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div>
                    <span className="font-medium text-gray-900">{getGradeComponentName(component.type)}</span>
                    <span className="text-gray-500 text-sm ml-2">(Trọng số: {(component.weight * 100).toFixed(0)}%)</span>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-gray-900">{component.score.toFixed(1)}/10</span>
                    {component.gradedAt && (
                      <p className="text-xs text-gray-500">{dayjs(component.gradedAt).format('DD/MM/YYYY')}</p>
                    )}
                  </div>
                </div>
              ))}
              
              {grade.finalGrade !== undefined && (
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded">
                    <span className="text-lg font-bold text-blue-900">Điểm tổng kết</span>
                    <div className="text-right">
                      <span className="text-2xl font-bold text-blue-900">{grade.finalGrade.toFixed(1)}/10</span>
                      {grade.letterGrade && (
                        <p className="text-lg font-medium text-blue-700">({grade.letterGrade})</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {grade.supervisorFinalComment && (
              <div className="mt-4 p-4 bg-green-50 rounded">
                <span className="font-medium text-green-900">Nhận xét của giảng viên:</span>
                <p className="text-green-800 mt-1">{grade.supervisorFinalComment}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </PageLayout>
  );
};

export default StudentProgress;