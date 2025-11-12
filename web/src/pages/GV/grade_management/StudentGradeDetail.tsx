import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageLayout from '../../../components/UI/PageLayout';
import StandardDialog from '../../../components/UI/StandardDialog';
import { Icons } from '../../../components/UI/Icons';
import { useToast } from '../../../components/UI/Toast';
import LocationPicker from '../../../components/LocationPicker';
import { 
  getStudentGradeDetails, 
  updateMilestone,
  updateGradeComponents,
  submitGradesToBCN,
  updateWorkInfo,
  addCustomMilestone,
  editMilestoneDetails,
  deleteMilestone,
  uploadGradingFiles,
  deleteGradingFile,
  type InternshipGrade,
  type GradeComponent,
  type Milestone,
  getGradeComponentName,
  getMilestoneStatusText,
  getGradeStatusText,
  getGradeStatusColor,
  getWorkTypeText
} from '../../../services/gradeApi';
import { resolveFileHref } from '../../../utils/fileLinks';
import dayjs from 'dayjs';

const StudentGradeDetail: React.FC = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const { showSuccess, showError, showWarning } = useToast();

  const [grade, setGrade] = useState<InternshipGrade | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Check if current user is the appeal reviewer for this grade
  // Backend already calculates this and sends isAppealReview flag
  const isAppealReviewer = grade?.isAppealReview === true && 
    grade?.appealStatus === 'reviewing';

  // Form states
  const [gradeComponents, setGradeComponents] = useState<GradeComponent[]>([]);
  const [supervisorComment, setSupervisorComment] = useState('');
  const [gradingNotes, setGradingNotes] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<Array<{
    id: string;
    fileName: string;
    fileUrl: string;
    uploadedAt: string;
  }>>([]);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'timeline' | 'grading' | 'settings'>('timeline');
  
  // Work type and company settings
  const [workType, setWorkType] = useState<'thuc_tap' | 'do_an'>('thuc_tap');
  const [company, setCompany] = useState({
    name: '',
    supervisorName: '',
    supervisorEmail: '',
    supervisorPhone: '',
    address: '',
    location: {
      lat: 0,
      lng: 0
    }
  });
  const [projectTopic, setProjectTopic] = useState('');
  
  // Custom milestone form
  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [showEditMilestone, setShowEditMilestone] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingMilestone, setDeletingMilestone] = useState<Milestone | null>(null);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showNotesDialog, setShowNotesDialog] = useState(false);
  const [editingNotesMilestone, setEditingNotesMilestone] = useState<Milestone | null>(null);
  const [notesInput, setNotesInput] = useState('');
  const [newMilestone, setNewMilestone] = useState({
    title: '',
    description: '',
    dueDate: ''
  });

  const loadGradeDetails = useCallback(async () => {
    if (!studentId) return;
    
    try {
      setLoading(true);
      setError(null);
      const response = await getStudentGradeDetails(studentId);
      setGrade(response.grade);
      setGradeComponents(response.grade.gradeComponents);
      setSupervisorComment(response.grade.supervisorFinalComment || '');
      
      // Initialize grading notes and uploaded files
      setGradingNotes(response.grade.gradingNotes || '');
      setUploadedFiles(response.grade.gradingFiles || []);
      
      // Initialize work type and company info
      setWorkType(response.grade.workType || 'thuc_tap');
      setProjectTopic(response.grade.projectTopic || '');
      
      // Always initialize company data - either from response or reset to defaults
      if (response.grade.company) {
        const companyData = response.grade.company as Record<string, unknown>;
        setCompany({
          name: (companyData.name as string) || '',
          supervisorName: (companyData.supervisorName as string) || '',
          supervisorEmail: (companyData.supervisorEmail as string) || '',
          supervisorPhone: (companyData.supervisorPhone as string) || '',
          address: (companyData.address as string) || '',
          location: (companyData.location as { lat: number; lng: number }) || { lat: 0, lng: 0 }
        });
      } else {
        // Reset to default empty values if no company data
        setCompany({
          name: '',
          supervisorName: '',
          supervisorEmail: '',
          supervisorPhone: '',
          address: '',
          location: { lat: 0, lng: 0 }
        });
      }
    } catch (err) {
      console.error('Failed to load grade details:', err);
      setError('Không thể tải thông tin điểm. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    loadGradeDetails();
  }, [loadGradeDetails]);

  const handleMilestoneUpdate = async (milestoneId: string, status: string, notes?: string) => {
    if (!studentId || !grade || !milestoneId) {
      console.error('Missing required parameters for milestone update:', { studentId, grade: !!grade, milestoneId });
      showError('Không thể cập nhật milestone. Thiếu thông tin cần thiết.');
      return;
    }

    // Find the milestone being updated
    const milestone = grade.milestones.find(m => m.id === milestoneId);
    
    // Validation for "Bắt đầu" milestone
    if (milestone?.title === 'Bắt đầu' && status === 'completed') {
      if (workType === 'thuc_tap') {
        // Validate company info for internship
        if (!company.name || !company.address || !company.supervisorName) {
          showError('Vui lòng điền đầy đủ thông tin doanh nghiệp (tên, địa chỉ, người hướng dẫn) trong tab "Cài đặt" trước khi bắt đầu.');
          return;
        }
      } else if (workType === 'do_an') {
        // Validate project topic for thesis
        if (!projectTopic.trim()) {
          showError('Vui lòng điền chủ đề đồ án trong tab "Cài đặt" trước khi bắt đầu.');
          return;
        }
      }
    }

    try {
      const response = await updateMilestone(studentId, milestoneId, {
        status,
        supervisorNotes: notes
      });

      // Update local state
      setGrade(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          milestones: prev.milestones.map(m => 
            m.id === milestoneId ? response.milestone : m
          ),
          progressPercentage: response.progressPercentage,
          // Update status if returned from API
          status: (response.gradeStatus as "not_started" | "in_progress" | "draft_completed" | "submitted" | "approved" | "rejected") || prev.status
        };
      });
      showSuccess('Đã cập nhật milestone thành công');
    } catch (err) {
      console.error('Failed to update milestone:', err);
      showError('Không thể cập nhật milestone. Vui lòng thử lại.');
    }
  };

  const handleGradeComponentChange = (index: number, field: keyof GradeComponent, value: string | number) => {
    setGradeComponents(prev => 
      prev.map((component, i) => 
        i === index ? { ...component, [field]: value } : component
      )
    );
    setHasUnsavedChanges(true);
  };

  const handleSaveGrades = async () => {
    if (!studentId) return;

    try {
      setSaving(true);
      const response = await updateGradeComponents(studentId, {
        gradeComponents,
        supervisorFinalComment: supervisorComment,
        gradingNotes: gradingNotes,
        gradingFiles: uploadedFiles
      });

      setGrade(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          gradeComponents: response.grade.gradeComponents,
          finalGrade: response.grade.finalGrade,
          letterGrade: response.grade.letterGrade,
          status: response.grade.status as "not_started" | "in_progress" | "draft_completed" | "submitted" | "approved" | "rejected",
          supervisorFinalComment: response.grade.supervisorFinalComment,
          gradingNotes: response.grade.gradingNotes,
          gradingFiles: response.grade.gradingFiles
        };
      });

      setHasUnsavedChanges(false);
      showSuccess('Đã lưu điểm thành công!');
    } catch (err) {
      console.error('Failed to save grades:', err);
      showError('Không thể lưu điểm. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitToBCN = async () => {
    if (!studentId || !grade) return;

    // Validate required fields
    const allComponentsGraded = gradeComponents.every(component => component.score > 0);
    if (!allComponentsGraded) {
      showWarning('Vui lòng hoàn thành chấm điểm tất cả các thành phần trước khi nộp.');
      return;
    }

    if (!supervisorComment.trim()) {
      showWarning('Vui lòng nhập nhận xét cuối cùng trước khi nộp điểm.');
      return;
    }

    setShowSubmitConfirm(true);
  };

  const confirmSubmitToBCN = async () => {
    if (!studentId) return;

    try {
      setSubmitting(true);
      await submitGradesToBCN(studentId);
      
      setGrade(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          status: 'submitted',
          submittedToBCN: true,
          submittedAt: new Date().toISOString()
        };
      });

      showSuccess('Đã nộp điểm thành công!');
      setTimeout(() => navigate('/gv-grade'), 1500);
    } catch (err) {
      console.error('Failed to submit grades:', err);
      showError('Không thể nộp điểm. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateWorkInfo = async () => {
    if (!studentId) return;

    try {
      const payload: {
        workType: 'thuc_tap' | 'do_an';
        company?: typeof company;
        projectTopic?: string;
      } = {
        workType,
        company: workType === 'thuc_tap' ? company : undefined,
        projectTopic: workType === 'do_an' ? projectTopic : undefined
      };

      const response = await updateWorkInfo(studentId, payload);

      setGrade(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          workType: response.grade.workType as 'thuc_tap' | 'do_an',
          company: response.grade.company,
          projectTopic: response.grade.projectTopic,
          gradeComponents: response.grade.gradeComponents || prev.gradeComponents,
          milestones: response.grade.milestones || prev.milestones
        };
      });

      setGradeComponents(response.grade.gradeComponents || gradeComponents);
      showSuccess('Đã cập nhật thông tin thành công!');
    } catch (err) {
      console.error('Failed to update work info:', err);
      showError('Không thể cập nhật thông tin. Vui lòng thử lại.');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !studentId) return;

    try {
      setUploading(true);
      
      const result = await uploadGradingFiles(files);
      if (result.success) {
        const newFiles = result.files.map(file => ({
          id: file.filename,
          fileName: file.originalName,
          fileUrl: file.path,
          uploadedAt: new Date().toISOString()
        }));
        setUploadedFiles(prev => [...prev, ...newFiles]);
        showSuccess(`Đã tải lên ${files.length} tệp thành công!`);
      }
    } catch (err) {
      console.error('Failed to upload files:', err);
      showError('Không thể tải lên tệp. Vui lòng thử lại.');
    } finally {
      setUploading(false);
      // Clear the input
      event.target.value = '';
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    try {
      const result = await deleteGradingFile(fileId);
      if (result.success) {
        setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
        showSuccess('Đã xóa tệp thành công!');
      }
    } catch (err) {
      console.error('Failed to delete file:', err);
      showError('Không thể xóa tệp. Vui lòng thử lại.');
    }
  };

  const handleAddMilestone = async () => {
    if (!studentId || !newMilestone.title.trim() || !newMilestone.dueDate) {
      showWarning('Vui lòng điền đầy đủ thông tin mốc thời gian.');
      return;
    }

    try {
      const response = await addCustomMilestone(studentId, newMilestone);
      
      setGrade(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          milestones: [...prev.milestones, response.milestone]
        };
      });

      setNewMilestone({ title: '', description: '', dueDate: '' });
      setShowAddMilestone(false);
      showSuccess('Đã thêm mốc thời gian thành công!');
    } catch (err) {
      console.error('Failed to add milestone:', err);
      showError('Không thể thêm mốc thời gian. Vui lòng thử lại.');
    }
  };

  const calculateFinalGrade = () => {
    if (gradeComponents.length === 0) return 0;
    
    let totalScore = 0;
    let totalWeight = 0;
    
    gradeComponents.forEach(component => {
      totalScore += component.score * component.weight;
      totalWeight += component.weight;
    });
    
    return totalWeight > 0 ? (totalScore / totalWeight) : 0;
  };

  const handleEditMilestone = async () => {
    if (!editingMilestone || !studentId) return;

    try {
      const milestoneData = {
        title: newMilestone.title,
        description: newMilestone.description,
        dueDate: newMilestone.dueDate
      };

      await editMilestoneDetails(studentId, editingMilestone.id, milestoneData);

      setGrade(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          milestones: prev.milestones.map(m => 
            m.id === editingMilestone.id ? { ...m, ...milestoneData } : m
          )
        };
      });

      setNewMilestone({ title: '', description: '', dueDate: '' });
      setEditingMilestone(null);
      setShowEditMilestone(false);
      showSuccess('Đã cập nhật mốc thời gian thành công!');
    } catch (err) {
      console.error('Failed to edit milestone:', err);
      showError('Không thể cập nhật mốc thời gian. Vui lòng thử lại.');
    }
  };

  const handleDeleteMilestone = async () => {
    if (!deletingMilestone || !studentId) return;

    try {
      await deleteMilestone(studentId, deletingMilestone.id);

      setGrade(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          milestones: prev.milestones.filter(m => m.id !== deletingMilestone.id)
        };
      });

      setDeletingMilestone(null);
      setShowDeleteConfirm(false);
      showSuccess('Đã xóa mốc thời gian thành công!');
    } catch (err) {
      console.error('Failed to delete milestone:', err);
      showError('Không thể xóa mốc thời gian. Vui lòng thử lại.');
    }
  };

  const openEditMilestone = (milestone: Milestone) => {
    setEditingMilestone(milestone);
    setNewMilestone({
      title: milestone.title,
      description: milestone.description || '',
      dueDate: dayjs(milestone.dueDate).format('YYYY-MM-DD')
    });
    setShowEditMilestone(true);
  };

  const openDeleteConfirm = (milestone: Milestone) => {
    setDeletingMilestone(milestone);
    setShowDeleteConfirm(true);
  };

  const saveNotesForMilestone = async () => {
    if (!editingNotesMilestone) return;
    await handleMilestoneUpdate(editingNotesMilestone.id, editingNotesMilestone.status, notesInput);
    setShowNotesDialog(false);
    setEditingNotesMilestone(null);
    setNotesInput('');
  };

  const resetMilestoneForm = () => {
    setNewMilestone({ title: '', description: '', dueDate: '' });
    setEditingMilestone(null);
  };

  const getLetterGrade = (score: number) => {
    if (score >= 9.0) return 'A+';
    if (score >= 8.5) return 'A';
    if (score >= 8.0) return 'B+';
    if (score >= 7.0) return 'B';
    if (score >= 6.5) return 'C+';
    if (score >= 5.5) return 'C';
    if (score >= 5.0) return 'D+';
    if (score >= 4.0) return 'D';
    return 'F';
  };

  const finalGrade = calculateFinalGrade();
  const letterGrade = getLetterGrade(finalGrade);

  if (loading) {
    return (
      <PageLayout>
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </PageLayout>
    );
  }

  if (error || !grade) {
    return (
      <PageLayout>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-800">
            <Icons.close className="w-5 h-5" />
            <span className="font-medium">Lỗi</span>
          </div>
          <p className="text-red-700 mt-1">{error || 'Không tìm thấy thông tin điểm'}</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Quay lại
          </button>
        </div>
      </PageLayout>
    );
  }

  return (
    <>
      {/* Toolbar outside PageLayout */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <button
          onClick={() => navigate(-1)}
          className="h-10 px-4 flex items-center gap-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Icons.close className="w-4 h-4" />
          Quay lại
        </button>
        
        <div className="flex-1 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-gray-900">{grade.student.name}</h2>
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
              grade.workType === 'thuc_tap' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
            }`}>
              {getWorkTypeText(grade.workType)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getGradeStatusColor(grade.status)}`}>
            {getGradeStatusText(grade.status)}
          </span>
          {grade.finalGrade && (
            <div className="bg-white border border-gray-200 rounded-lg px-4 py-1">
              <span className="text-lg font-bold text-gray-900">{grade.finalGrade.toFixed(1)}</span>
              <span className="text-sm text-gray-500 ml-1">({grade.letterGrade})</span>
            </div>
          )}
        </div>
      </div>

      <PageLayout>
      <div className="space-y-6">
        {/* Appeal Reviewer Notice */}
        {isAppealReviewer && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <Icons.info className="w-5 h-5 text-blue-600" />
              <div>
                <h4 className="text-sm font-medium text-blue-900">Chế độ phúc khảo</h4>
                <p className="text-sm text-blue-700 mt-1">
                  Bạn đang phúc khảo điểm cho sinh viên này. Điểm và nhận xét của bạn sẽ thay thế điểm ban đầu sau khi hoàn thành phúc khảo.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Student info card */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600">Mã sinh viên</p>
              <p className="font-medium text-gray-900">{grade.student.id}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Email</p>
              <p className="font-medium text-gray-900">{grade.student.email}</p>
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Tiến độ thực tập</span>
              <span className="text-sm text-gray-600">{grade.progressPercentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all"
                style={{ width: `${grade.progressPercentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('timeline')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'timeline'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Timeline & Milestones
              </button>
              <button
                onClick={() => setActiveTab('grading')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'grading'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Chấm điểm
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'settings'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Cài đặt
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'timeline' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">Timeline thực tập</h3>
                  {/* Only show Add Milestone button if start milestone is completed */}
                  {grade.milestones.some(m => m.type === 'start' && m.status === 'completed') && (
                    <button
                      onClick={() => setShowAddMilestone(true)}
                      className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                      disabled={grade.status === 'submitted' || grade.status === 'approved'}
                    >
                      <Icons.add className="w-4 h-4 inline mr-1" />
                      Thêm mốc thời gian
                    </button>
                  )}
                </div>
                
                {/* Info message when start milestone is not completed */}
                {!grade.milestones.some(m => m.type === 'start' && m.status === 'completed') && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                    <div className="flex items-start">
                      <Icons.info className="w-5 h-5 text-blue-600 mt-0.5 mr-3" />
                      <div>
                        <h4 className="text-sm font-medium text-blue-900">Bắt đầu quá trình học tập</h4>
                        <p className="text-sm text-blue-700 mt-1">
                          Đánh dấu hoàn thành mốc "Bắt đầu" để có thể thêm các mốc thời gian tùy chỉnh.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="space-y-4">
                  {grade.milestones.map((milestone) => (
                    <div key={milestone.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-medium text-gray-900">{milestone.title}</h4>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              milestone.status === 'completed' ? 'bg-green-100 text-green-800' :
                              milestone.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                              milestone.status === 'overdue' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {getMilestoneStatusText(milestone.status)}
                            </span>
                            {milestone.isCustom && (
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                Tùy chỉnh
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mb-2">
                            Hạn: {dayjs(milestone.dueDate).format('DD/MM/YYYY')}
                          </p>
                          {milestone.description && (
                            <p className="text-sm text-gray-700 mb-2">
                              {milestone.description}
                            </p>
                          )}
                          {milestone.supervisorNotes && (
                            <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded whitespace-pre-wrap">
                              <strong>Ghi chú:</strong> {milestone.supervisorNotes}
                            </p>
                          )}
                          
                          {/* File submissions */}
                          {milestone.fileSubmissions && milestone.fileSubmissions.length > 0 && (
                            <div className="mt-3">
                              <p className="text-sm font-medium text-gray-700 mb-2">Tài liệu đã nộp:</p>
                              <div className="space-y-2">
                                {milestone.fileSubmissions.map((file) => (
                                  <div key={file.id} className="flex items-center gap-2 p-2 bg-blue-50 rounded border border-blue-200">
                                    <Icons.file className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <a
                                        href={resolveFileHref(file.fileUrl)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:text-blue-800 text-sm font-medium truncate block"
                                      >
                                        {file.fileName}
                                      </a>
                                      <p className="text-xs text-gray-600">
                                        {dayjs(file.uploadedAt).format('DD/MM/YYYY HH:mm')}
                                        {file.uploadedBy === 'student' ? ' (SV)' : ' (GV)'}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {milestone.status !== 'completed' && (
                            <button
                              onClick={() => handleMilestoneUpdate(milestone.id, 'completed')}
                              className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                              disabled={grade.status === 'submitted' || grade.status === 'approved'}
                            >
                              <Icons.check className="w-3 h-3 inline mr-1" />
                              Hoàn thành
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setEditingNotesMilestone(milestone);
                              setNotesInput(milestone.supervisorNotes || '');
                              setShowNotesDialog(true);
                            }}
                            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                            disabled={grade.status === 'submitted' || grade.status === 'approved'}
                          >
                            <Icons.edit className="w-3 h-3 inline mr-1" />
                            Ghi chú
                          </button>
                          <button
                            onClick={() => openEditMilestone(milestone)}
                            className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
                            disabled={grade.status === 'submitted' || grade.status === 'approved'}
                          >
                            <Icons.edit className="w-3 h-3 inline mr-1" />
                            Sửa
                          </button>
                          {milestone.isCustom && (
                            <button
                              onClick={() => openDeleteConfirm(milestone)}
                              className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                              disabled={grade.status === 'submitted' || grade.status === 'approved'}
                            >
                              <Icons.delete className="w-3 h-3 inline mr-1" />
                              Xóa
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'grading' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900">Chấm điểm theo thành phần</h3>
                
                <div className="space-y-4">
                  {gradeComponents.map((component, index) => (
                    <div key={component.type} className="border border-gray-200 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {getGradeComponentName(component.type)}
                          </label>
                          <p className="text-xs text-gray-500">Trọng số: {(component.weight * 100)}%</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Điểm (0-10)
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="10"
                            step="0.1"
                            value={component.score}
                            onChange={(e) => handleGradeComponentChange(index, 'score', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            disabled={!isAppealReviewer && (grade.status === 'submitted' || grade.status === 'approved')}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Ghi chú
                          </label>
                          <input
                            type="text"
                            value={component.comment}
                            onChange={(e) => handleGradeComponentChange(index, 'comment', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Nhận xét về thành phần này..."
                            disabled={!isAppealReviewer && (grade.status === 'submitted' || grade.status === 'approved')}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Final grade preview */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-blue-900">Điểm tổng kết (dự kiến)</h4>
                      <p className="text-sm text-blue-700">Được tính từ các thành phần đã chấm</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-900">{finalGrade.toFixed(1)}</div>
                      <div className="text-sm text-blue-700">{letterGrade}</div>
                    </div>
                  </div>
                </div>

                {/* Supervisor final comment */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {isAppealReviewer ? 'Nhận xét của giảng viên phúc khảo' : 'Nhận xét tổng kết của giảng viên hướng dẫn'}
                  </label>
                  <textarea
                    value={supervisorComment}
                    onChange={(e) => {
                      setSupervisorComment(e.target.value);
                      setHasUnsavedChanges(true);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={4}
                    placeholder={isAppealReviewer ? 'Nhập đánh giá của giảng viên phúc khảo...' : 'Nhập đánh giá tổng thể về quá trình thực tập của sinh viên...'}
                    disabled={!isAppealReviewer && (grade.status === 'submitted' || grade.status === 'approved')}
                  />
                </div>

                {/* Grading notes and file uploads */}
                <div className="border border-gray-200 rounded-lg p-4 space-y-4">
                  <h4 className="font-medium text-gray-900">Ghi chú và tài liệu chấm điểm</h4>
                  
                  {/* Text notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ghi chú quá trình chấm điểm
                    </label>
                    <textarea
                      value={gradingNotes}
                      onChange={(e) => {
                        setGradingNotes(e.target.value);
                        setHasUnsavedChanges(true);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows={3}
                      placeholder="Ghi chú chi tiết về quá trình chấm điểm, tiêu chí đánh giá..."
                      disabled={!isAppealReviewer && (grade.status === 'submitted' || grade.status === 'approved')}
                    />
                  </div>

                  {/* File upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tài liệu đính kèm
                    </label>
                    
                    {/* Upload button */}
                    <div className="mb-3">
                      <input
                        type="file"
                        id="grading-files"
                        multiple
                        onChange={handleFileUpload}
                        className="hidden"
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png"
                        disabled={!isAppealReviewer && (grade.status === 'submitted' || grade.status === 'approved')}
                      />
                      <label
                        htmlFor="grading-files"
                        className={`inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer transition-colors ${
                          !isAppealReviewer && (grade.status === 'submitted' || grade.status === 'approved')
                            ? 'opacity-50 cursor-not-allowed' 
                            : ''
                        }`}
                      >
                        <Icons.file className="w-4 h-4 mr-2" />
                        {uploading ? 'Đang tải lên...' : 'Chọn tệp'}
                      </label>
                      <p className="text-xs text-gray-500 mt-1">
                        Hỗ trợ: PDF, Word, Excel, PowerPoint, hình ảnh (tối đa 10MB/tệp)
                      </p>
                    </div>

                    {/* Uploaded files list */}
                    {uploadedFiles.length > 0 && (
                      <div className="space-y-2">
                        <h5 className="text-sm font-medium text-gray-700">Tệp đã tải lên:</h5>
                        <div className="space-y-2">
                          {uploadedFiles.map((file) => (
                            <div key={file.id} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                              <div className="flex items-center space-x-2">
                                <Icons.file className="w-4 h-4 text-gray-500" />
                                <span className="text-sm text-gray-900">{file.fileName}</span>
                                <span className="text-xs text-gray-500">
                                  {dayjs(file.uploadedAt).format('DD/MM/YYYY HH:mm')}
                                </span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <a
                                  href={resolveFileHref(file.fileUrl)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-700 text-sm"
                                >
                                  Xem
                                </a>
                                {(isAppealReviewer || (grade.status !== 'submitted' && grade.status !== 'approved')) && (
                                  <button
                                    onClick={() => handleDeleteFile(file.id)}
                                    className="text-red-600 hover:text-red-700 text-sm"
                                  >
                                    <Icons.delete className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action buttons */}
                {(isAppealReviewer || (grade.status !== 'submitted' && grade.status !== 'approved')) && (
                  <div className="flex gap-3 pt-4 border-t border-gray-200">
                    <button
                      onClick={handleSaveGrades}
                      disabled={saving}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving ? 'Đang lưu...' : isAppealReviewer ? 'Lưu điểm phúc khảo' : 'Lưu điểm'}
                    </button>
                    {!isAppealReviewer && (
                      <button
                        onClick={handleSubmitToBCN}
                        disabled={
                          submitting || 
                          !supervisorComment.trim() || 
                          gradeComponents.some(c => c.score === 0) ||
                          hasUnsavedChanges
                        }
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {submitting ? 'Đang nộp...' : 'Nộp điểm lên khoa'}
                      </button>
                    )}
                    {isAppealReviewer && (
                      <button
                        onClick={handleSubmitToBCN}
                        disabled={
                          submitting || 
                          !supervisorComment.trim() || 
                          gradeComponents.some(c => c.score === 0) ||
                          hasUnsavedChanges
                        }
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {submitting ? 'Đang nộp...' : 'Hoàn thành phúc khảo'}
                      </button>
                    )}
                  </div>
                )}

                {grade.status === 'submitted' && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-yellow-800">
                      <Icons.check className="w-5 h-5" />
                      <span className="font-medium">Đã nộp điểm</span>
                    </div>
                    <p className="text-yellow-700 mt-1">
                      Điểm đã được nộp lên khoa vào {dayjs(grade.submittedAt).format('DD/MM/YYYY HH:mm')}. 
                      Đang chờ khoa phê duyệt.
                    </p>
                  </div>
                )}

                {grade.status === 'approved' && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-green-800">
                      <Icons.check className="w-5 h-5" />
                      <span className="font-medium">Điểm đã được phê duyệt</span>
                    </div>
                    <p className="text-green-700 mt-1">
                      Điểm đã được khoa phê duyệt. Sinh viên có thể xem điểm cuối cùng.
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900">Cài đặt chung</h3>
                
                {/* Work Type Selection */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Loại công việc</h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          value="thuc_tap"
                          checked={workType === 'thuc_tap'}
                          onChange={(e) => setWorkType(e.target.value as 'thuc_tap' | 'do_an')}
                          className="mr-2"
                          disabled={grade.status === 'submitted' || grade.status === 'approved'}
                        />
                        <span className="text-sm font-medium">Thực tập tại doanh nghiệp</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          value="do_an"
                          checked={workType === 'do_an'}
                          onChange={(e) => setWorkType(e.target.value as 'thuc_tap' | 'do_an')}
                          className="mr-2"
                          disabled={grade.status === 'submitted' || grade.status === 'approved'}
                        />
                        <span className="text-sm font-medium">Đồ án tốt nghiệp</span>
                      </label>
                    </div>
                    <p className="text-sm text-gray-600">
                      {workType === 'thuc_tap' 
                        ? 'Sinh viên sẽ thực tập tại doanh nghiệp và được đánh giá bởi cả giảng viên và doanh nghiệp.'
                        : 'Sinh viên sẽ thực hiện đồ án tốt nghiệp với sự hướng dẫn của giảng viên.'
                      }
                    </p>
                  </div>
                </div>

                {/* Company Information (only for internship) */}
                {workType === 'thuc_tap' && (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3">Thông tin doanh nghiệp</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Tên doanh nghiệp
                        </label>
                        <input
                          type="text"
                          value={company.name}
                          onChange={(e) => setCompany({...company, name: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Nhập tên doanh nghiệp..."
                          disabled={grade.status === 'submitted' || grade.status === 'approved'}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Người hướng dẫn
                        </label>
                        <input
                          type="text"
                          value={company.supervisorName}
                          onChange={(e) => setCompany({...company, supervisorName: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Tên người hướng dẫn..."
                          disabled={grade.status === 'submitted' || grade.status === 'approved'}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email liên hệ
                        </label>
                        <input
                          type="email"
                          value={company.supervisorEmail}
                          onChange={(e) => setCompany({...company, supervisorEmail: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="email@company.com"
                          disabled={grade.status === 'submitted' || grade.status === 'approved'}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Số điện thoại
                        </label>
                        <input
                          type="tel"
                          value={company.supervisorPhone}
                          onChange={(e) => setCompany({...company, supervisorPhone: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="0123456789"
                          disabled={grade.status === 'submitted' || grade.status === 'approved'}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Địa chỉ doanh nghiệp
                        </label>
                        <textarea
                          value={company.address}
                          onChange={(e) => setCompany({...company, address: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          rows={2}
                          placeholder="Địa chỉ đầy đủ của doanh nghiệp..."
                          disabled={grade.status === 'submitted' || grade.status === 'approved'}
                        />
                      </div>
                      
                      {/* Location Picker with Google Maps */}
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          📍 Vị trí doanh nghiệp trên bản đồ
                        </label>
                        <LocationPicker
                          onLocationSelect={(location) => {
                            setCompany({
                              ...company,
                              address: location.address,
                              location: { lat: location.lat, lng: location.lng }
                            });
                          }}
                          initialLocation={company.location && company.location.lat && company.location.lng ? company.location : undefined}
                          initialAddress={company.address}
                          disabled={grade.status === 'submitted' || grade.status === 'approved'}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Project Topic (only for thesis) */}
                {workType === 'do_an' && (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3">Thông tin đồ án</h4>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Chủ đề đồ án <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={projectTopic}
                        onChange={(e) => setProjectTopic(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        rows={3}
                        placeholder="Nhập chủ đề đồ án tốt nghiệp..."
                        disabled={grade.status === 'submitted' || grade.status === 'approved'}
                      />
                      <p className="text-sm text-gray-600 mt-1">
                        Mô tả ngắn gọn về chủ đề và nội dung đồ án của sinh viên
                      </p>
                    </div>
                  </div>
                )}

                {/* Save Settings Button */}
                {grade.status !== 'submitted' && grade.status !== 'approved' && (
                  <div className="flex justify-end pt-4 border-t border-gray-200">
                    <button
                      onClick={handleUpdateWorkInfo}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Lưu cài đặt
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Add Milestone Dialog */}
        <StandardDialog
          open={showAddMilestone}
          onClose={() => {
            setShowAddMilestone(false);
            resetMilestoneForm();
          }}
          title="Thêm mốc thời gian mới"
          size="md"
          primaryAction={{
            label: "Thêm mốc thời gian",
            onClick: handleAddMilestone,
            disabled: !newMilestone.title.trim() || !newMilestone.dueDate,
            loading: saving
          }}
          secondaryAction={{
            label: "Hủy",
            onClick: () => {
              setShowAddMilestone(false);
              resetMilestoneForm();
            }
          }}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tiêu đề *
              </label>
              <input
                type="text"
                value={newMilestone.title}
                onChange={(e) => setNewMilestone({...newMilestone, title: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Tên mốc thời gian..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mô tả
              </label>
              <textarea
                value={newMilestone.description}
                onChange={(e) => setNewMilestone({...newMilestone, description: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                placeholder="Mô tả chi tiết về mốc thời gian này..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hạn hoàn thành *
              </label>
              <input
                type="date"
                value={newMilestone.dueDate}
                onChange={(e) => setNewMilestone({...newMilestone, dueDate: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </StandardDialog>

        {/* Edit Milestone Dialog */}
        <StandardDialog
          open={showEditMilestone}
          onClose={() => {
            setShowEditMilestone(false);
            resetMilestoneForm();
          }}
          title="Chỉnh sửa mốc thời gian"
          size="md"
          primaryAction={{
            label: "Cập nhật",
            onClick: handleEditMilestone,
            disabled: !newMilestone.title.trim() || !newMilestone.dueDate,
            loading: saving
          }}
          secondaryAction={{
            label: "Hủy",
            onClick: () => {
              setShowEditMilestone(false);
              resetMilestoneForm();
            }
          }}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tiêu đề *
              </label>
              <input
                type="text"
                value={newMilestone.title}
                onChange={(e) => setNewMilestone({...newMilestone, title: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Tên mốc thời gian..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mô tả
              </label>
              <textarea
                value={newMilestone.description}
                onChange={(e) => setNewMilestone({...newMilestone, description: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                placeholder="Mô tả chi tiết về mốc thời gian này..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hạn hoàn thành *
              </label>
              <input
                type="date"
                value={newMilestone.dueDate}
                onChange={(e) => setNewMilestone({...newMilestone, dueDate: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </StandardDialog>

        {/* Delete Confirmation Dialog */}
        <StandardDialog
          open={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          title="Xác nhận xóa"
          size="sm"
          icon={<Icons.delete className="text-red-600" />}
          primaryAction={{
            label: "Xóa",
            onClick: handleDeleteMilestone,
            variant: 'danger',
            loading: saving
          }}
          secondaryAction={{
            label: "Hủy",
            onClick: () => setShowDeleteConfirm(false)
          }}
        >
          <p className="text-gray-600">
            Bạn có chắc chắn muốn xóa mốc thời gian "{deletingMilestone?.title}"? 
            Hành động này không thể hoàn tác.
          </p>
        </StandardDialog>

        {/* Submit to BCN Confirmation Dialog */}
        <StandardDialog
          open={showSubmitConfirm}
          onClose={() => setShowSubmitConfirm(false)}
          title="Xác nhận nộp điểm"
          size="sm"
          icon={<Icons.send className="text-blue-600" />}
          primaryAction={{
            label: "Xác nhận nộp",
            onClick: confirmSubmitToBCN,
            variant: 'primary',
            loading: submitting
          }}
          secondaryAction={{
            label: "Hủy",
            onClick: () => setShowSubmitConfirm(false)
          }}
        >
          <p className="text-gray-600">
            Bạn có chắc chắn muốn nộp điểm lên khoa? Sau khi nộp, điểm sẽ được gửi đến Ban Chủ Nhiệm để xét duyệt và bạn sẽ không thể chỉnh sửa.
          </p>
        </StandardDialog>

        {/* Milestone Notes Dialog */}
        <StandardDialog
          open={showNotesDialog}
          onClose={() => {
            setShowNotesDialog(false);
            setEditingNotesMilestone(null);
            setNotesInput('');
          }}
          title="Ghi chú mốc thời gian"
          size="md"
          icon={<Icons.edit className="text-blue-600" />}
          primaryAction={{
            label: "Lưu ghi chú",
            onClick: saveNotesForMilestone,
            variant: 'primary',
            loading: saving
          }}
          secondaryAction={{
            label: "Hủy",
            onClick: () => {
              setShowNotesDialog(false);
              setEditingNotesMilestone(null);
              setNotesInput('');
            }
          }}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ghi chú cho: <span className="font-semibold">{editingNotesMilestone?.title}</span>
              </label>
              <textarea
                value={notesInput}
                onChange={(e) => setNotesInput(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={5}
                placeholder="Nhập ghi chú của giảng viên..."
              />
            </div>
          </div>
        </StandardDialog>
      </div>
    </PageLayout>
    </>
  );
};

export default StudentGradeDetail;