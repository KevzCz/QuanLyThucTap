const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

/* Narrow domain types */
export type Role = "phong-dao-tao" | "ban-chu-nhiem" | "giang-vien" | "sinh-vien";
export type Status = "open" | "locked";

/* Read models */
export interface Account {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: Status;
  khoa?: string;
  year?: number;
  maxStudents?: number; // Calculated dynamically for GV
  currentStudentCount?: number; // For GV
  mustChangePassword?: boolean; // Force password change on first login
}

/* DTOs for write operations */
export interface CreateAccountDTO {
  id?: string; // Make id optional, will be generated if not provided
  name: string;
  email: string;
  password: string;
  role: Role;
  status?: Status; // server defaults to "open"
  khoa?: string;
  year?: number;
  hocKyId?: string; // Optional học kỳ to add sinh viên to
}

export type UpdateAccountDTO = Partial<{
  name: string;
  email: string;
  role: Role;
  status: Status;
  password: string;
  khoa: string;
  year: number;
}>;

export interface LoginResponse {
  success: boolean;
  account: Account;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  error?: string;
  message?: string;
  data?: T;
}

export interface PaginatedAccountsResponse {
  success: boolean;
  accounts: Account[];
  pagination: { page: number; pages: number; total: number };
}

/* HocKy Types */
export interface HocKy {
  id: string;
  hocKyNumber: number;
  namHoc: string;
  durationStart: string;
  durationEnd: string;
  sinhViens: string[]; // Array of SinhVien IDs
  studentCount?: number;
  importDate?: string;
  importedBy?: {
    id: string;
    name: string;
    username: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface ImportedStudent {
  accountId: string;
  sinhVienId: string;
  username: string;
  password: string | null;
  name: string;
  existing?: boolean;
}

export interface HocKyImportResponse {
  message: string;
  hocKy: {
    id: string;
    hocKyNumber: number;
    namHoc: string;
    durationStart: string;
    durationEnd: string;
    studentCount: number;
  };
  students: ImportedStudent[];
  errors?: string[];
}

/* Grade Appeal Types */
export interface GradeAppeal {
  _id: string;
  student: {
    _id: string;
    id: string;
    name: string;
    email: string;
  };
  internshipGrade: {
    _id: string;
    workType: string;
    finalGrade?: number;
    letterGrade?: string;
  };
  originalSupervisor: {
    _id: string;
    id: string;
    name: string;
    email: string;
  };
  newSupervisor?: {
    _id: string;
    id: string;
    name: string;
    email: string;
  };
  appealReason: string;
  status: 'pending' | 'accepted' | 'rejected' | 'reviewing' | 'completed';
  khoa: string;
  reviewedBy?: {
    _id: string;
    id: string;
    name: string;
    email: string;
  };
  reviewedAt?: string;
  reviewNote?: string;
  assignedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AvailableLecturer {
  _id: string;
  id: string;
  name: string;
  email: string;
  khoa: string;
  currentStudentCount: number;
  maxStudents: number;
}

export interface InstructorRequest {
  _id: string;
  student: {
    _id: string;
    id: string;
    name: string;
    email: string;
  };
  requestedInstructor: {
    _id: string;
    id: string;
    name: string;
    email: string;
  };
  message?: string;
  status: 'pending' | 'approved' | 'rejected';
  responseMessage?: string;
  respondedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/* Internship Subject Types */
import type {
  InternshipSubject,
  CreateInternshipSubjectDTO,
  UpdateInternshipSubjectDTO,
} from "../pages/PDT/internship_subject_management/InternshipSubjectTypes";
import type { PageStructure } from "../services/pageApi";

// Define StudentRegistration locally since it's not exported from the module
export interface StudentRegistration {
  id: string;
  studentId: string;
  subjectId: string;
  status: string;
  createdAt: string;
}

export interface PaginatedInternshipSubjectsResponse {
  success: boolean;
  subjects: InternshipSubject[];
  pagination: { page: number; pages: number; total: number };
}

export type GVStudentStatus =
  | "duoc-huong-dan"
  | "chua-duoc-huong-dan" 
  | "dang-lam-do-an"
  | "dang-thuc-tap"
  | "hoan-thanh";

export interface LecturerSummary {
  id: string;
  name: string;
  khoa?: string;
  subjectId?: string;
  subjectTitle?: string;
}

/** Shape we may get back from the server (some fields optional) */
export interface GVManagedStudentRaw {
  id: string;
  name: string;
  email: string;
  status?: GVStudentStatus;
  khoa?: string;
  studentClass?: string;
  year?: number;
  content?: string; // Add content property for compatibility
}

export interface LecturerManagedStudentsResponse {
  success: boolean;
  lecturer?: LecturerSummary; // optional for backward compatibility
  students: GVManagedStudentRaw[];
  error?: string;
}

/* Notification Types */
export type NotificationType = 
  | "chat-request"
  | "chat-message"
  | "request-accepted"
  | "request-rejected"
  | "report-reviewed"
  | "student-assigned"
  | "student-removed"
  | "subject-assigned"
  | "file-submitted"
  | "deadline-reminder"
  | "system"
  | "other";

export type NotificationPriority = "low" | "normal" | "high" | "urgent";

export interface Notification {
  _id: string;
  recipient: string;
  sender?: {
    id: string;
    name: string;
    email: string;
    role: Role;
  };
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  priority: NotificationPriority;
  isRead: boolean;
  readAt?: string;
  metadata?: {
    conversationId?: string;
    requestId?: string;
    reportId?: string;
    subjectId?: string;
    studentId?: string;
    subHeaderId?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedNotificationsResponse {
  success: boolean;
  notifications: Notification[];
  pagination: {
    page: number;
    pages: number;
    total: number;
  };
}

export interface NotificationCountResponse {
  success: boolean;
  count: number;
}

class ApiClient {
  private baseURL: string;
  
  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  public async request<T = unknown>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const hasBody = options.body !== undefined;
    const isFormData = options.body instanceof FormData;

    const config: RequestInit = {
      credentials: "include",
      headers: {
        // Don't set Content-Type for FormData - let the browser set it with boundary
        ...(hasBody && !isFormData ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
      ...options,
    };

    const res = await fetch(url, config);

    // Some endpoints may return 204 No Content
    const isJson = res.headers.get("content-type")?.includes("application/json");
    const data = isJson ? await res.json() : (undefined as unknown as T);

    if (!res.ok) {
      const msg = isJson && (data as { error?: string })?.error ? (data as { error?: string }).error : `HTTP ${res.status}`;
      throw new Error(msg);
    }

    return data as T;
  }

  // ===== Auth =====
  login(email: string, password: string) {
    return this.request<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  }

  logout() {
    return this.request<ApiResponse>("/auth/logout", { method: "POST" });
  }

  changePassword(currentPassword: string, newPassword: string) {
    return this.request<ApiResponse>("/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword })
    });
  }

  getCurrentUser() {
    return this.request<LoginResponse>("/auth/me");
  }

  // ===== Accounts (PDT) =====
  createAccount(data: CreateAccountDTO) {
    // Server route: POST /api/accounts  (protected by authPDT)
    // Let the server generate the ID
    return this.request<{ success: boolean; account: Account }>("/accounts", {
      method: "POST",
      body: JSON.stringify({
        name: data.name,
        email: data.email,
        password: data.password,
        role: data.role,
        status: data.status ?? "open",
        khoa: data.khoa,
        year: data.year,
        hocKyId: data.hocKyId,
        // Don't send id - let server generate it
      }),
    });
  }

  getAccounts(params?: {
    page?: number;
    limit?: number;
    status?: Status;
    role?: Role;
    search?: string;
  }) {
    const qs = new URLSearchParams();
    if (params) {
      if (params.page != null) qs.append("page", String(params.page));
      if (params.limit != null) qs.append("limit", String(params.limit));
      if (params.status) qs.append("status", params.status);
      if (params.role) qs.append("role", params.role);
      if (params.search) qs.append("search", params.search);
    }
    const endpoint = `/accounts${qs.toString() ? `?${qs.toString()}` : ""}`;
    return this.request<PaginatedAccountsResponse>(endpoint);
  }

  getAccountById(id: string) {
    return this.request<{ success: boolean; account: Account }>(`/accounts/${id}`).then(res => res.account);
  }

  updateAccount(id: string, updates: UpdateAccountDTO) {
    return this.request<{ success: boolean; account: Account }>(`/accounts/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  }

  deleteAccount(id: string) {
    return this.request<ApiResponse>(`/accounts/${id}`, { method: "DELETE" });
  }

  getKhoaList() {
    return this.request<{ success: boolean; khoa: string[] }>("/accounts/khoa").then(res => res.khoa);
  }

  // ===== Internship Subjects =====
  getInternshipSubjects(params?: {
    page?: number;
    limit?: number;
    status?: "open" | "locked" | "all";
    search?: string;
  }) {
    const qs = new URLSearchParams();
    if (params) {
      if (params.page != null) qs.append("page", String(params.page));
      if (params.limit != null) qs.append("limit", String(params.limit));
      if (params.status && params.status !== "all") qs.append("status", params.status);
      if (params.search) qs.append("search", params.search);
    }
    const endpoint = `/internship-subjects${qs.toString() ? `?${qs.toString()}` : ""}`;
    return this.request<PaginatedInternshipSubjectsResponse>(endpoint);
  }

  getInternshipSubject(id: string) {
    return this.request<{ success: boolean; subject: InternshipSubject }>(`/internship-subjects/${id}`);
  }

  // Get detailed internship subject with supervision info
  getInternshipSubjectWithSupervision(id: string) {
    return this.request<{ 
      success: boolean; 
      subject: {
        id: string;
        title: string;
        students: Array<{
          id: string;
          name: string;
          email: string;
          supervisor?: { id: string; name: string };
        }>;
        lecturers: Array<{
          id: string;
          name: string;
          email: string;
        }>;
      }
    }>(`/internship-subjects/${id}`);
  }

  getAvailableManagers() {
    return this.request<{ success: boolean; managers: Array<{ id: string; name: string; email: string }> }>("/internship-subjects/available-managers");
  }

  createInternshipSubject(data: CreateInternshipSubjectDTO) {
    return this.request<{ success: boolean; subject: InternshipSubject }>("/internship-subjects", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  updateInternshipSubject(id: string, updates: UpdateInternshipSubjectDTO) {
    return this.request<{ success: boolean; subject: InternshipSubject }>(`/internship-subjects/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  }

  deleteInternshipSubject(id: string) {
    return this.request<ApiResponse>(`/internship-subjects/${id}`, { method: "DELETE" });
  }

  // ===== BCN Participant Management =====
  
  // Get BCN's managed khoa (department) - Updated to use profile endpoint
  getBCNManagedSubject() {
    return this.request<{ success: boolean; khoa: InternshipSubject | null }>("/profile/bcn/khoa-info");
  }

  // Add lecturer to subject
  addLecturerToSubject(subjectId: string, lecturerId: string) {
    return this.request<{ success: boolean; subject: InternshipSubject }>(`/internship-subjects/${subjectId}/lecturers`, {
      method: "POST",
      body: JSON.stringify({ lecturerId }),
    });
  }

  // Remove lecturer from subject  
  removeLecturerFromSubject(subjectId: string, lecturerId: string) {
    return this.request<ApiResponse>(`/internship-subjects/${subjectId}/lecturers/${lecturerId}`, {
      method: "DELETE",
    });
  }

  // Add student to subject
  addStudentToSubject(subjectId: string, studentId: string, supervisorId?: string) {
    return this.request<{ success: boolean; subject: InternshipSubject }>(`/internship-subjects/${subjectId}/students`, {
      method: "POST", 
      body: JSON.stringify({ studentId, supervisorId }),
    });
  }

  // Remove student from subject
  removeStudentFromSubject(subjectId: string, studentId: string) {
    return this.request<ApiResponse>(`/internship-subjects/${subjectId}/students/${studentId}`, {
      method: "DELETE",
    });
  }

  // Update student supervisor (khoa-based)
  updateStudentSupervisor(studentId: string, supervisorId?: string) {
    return this.request<{ success: boolean; message: string }>(`/students/${studentId}/supervisor`, {
      method: "PUT",
      body: JSON.stringify({ supervisorId }),
    });
  }

  // Get available students for BCN's khoa (students without supervisor)
  getAvailableStudents() {
    return this.request<{ success: boolean; students: Array<{ id: string; name: string; email: string }> }>(`/students/available`);
  }

  // Get lecturer's managed students
  getLecturerManagedStudents() {
    return this.request<LecturerManagedStudentsResponse>("/lecturers/managed-students");
  }

  // Get lecturers by khoa (for BCN to select appeal reviewers)
  getLecturersByKhoa(khoa: string) {
    return this.request<{ 
      success: boolean; 
      lecturers: Array<{
        _id: string;
        id: string;
        name: string;
        email: string;
        khoa: string;
      }>
    }>(`/lecturers/by-khoa/${khoa}`);
  }
  getStudentAvailableSubjects() {
    return this.request<{ success: boolean; subjects: InternshipSubject[]; studentRegistration?: StudentRegistration }>(
      "/internship-subjects/student/available"
    );
  }

  // Student: register subject
  registerStudentToSubject(subjectId: string) {
    return this.request<{ success: boolean; registration: StudentRegistration }>(
      "/internship-subjects/student/register",
      { method: "POST", body: JSON.stringify({ subjectId }) }
    );
  }

  // Teacher registration methods
  async getTeacherAvailableSubjects() {
    return this.request('/internship-subjects/teacher/available');
  }

  async registerTeacherToSubject(subjectId: string) {
    return this.request('/internship-subjects/teacher/register', {
      method: 'POST',
      body: JSON.stringify({ subjectId })
    });
  }

  // Get subjects for page viewing
  getSubjectsForPageViewing() {
    return this.request<{ success: boolean; subjects: Array<{ id: string; title: string }> }>('/internship-subjects/for-pages');
  }

  // Teacher page management methods
  getTeacherPageStructure() {
    return this.request<{
      success: boolean;
      instructor: { id: string; name: string; email: string };
      subject: { id: string; title: string; canManage: boolean } | null;
      headers: Array<{
        _id: string;
        id: string;
        title: string;
        order: number;
        audience: string;
        subs: Array<{
          _id: string;
          id: string;
          title: string;
          content?: string;
          order: number;
          kind: string;
          audience: string;
          startAt?: string;
          endAt?: string;
          fileUrl?: string;
          fileName?: string;
        }>;
      }>;
    }>('/pages/teacher/managed');
  }

  // Get teacher-specific page structure for viewing (used by students)
  getTeacherPageStructureForViewing = async (instructorId: string, subjectId?: string): Promise<PageStructure> => {
    if (!instructorId) {
      throw new Error('Instructor ID is required');
    }
    
    const params = new URLSearchParams();
    if (subjectId) params.append('subjectId', subjectId);
    
    const response = await apiClient.request<PageStructure>(`/pages/teacher/${instructorId}/view?${params.toString()}`);
    return response;
  };

  createTeacherPageHeader(subjectId: string, data: {
    title: string;
    order: number;
    audience: string;
  }) {
    return this.request<{
      success: boolean;
      header: {
        _id: string;
        id: string;
        title: string;
        order: number;
        audience: string;
      };
    }>(`/pages/teacher/subjects/${subjectId}/headers`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  updateTeacherPageHeader(headerId: string, data: {
    title: string;
    order: number;
    audience: string;
  }) {
    return this.request(`/pages/teacher/headers/${headerId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  deleteTeacherPageHeader(headerId: string) {
    return this.request(`/pages/teacher/headers/${headerId}`, {
      method: 'DELETE'
    });
  }

  createTeacherSubHeader(headerId: string, data: {
    title: string;
    content?: string;
    order: number;
    kind: string;
    audience: string;
    startAt?: string;
    endAt?: string;
    fileUrl?: string;
    fileName?: string;
  }) {
    return this.request<{
      success: boolean;
      subHeader: {
        _id: string;
        id: string;
        title: string;
        content?: string;
        order: number;
        kind: string;
        audience: string;
        startAt?: string;
        endAt?: string;
        fileUrl?: string;
        fileName?: string;
      };
    }>(`/pages/teacher/headers/${headerId}/subs`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // Add reordering methods for teacher pages
  reorderTeacherHeaders(headerIds: string[]) {
    return this.request(`/pages/teacher/headers/reorder`, {
      method: 'PUT',
      body: JSON.stringify({ headerIds })
    });
  }

  reorderTeacherSubHeaders(headerId: string, subHeaderIds: string[]) {
    return this.request(`/pages/teacher/headers/${headerId}/subs/reorder`, {
      method: 'PUT', 
      body: JSON.stringify({ subHeaderIds })
    });
  }

  // Update existing teacher sub-header method
  updateTeacherSubHeader(subId: string, data: {
    title: string;
    content?: string;
    order: number;
    audience: string;
    startAt?: string;
    endAt?: string;
    fileUrl?: string;
    fileName?: string;
  }) {
    return this.request(`/pages/teacher/subs/${subId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  deleteTeacherSubHeader(subId: string) {
    return this.request(`/pages/teacher/subs/${subId}`, {
      method: 'DELETE'
    });
  }

  // Report management methods
  createRequest(data: {
    students: Array<{ id: string; name: string }>;
    type: "add-student" | "remove-student";
    reviewNote?: string;
  }) {
    return this.request<{
      success: boolean;
      request: {
        _id: string;
        students: Array<{ id: string; name: string }>;
        type: "add-student" | "remove-student";
        status: "pending" | "accepted" | "rejected";
        createdAt: string;
        internshipSubject: { id: string; title: string };
      };
    }>("/requests", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  getMyRequests(params?: {
    page?: number;
    limit?: number;
    status?: "pending" | "accepted" | "rejected";
    type?: "add-student" | "remove-student";
  }) {
    const qs = new URLSearchParams();
    if (params) {
      if (params.page != null) qs.append("page", String(params.page));
      if (params.limit != null) qs.append("limit", String(params.limit));
      if (params.status) qs.append("status", params.status);
      if (params.type) qs.append("type", params.type);
    }
    const endpoint = `/requests/my-requests${qs.toString() ? `?${qs.toString()}` : ""}`;
    return this.request<{
      success: boolean;
      requests: Array<{
        _id: string;
        students: Array<{ id: string; name: string }>;
        type: "add-student" | "remove-student";
        status: "pending" | "accepted" | "rejected";
        reviewNote?: string;
        reviewedBy?: { id: string; name: string; email: string };
        reviewedAt?: string;
        createdAt: string;
        internshipSubject: { id: string; title: string };
      }>;
      pagination: { page: number; pages: number; total: number };
    }>(endpoint);
  }

  deleteRequest(requestId: string) {
    return this.request<{ success: boolean; message: string }>(`/requests/${requestId}`, {
      method: "DELETE",
    });
  }

  // BCN request management
  getBCNPendingRequests(params?: {
    page?: number;
    limit?: number;
    type?: "add-student" | "remove-student";
    search?: string;
  }) {
    const qs = new URLSearchParams();
    if (params) {
      if (params.page != null) qs.append("page", String(params.page));
      if (params.limit != null) qs.append("limit", String(params.limit));
      if (params.type) qs.append("type", params.type);
      if (params.search) qs.append("search", params.search);
    }
    const endpoint = `/requests/bcn/pending${qs.toString() ? `?${qs.toString()}` : ""}`;
    return this.request<{
      success: boolean;
      requests: Array<{
        _id: string;
        name: string;
        idgv: string;
        students: Array<{ id: string; name: string }>;
        type: "add-student" | "remove-student";
        status: "pending";
        createdAt: string;
        khoa?: string;
      }>;
      pagination: { page: number; pages: number; total: number };
    }>(endpoint);
  }

  acceptRequest(requestId: string, reviewNote?: string) {
    return this.request<{
      success: boolean;
      request: {
        _id: string;
        status: "accepted";
        reviewNote?: string;
        reviewedBy: { id: string; name: string; email: string };
        reviewedAt: string;
      };
      message: string;
    }>(`/requests/${requestId}/accept`, {
      method: "PUT",
      body: JSON.stringify({ reviewNote }),
    });
  }

  rejectRequest(requestId: string, reviewNote?: string) {
    return this.request<{
      success: boolean;
      request: {
        _id: string;
        status: "rejected";
        reviewNote?: string;
        reviewedBy: { id: string; name: string; email: string };
        reviewedAt: string;
      };
      message: string;
    }>(`/requests/${requestId}/reject`, {
      method: "PUT",
      body: JSON.stringify({ reviewNote }),
    });
  }

  // Get student's assigned instructor and page data
  getStudentAssignedInstructor() {
    return this.request<{
      student?: { id: string; khoa: string };
      instructor?: { id: string; name: string; email: string };
      subject?: { id: string; title: string };
    }>("/profile/student/info");
  }

  // Teacher report management methods
  getTeacherReports(params?: {
    page?: number;
    limit?: number;
    status?: string;
    reportType?: string;
  }) {
    const qs = new URLSearchParams();
    if (params) {
      if (params.page != null) qs.append("page", String(params.page));
      if (params.limit != null) qs.append("limit", String(params.limit));
      if (params.status && params.status !== "all") qs.append("status", params.status);
      if (params.reportType && params.reportType !== "all") qs.append("reportType", params.reportType);
    }
    const endpoint = `/reports/teacher${qs.toString() ? `?${qs.toString()}` : ""}`;
    return this.request<{
      success: boolean;
      reports: Array<{
        _id: string;
        id: string;
        title: string;
        content: string;
        reportType: string;
        status: string;
        submittedAt?: string;
        reviewedAt?: string;
        reviewNote?: string;
        attachments?: Array<{
          fileName: string;
          fileUrl: string;
          fileSize: number;
        }>;
        createdAt: string;
        updatedAt: string;
        internshipSubject: { id: string; title: string };
        instructor: { id: string; name: string };
      }>;
      pagination?: { page: number; pages: number; total: number };
    }>(endpoint);
  }

  createTeacherReport(data: {
    title: string;
    content: string;
    reportType: string;
    attachments?: Array<{
      fileName: string;
      fileUrl: string;
      fileSize: number;
    }>;
  }) {
    return this.request<{
      success: boolean;
      report: {
        _id: string;
        id: string;
        title: string;
        content: string;
        reportType: string;
        status: string;
        createdAt: string;
        updatedAt: string;
        internshipSubject: { id: string; title: string };
        instructor: { id: string; name: string };
        attachments?: Array<{
          fileName: string;
          fileUrl: string;
          fileSize: number;
        }>;
      };
    }>("/reports/teacher", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  updateTeacherReport(reportId: string, updates: {
    title: string;
    content: string;
    reportType: string;
    attachments?: Array<{
      fileName: string;
      fileUrl: string;
      fileSize: number;
    }>;
  }) {
    return this.request<{
      success: boolean;
      report: {
        _id: string;
        id: string;
        title: string;
        content: string;
        reportType: string;
        status: string;
        createdAt: string;
        updatedAt: string;
        internshipSubject: { id: string; title: string };
        instructor: { id: string; name: string };
        attachments?: Array<{
          fileName: string;
          fileUrl: string;
          fileSize: number;
        }>;
      };
    }>(`/reports/teacher/${reportId}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  }

  submitTeacherReport(reportId: string) {
    return this.request<{
      success: boolean;
      report: {
        _id: string;
        id: string;
        title: string;
        content: string;
        reportType: string;
        status: string;
        submittedAt?: string;
        reviewedAt?: string;
        reviewNote?: string;
        attachments?: Array<{
          fileName: string;
          fileUrl: string;
          fileSize: number;
        }>;
        createdAt: string;
        updatedAt: string;
        internshipSubject: { id: string; title: string };
        instructor: { id: string; name: string };
      };
      message?: string;
    }>(`/reports/teacher/${reportId}/submit`, {
      method: "PUT",
    });
  }

  deleteTeacherReport(reportId: string) {
    return this.request<{ success: boolean; message: string }>(`/reports/teacher/${reportId}`, {
      method: "DELETE",
    });
  }

  // Add missing teacher submission methods
  getTeacherSubHeader(subId: string) {
    return this.request<{ 
      success: boolean; 
      subHeader: {
        _id: string;
        id: string;
        title: string;
        content?: string;
        order: number;
        kind: string;
        audience: string;
        startAt?: string;
        endAt?: string;
        fileUrl?: string;
        fileName?: string;
      }; 
      canEdit: boolean; 
      subject: { id: string; title: string } 
    }>(`/pages/teacher/subs/${subId}`);
  }

  getTeacherSubmissions(subId: string) {
    return this.request<{
      success: boolean;
      submissions: Array<{
        _id: string;
        subHeader: string;
        submitter: {
          id: string;
          name: string;
          email: string;
        };
        fileUrl: string;
        fileName: string;
        fileSize: number;
        status: "submitted" | "reviewed" | "accepted" | "rejected";
        reviewNote?: string;
        reviewedBy?: {
          id: string;
          name: string;
          email: string;
        };
        reviewedAt?: string;
        createdAt: string;
        updatedAt: string;
      }>;
      canReview: boolean;
    }>(`/pages/teacher/subs/${subId}/submissions`);
  }

  updateTeacherSubmissionStatus(submissionId: string, data: {
    status: "submitted" | "reviewed" | "accepted" | "rejected";
    reviewNote?: string;
  }) {
    return this.request(`/pages/teacher/submissions/${submissionId}`, {
      method: "PUT",
      body: JSON.stringify(data)
    });
  }

  // BCN report management methods
  getBCNReports(params?: {
    page?: number;
    limit?: number;
    status?: string;
    reportType?: string;
    search?: string;
  }) {
    const qs = new URLSearchParams();
    if (params) {
      if (params.page != null) qs.append("page", String(params.page));
      if (params.limit != null) qs.append("limit", String(params.limit));
      if (params.status && params.status !== "all") qs.append("status", params.status);
      if (params.reportType && params.reportType !== "all") qs.append("reportType", params.reportType);
      if (params.search) qs.append("search", params.search);
    }
    const endpoint = `/reports/bcn/review${qs.toString() ? `?${qs.toString()}` : ""}`;
    return this.request<{
      success: boolean;
      reports: Array<{
        _id: string;
        id: string;
        title: string;
        content: string;
        reportType: string;
        status: string;
        submittedAt?: string;
        reviewedAt?: string;
        reviewNote?: string;
        attachments?: Array<{
          fileName: string;
          fileUrl: string;
          fileSize: number;
        }>;
        createdAt: string;
        updatedAt: string;
        khoa: string;
        instructor: { id: string; name: string; email: string };
        reviewedBy?: { id: string; name: string; email: string };
      }>;
      pagination?: { page: number; pages: number; total: number };
    }>(endpoint);
  }

  reviewReport(reportId: string, data: {
    status: "reviewed" | "approved" | "rejected";
    reviewNote?: string;
  }) {
    return this.request<{
      success: boolean;
      report: {
        _id: string;
        status: string;
        reviewNote?: string;
        reviewedBy: { id: string; name: string; email: string };
        reviewedAt: string;
        [key: string]: unknown;
      };
    }>(`/reports/bcn/${reportId}/review`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  /* Notification API methods */
  getNotifications(params?: {
    page?: number;
    limit?: number;
    isRead?: boolean;
    type?: NotificationType | "all";
  }) {
    const qs = new URLSearchParams();
    if (params) {
      if (params.page != null) qs.append("page", String(params.page));
      if (params.limit != null) qs.append("limit", String(params.limit));
      if (params.isRead !== undefined) qs.append("isRead", String(params.isRead));
      if (params.type && params.type !== "all") qs.append("type", params.type);
    }
    const endpoint = `/notifications${qs.toString() ? `?${qs.toString()}` : ""}`;
    return this.request<PaginatedNotificationsResponse>(endpoint);
  }

  getUnreadNotificationCount() {
    return this.request<NotificationCountResponse>("/notifications/unread-count");
  }

  markNotificationAsRead(notificationId: string) {
    return this.request<{ success: boolean; notification: Notification }>(
      `/notifications/${notificationId}/read`,
      { method: "PUT" }
    );
  }

  markAllNotificationsAsRead() {
    return this.request<{ success: boolean; modifiedCount: number }>(
      "/notifications/read-all",
      { method: "PUT" }
    );
  }

  deleteNotification(notificationId: string) {
    return this.request<{ success: boolean; message: string }>(
      `/notifications/${notificationId}`,
      { method: "DELETE" }
    );
  }

  deleteAllReadNotifications() {
    return this.request<{ success: boolean; deletedCount: number }>(
      "/notifications",
      { method: "DELETE" }
    );
  }

  /* HocKy API methods */
  importHocKy(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    
    return this.request<HocKyImportResponse>("/hocky/import", {
      method: "POST",
      body: formData,
      // Don't set Content-Type header, let browser set it with boundary
      headers: {},
    });
  }

  getHocKyList(namHoc?: string) {
    const qs = new URLSearchParams();
    if (namHoc) qs.append("namHoc", namHoc);
    const endpoint = `/hocky${qs.toString() ? `?${qs.toString()}` : ""}`;
    return this.request<HocKy[]>(endpoint);
  }

  getNamHocList() {
    return this.request<string[]>("/hocky/nam-hoc");
  }

  getHocKyDetails(id: string) {
    return this.request<HocKy>(`/hocky/${id}`);
  }

  updateHocKy(id: string, data: Partial<{
    hocKyNumber: number;
    namHoc: string;
    durationStart: string;
    durationEnd: string;
  }>) {
    return this.request<{ message: string; hocKy: HocKy }>(`/hocky/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  deleteHocKy(id: string) {
    return this.request<{ message: string }>(`/hocky/${id}`, {
      method: "DELETE",
    });
  }

  /* Notification Management API methods */
  sendNotification(data: {
    title: string;
    message: string;
    recipientType: string;
    recipients?: string[];
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    link?: string;
  }) {
    return this.request<{ success: boolean; message: string; recipientCount: number }>(
      "/notification-management/send",
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
  }

  getNotificationRecipients(type: 'users' | 'khoa' | 'roles') {
    return this.request<{
      users?: Array<{ _id: string; id: string; name: string; email: string; role: Role }>;
      khoa?: string[];
      roles?: Array<{ value: string; label: string }>;
    }>(`/notification-management/recipients?type=${type}`);
  }

  /* Grade Appeals API methods */
  createGradeAppeal(gradeId: string, appealReason: string) {
    return this.request<{
      success: boolean;
      message: string;
      appeal: GradeAppeal;
    }>("/grade-appeals", {
      method: "POST",
      body: JSON.stringify({ gradeId, appealReason }),
    });
  }

  getMyGradeAppeals() {
    return this.request<{ appeals: GradeAppeal[] }>("/grade-appeals/my-appeals");
  }

  getBCNGradeAppeals(status?: string) {
    const qs = status ? `?status=${status}` : '';
    return this.request<{ appeals: GradeAppeal[] }>(`/grade-appeals/bcn${qs}`);
  }

  acceptGradeAppeal(appealId: string, newSupervisorId: string, reviewNote?: string) {
    return this.request<{
      success: boolean;
      message: string;
      appeal: GradeAppeal;
    }>(`/grade-appeals/${appealId}/accept`, {
      method: "PUT",
      body: JSON.stringify({ newSupervisorId, reviewNote }),
    });
  }

  rejectGradeAppeal(appealId: string, reviewNote?: string) {
    return this.request<{
      success: boolean;
      message: string;
      appeal: GradeAppeal;
    }>(`/grade-appeals/${appealId}/reject`, {
      method: "PUT",
      body: JSON.stringify({ reviewNote }),
    });
  }

  getGradeAppealDetails(appealId: string) {
    return this.request<{ appeal: GradeAppeal }>(`/grade-appeals/${appealId}`);
  }

  // Instructor Request methods
  createInstructorRequest(instructorId: string, message?: string) {
    return this.request<{ success: boolean; message: string; request: InstructorRequest }>("/instructor-requests", {
      method: "POST",
      body: JSON.stringify({ instructorId, message })
    });
  }

  getMyInstructorRequests() {
    return this.request<{ success: boolean; requests: InstructorRequest[] }>("/instructor-requests/my-requests");
  }

  getInstructorRequestsForMe() {
    return this.request<{ success: boolean; requests: InstructorRequest[] }>("/instructor-requests/for-instructor");
  }

  approveInstructorRequest(requestId: string, responseMessage?: string) {
    return this.request<{ success: boolean; message: string; request: InstructorRequest }>(`/instructor-requests/${requestId}/approve`, {
      method: "PUT",
      body: JSON.stringify({ responseMessage })
    });
  }

  rejectInstructorRequest(requestId: string, responseMessage?: string) {
    return this.request<{ success: boolean; message: string; request: InstructorRequest }>(`/instructor-requests/${requestId}/reject`, {
      method: "PUT",
      body: JSON.stringify({ responseMessage })
    });
  }

  cancelInstructorRequest(requestId: string) {
    return this.request<{ success: boolean; message: string }>(`/instructor-requests/${requestId}`, {
      method: "DELETE"
    });
  }

  getAvailableLecturers() {
    return this.request<{ success: boolean; lecturers: AvailableLecturer[] }>("/lecturers/available");
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
export default apiClient;

