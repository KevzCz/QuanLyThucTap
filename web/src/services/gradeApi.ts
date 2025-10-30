import { apiClient } from '../utils/api';

export interface GradeComponent {
  type: 'supervisor_score' | 'company_score';
  score: number;
  weight: number;
  comment: string;
  gradedBy: 'supervisor' | 'company';
  gradedAt: string;
}

export interface Milestone {
  id: string;
  type: 'start' | 'custom';
  title: string;
  description?: string;
  dueDate: string;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  completedAt?: string;
  submittedDocuments?: Array<{
    fileName: string;
    fileUrl: string;
    submittedAt: string;
  }>;
  fileSubmissions?: Array<{
    id: string;
    fileName: string;
    fileUrl: string;
    uploadedAt: string;
    uploadedBy: 'student' | 'supervisor';
  }>;
  supervisorNotes?: string;
  isCustom?: boolean;
}

export interface InternshipGrade {
  id: string;
  _id?: string; // Fallback for MongoDB _id
  student: {
    id: string;
    name: string;
    email: string;
  };
  supervisor?: {
    id: string;
    name: string;
    email: string;
  };
  subject: {
    id: string;
    title: string;
  };
  workType: 'thuc_tap' | 'do_an';
  company?: {
    name: string;
    supervisorName: string;
    supervisorEmail: string;
    supervisorPhone: string;
    address: string;
  };
  projectTopic?: string;
  status: 'not_started' | 'in_progress' | 'draft_completed' | 'submitted' | 'approved' | 'rejected';
  startDate: string;
  endDate: string;
  milestones: Milestone[];
  gradeComponents: GradeComponent[];
  finalGrade?: number;
  letterGrade?: string;
  progressPercentage: number;
  submittedToBCN: boolean;
  submittedAt?: string;
  supervisorFinalComment?: string;
  gradingNotes?: string;
  gradingFiles?: Array<{
    id: string;
    fileName: string;
    fileUrl: string;
    uploadedAt: string;
  }>;
  bcnComment?: string;
  approvedAt?: string;
  rejectedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GradeSummary {
  id: string;
  student: {
    id: string;
    name: string;
    email: string;
  };
  subject: {
    id: string;
    title: string;
  };
  workType: 'thuc_tap' | 'do_an';
  company?: {
    name: string;
    supervisorName: string;
    supervisorEmail?: string;
    supervisorPhone?: string;
    address: string;
  };
  projectTopic?: string;
  status: string;
  finalGrade?: number;
  letterGrade?: string;
  progressPercentage: number;
  submittedToBCN: boolean;
  startDate: string;
  endDate: string;
  updatedAt: string;
}

// Supervisor (GV) APIs
export const getSupervisorGrades = async (status?: string): Promise<{ grades: GradeSummary[] }> => {
  const params = new URLSearchParams();
  if (status && status !== 'all') params.append('status', status);
  
  const response = await apiClient.request<{ success: boolean; grades: GradeSummary[] }>(
    `/grades/supervisor/students?${params.toString()}`
  );
  return response;
};

export const getStudentGradeDetails = async (studentId: string): Promise<{ grade: InternshipGrade }> => {
  const response = await apiClient.request<{ success: boolean; grade: InternshipGrade }>(
    `/grades/students/${studentId}`
  );
  return response;
};

export const updateMilestone = async (
  studentId: string, 
  milestoneId: string, 
  data: {
    status?: string;
    supervisorNotes?: string;
    submittedDocuments?: Array<{
      fileName: string;
      fileUrl: string;
      submittedAt: string;
    }>;
  }
): Promise<{ milestone: Milestone; progressPercentage: number; gradeStatus?: string }> => {
  const response = await apiClient.request<{ 
    success: boolean; 
    milestone: Milestone; 
    progressPercentage: number;
    gradeStatus?: string;
  }>(`/grades/students/${studentId}/milestones/${milestoneId}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
  return response;
};

export const updateGradeComponents = async (
  studentId: string,
  data: {
    gradeComponents?: GradeComponent[];
    supervisorFinalComment?: string;
    gradingNotes?: string;
    gradingFiles?: Array<{
      id: string;
      fileName: string;
      fileUrl: string;
      uploadedAt: string;
    }>;
  }
): Promise<{ 
  grade: {
    gradeComponents: GradeComponent[];
    finalGrade?: number;
    letterGrade?: string;
    status: string;
    supervisorFinalComment?: string;
    gradingNotes?: string;
    gradingFiles?: Array<{
      id: string;
      fileName: string;
      fileUrl: string;
      uploadedAt: string;
    }>;
  }
}> => {
  const response = await apiClient.request<{ 
    success: boolean; 
    grade: {
      gradeComponents: GradeComponent[];
      finalGrade?: number;
      letterGrade?: string;
      status: string;
      supervisorFinalComment?: string;
      gradingNotes?: string;
      gradingFiles?: Array<{
        id: string;
        fileName: string;
        fileUrl: string;
        uploadedAt: string;
      }>;
    }
  }>(`/grades/students/${studentId}/grades`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
  return response;
};

// Upload files for grading
export const uploadGradingFiles = async (files: FileList): Promise<{ 
  success: boolean; 
  files: Array<{
    path: string;
    filename: string;
    originalName: string;
    size: number;
  }>
}> => {
  const formData = new FormData();
  Array.from(files).forEach(file => {
    formData.append('files', file);
  });
  
  const response = await apiClient.request<{ 
    success: boolean; 
    files: Array<{
      path: string;
      filename: string;
      originalName: string;
      size: number;
    }>
  }>('/uploads/multiple', {
    method: 'POST',
    body: formData,
    headers: undefined // Let browser set content-type for FormData
  });
  return response;
};

// Delete grading file (placeholder for future implementation)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const deleteGradingFile = async (_fileName: string): Promise<{ success: boolean }> => {
  // For now, just return success since there's no delete endpoint yet
  // In a real implementation, you'd call DELETE /uploads/${_fileName}
  return Promise.resolve({ success: true });
};

export const submitGradesToBCN = async (studentId: string): Promise<{ message: string }> => {
  const response = await apiClient.request<{ 
    success: boolean; 
    message: string;
    grade: {
      status: string;
      submittedToBCN: boolean;
      submittedAt: string;
    }
  }>(`/grades/students/${studentId}/submit`, {
    method: 'POST'
  });
  return response;
};

// Update work type and company information
export const updateWorkInfo = async (
  studentId: string,
  data: {
    workType: 'thuc_tap' | 'do_an';
    company?: {
      name: string;
      supervisorName: string;
      supervisorEmail: string;
      supervisorPhone: string;
      address: string;
    };
    projectTopic?: string;
  }
): Promise<{ message: string; grade: Partial<InternshipGrade> }> => {
  const response = await apiClient.request<{ 
    success: boolean; 
    message: string;
    grade: {
      workType: 'thuc_tap' | 'do_an';
      company?: {
        name: string;
        supervisorName: string;
        supervisorEmail: string;
        supervisorPhone: string;
        address: string;
      };
      projectTopic?: string;
      gradeComponents: GradeComponent[];
      milestones: Milestone[];
    }
  }>(`/grades/students/${studentId}/work-info`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
  return { message: response.message, grade: response.grade };
};

// Add custom milestone
export const addCustomMilestone = async (
  studentId: string,
  data: {
    title: string;
    description?: string;
    dueDate: string;
  }
): Promise<{ message: string; milestone: Milestone }> => {
  const response = await apiClient.request<{ 
    success: boolean; 
    message: string;
    milestone: Milestone;
  }>(`/grades/students/${studentId}/milestones`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
  return response;
};

export const editMilestoneDetails = async (
  studentId: string,
  milestoneId: string,
  data: {
    title?: string;
    description?: string;
    dueDate?: string;
  }
): Promise<{ message: string; milestone: Milestone }> => {
  const response = await apiClient.request<{ 
    success: boolean; 
    message: string;
    milestone: Milestone;
  }>(`/grades/students/${studentId}/milestones/${milestoneId}/details`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
  return response;
};

export const deleteMilestone = async (
  studentId: string,
  milestoneId: string
): Promise<{ message: string }> => {
  const response = await apiClient.request<{ 
    success: boolean; 
    message: string;
  }>(`/grades/students/${studentId}/milestones/${milestoneId}`, {
    method: 'DELETE'
  });
  return response;
};

// Upload files to milestone
export const uploadMilestoneFiles = async (
  studentId: string,
  milestoneId: string,
  files: Array<{
    id: string;
    fileName: string;
    fileUrl: string;
  }>
): Promise<{ 
  message: string; 
  fileSubmissions: Array<{
    id: string;
    fileName: string;
    fileUrl: string;
    uploadedAt: string;
    uploadedBy: 'student' | 'supervisor';
  }>;
}> => {
  const response = await apiClient.request<{ 
    success: boolean; 
    message: string;
    fileSubmissions: Array<{
      id: string;
      fileName: string;
      fileUrl: string;
      uploadedAt: string;
      uploadedBy: 'student' | 'supervisor';
    }>;
  }>(`/grades/students/${studentId}/milestones/${milestoneId}/files`, {
    method: 'POST',
    body: JSON.stringify({ files })
  });
  return response;
};

// Delete file from milestone
export const deleteMilestoneFile = async (
  studentId: string,
  milestoneId: string,
  fileId: string
): Promise<{ 
  message: string; 
  fileSubmissions: Array<{
    id: string;
    fileName: string;
    fileUrl: string;
    uploadedAt: string;
    uploadedBy: 'student' | 'supervisor';
  }>;
}> => {
  const response = await apiClient.request<{ 
    success: boolean; 
    message: string;
    fileSubmissions: Array<{
      id: string;
      fileName: string;
      fileUrl: string;
      uploadedAt: string;
      uploadedBy: 'student' | 'supervisor';
    }>;
  }>(`/grades/students/${studentId}/milestones/${milestoneId}/files/${fileId}`, {
    method: 'DELETE'
  });
  return response;
};

// BCN APIs
export const getBCNSubmittedGrades = async (): Promise<{ grades: InternshipGrade[] }> => {
  const response = await apiClient.request<{ 
    success: boolean;
    grades: InternshipGrade[];
  }>(`/grades/bcn/submitted-grades`);
  return response;
};

export const getBCNPendingGrades = async (): Promise<{ 
  subject: { id: string; title: string }; 
  grades: Array<{
    id: string;
    student: { id: string; name: string; email: string };
    supervisor: { id: string; name: string; email: string };
    finalGrade: number;
    letterGrade: string;
    submittedAt: string;
    supervisorFinalComment: string;
    company?: {
      name: string;
      supervisorName: string;
      supervisorEmail?: string;
      supervisorPhone?: string;
      address: string;
    };
    projectTopic?: string;
  }>
}> => {
  const response = await apiClient.request<{ 
    success: boolean;
    subject: { id: string; title: string }; 
    grades: Array<{
      id: string;
      student: { id: string; name: string; email: string };
      supervisor: { id: string; name: string; email: string };
      finalGrade: number;
      letterGrade: string;
      submittedAt: string;
      supervisorFinalComment: string;
    }>
  }>(`/grades/bcn/pending-grades`);
  return response;
};

export const getGradeDetailsForReview = async (gradeId: string): Promise<{ grade: InternshipGrade }> => {
  const response = await apiClient.request<{ 
    success: boolean;
    grade: InternshipGrade;
  }>(`/grades/bcn/grades/${gradeId}`);
  return response;
};

export const reviewGrade = async (
  gradeId: string,
  action: 'approve' | 'reject',
  bcnComment?: string
): Promise<{ message: string }> => {
  const response = await apiClient.request<{ 
    success: boolean; 
    message: string;
    grade: {
      status: string;
      bcnComment: string;
      approvedAt: string;
    }
  }>(`/grades/bcn/grades/${gradeId}/review`, {
    method: 'POST',
    body: JSON.stringify({ action, bcnComment })
  });
  return response;
};

// Student API
export const getStudentProgress = async (): Promise<{ grade: InternshipGrade | null }> => {
  const response = await apiClient.request<{ 
    success: boolean; 
    grade: InternshipGrade | null;
    message?: string;
  }>(`/grades/student/my-progress`);
  return response;
};

// Helper functions
export const getGradeComponentName = (type: string): string => {
  const names = {
    'supervisor_score': 'Điểm GV',
    'company_score': 'Điểm Doanh Nghiệp'
  };
  return names[type as keyof typeof names] || type;
};

export const getMilestoneStatusText = (status: string): string => {
  const statusText = {
    'pending': 'Chờ thực hiện',
    'in_progress': 'Đang thực hiện',
    'completed': 'Hoàn thành',
    'overdue': 'Quá hạn'
  };
  return statusText[status as keyof typeof statusText] || status;
};

export const getGradeStatusText = (status: string): string => {
  const statusText = {
    'not_started': 'Chưa bắt đầu',
    'in_progress': 'Đang thực hiện',
    'draft_completed': 'Đã hoàn thành',
    'submitted': 'Đã nộp',
    'approved': 'Đã duyệt',
    'rejected': 'Bị từ chối'
  };
  return statusText[status as keyof typeof statusText] || status;
};

export const getWorkTypeText = (workType: string): string => {
  const workTypeText = {
    'thuc_tap': 'Đang thực tập',
    'do_an': 'Đang làm đồ án'
  };
  return workTypeText[workType as keyof typeof workTypeText] || workType;
};

export const getGradeStatusColor = (status: string): string => {
  const colors = {
    'not_started': 'bg-gray-100 text-gray-800',
    'in_progress': 'bg-blue-100 text-blue-800',
    'draft_completed': 'bg-yellow-100 text-yellow-800',
    'submitted': 'bg-purple-100 text-purple-800',
    'approved': 'bg-green-100 text-green-800',
    'rejected': 'bg-red-100 text-red-800'
  };
  return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
};