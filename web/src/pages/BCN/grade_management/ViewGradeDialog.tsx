import React from 'react';
import { Icons } from '../../../components/UI/Icons';
import { type InternshipGrade, getGradeComponentName, getMilestoneStatusText } from '../../../services/gradeApi';
import { resolveFileHref } from '../../../utils/fileLinks';
import dayjs from 'dayjs';

interface ViewGradeDialogProps {
  open: boolean;
  grade: InternshipGrade;
  onClose: () => void;
}

const ViewGradeDialog: React.FC<ViewGradeDialogProps> = ({ open, grade, onClose }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto m-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{grade.student?.name || 'Chưa có tên'}</h2>
            <p className="text-sm text-gray-600 mt-1">Xem chi tiết điểm thực tập</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Icons.close className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Student info */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-gray-600">Mã sinh viên</p>
                  <p className="font-medium text-gray-900">{grade.student?.id || '--'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-medium text-gray-900">{grade.student?.email || '--'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Khoa</p>
                  <p className="font-medium text-gray-900">{grade.khoa || 'Chưa có khoa'}</p>
                </div>
              </div>
              
              <div className="space-y-2">
                {grade.workType === 'thuc_tap' && grade.company && (
                  <>
                    <div>
                      <p className="text-sm text-gray-600">Công ty thực tập</p>
                      <p className="font-medium text-gray-900">{grade.company.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Người hướng dẫn (công ty)</p>
                      <p className="font-medium text-gray-900">{grade.company.supervisorName || '--'}</p>
                    </div>
                  </>
                )}
                {grade.workType === 'do_an' && grade.projectTopic && (
                  <div>
                    <p className="text-sm text-gray-600">Chủ đề đồ án</p>
                    <p className="font-medium text-gray-900">{grade.projectTopic}</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-300">
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
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">Timeline thực tập</h3>
            <div className="space-y-2">
              {grade.milestones.map((milestone) => (
                <div key={milestone.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900">{milestone.title}</h4>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
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
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Grade Components */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">Chi tiết điểm</h3>
            <div className="space-y-3">
              {grade.gradeComponents.map((component) => (
                <div key={component.type} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
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
                </div>
              ))}
              
              {/* Final grade */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
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

          {/* Supervisor Final Comment */}
          {grade.supervisorFinalComment && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Nhận xét của giảng viên hướng dẫn</h3>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <p className="text-gray-700">{grade.supervisorFinalComment}</p>
              </div>
            </div>
          )}

          {/* Grading Files */}
          {grade.gradingFiles && grade.gradingFiles.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Tài liệu đính kèm</h3>
              <div className="space-y-2">
                {grade.gradingFiles.map((file, index) => (
                  <div key={file.id || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-3">
                      <Icons.file className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="font-medium text-gray-900">{file.fileName}</p>
                        <p className="text-sm text-gray-500">
                          {dayjs(file.uploadedAt).format('DD/MM/YYYY HH:mm')}
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

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewGradeDialog;
