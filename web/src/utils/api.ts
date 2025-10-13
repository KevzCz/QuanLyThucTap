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
}

/* DTOs for write operations */
export interface CreateAccountDTO {
  id?: string; // Make id optional, will be generated if not provided
  name: string;
  email: string;
  password: string;
  role: Role;
  status?: Status; // server defaults to "open"
}

export type UpdateAccountDTO = Partial<{
  name: string;
  email: string;
  role: Role;
  status: Status;
  password: string;
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

/* Internship Subject Types */
import type {
  InternshipSubject,
  CreateInternshipSubjectDTO,
  UpdateInternshipSubjectDTO,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  InternshipStatus,
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
  subjectId?: string;
  subjectTitle?: string;
}

/** Shape we may get back from the server (some fields optional) */
export interface GVManagedStudentRaw {
  id: string;
  name: string;
  email: string;
  status?: GVStudentStatus;
  internshipSubject?: { id: string; title: string };
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
class ApiClient {
  private baseURL: string;
  
  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  public async request<T = unknown>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const hasBody = options.body !== undefined;

    const config: RequestInit = {
      credentials: "include",
      headers: {
        ...(hasBody ? { "Content-Type": "application/json" } : {}),
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

  updateAccount(id: string, updates: UpdateAccountDTO) {
    return this.request<{ success: boolean; account: Account }>(`/accounts/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  }

  deleteAccount(id: string) {
    return this.request<ApiResponse>(`/accounts/${id}`, { method: "DELETE" });
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
  
  // Get BCN's managed internship subject
  getBCNManagedSubject() {
    return this.request<{ success: boolean; subject: InternshipSubject | null }>("/internship-subjects/bcn/managed");
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

  // Update student supervisor
  updateStudentSupervisor(subjectId: string, studentId: string, supervisorId?: string) {
    return this.request<{ success: boolean; subject: InternshipSubject }>(`/internship-subjects/${subjectId}/students/${studentId}/supervisor`, {
      method: "PUT",
      body: JSON.stringify({ supervisorId }),
    });
  }

  // Get available lecturers for subject
  getAvailableLecturers(subjectId: string) {
    return this.request<{ success: boolean; lecturers: Array<{ id: string; name: string; email: string }> }>(`/internship-subjects/${subjectId}/available-lecturers`);
  }

  // Get available students for subject  
  getAvailableStudents(subjectId: string) {
    return this.request<{ success: boolean; students: Array<{ id: string; name: string; email: string }> }>(`/internship-subjects/${subjectId}/available-students`);
  }

  // Get lecturer's managed students
  getLecturerManagedStudents() {
    return this.request<LecturerManagedStudentsResponse>("/lecturers/managed-students");
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
  reorderTeacherHeaders(subjectId: string, headerIds: string[]) {
    return this.request(`/pages/teacher/subjects/${subjectId}/headers/reorder`, {
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

  // ===== New Methods =====
  // Get student's assigned instructor
  getStudentAssignedInstructor() {
    // Try the students route first, fall back to auth route
    return this.request<{
      success: boolean;
      instructor?: { id: string; name: string; email: string };
      subject?: { id: string; title: string };
    }>("/students/my-instructor").catch(() => {
      // Fallback to auth endpoint
      return this.request<{
        success: boolean;
        instructor?: { id: string; name: string; email: string };
        subject?: { id: string; title: string };
      }>("/auth/student-instructor");
    });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
export default apiClient;

