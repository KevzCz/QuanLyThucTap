import { apiClient } from '../utils/api';

export interface PageHeader {
  _id: string;
  id: string;
  title: string;
  order: number;
  audience: "tat-ca" | "sinh-vien" | "giang-vien";
  isActive: boolean;
  subs: SubHeader[];
}

export interface SubHeader {
  _id: string;
  id: string;
  title: string;
  content?: string;
  order: number;
  kind: "thuong" | "thong-bao" | "nop-file" | "van-ban" | "file";
  audience: "tat-ca" | "sinh-vien" | "giang-vien";
  startAt?: string;
  endAt?: string;
  fileUrl?: string;
  fileName?: string;
  isActive: boolean;
}

export interface PageStructure {
  subject: {
    id: string;
    title: string;
    canManage: boolean;
  };
  headers: PageHeader[];
}

// Teacher-specific interfaces
export interface TeacherPageStructure {
  instructor: {
    id: string;
    name: string;
    email: string;
  };
  subject: {
    id: string;
    title: string;
    canManage: boolean;
  } | null;
  headers: PageHeader[];
}

// Get page structure for a subject
export const getPageStructure = async (subjectId: string, audience?: string): Promise<PageStructure> => {
  const params = new URLSearchParams();
  if (audience) params.append('audience', audience);
  
  try {
    const response = await apiClient.request<PageStructure>(`/pages/subjects/${encodeURIComponent(subjectId)}?${params.toString()}`);
    return response;
  } catch (error) {
    // If subject not found, return empty structure
    if (error instanceof Error && error.message.includes('404')) {
      return {
        subject: {
          id: subjectId,
          title: 'Môn thực tập',
          canManage: false
        },
        headers: []
      };
    }
    throw error;
  }
};

// Create page header
export const createPageHeader = async (subjectId: string, data: {
  title: string;
  order: number;
  audience: "tat-ca" | "sinh-vien" | "giang-vien";
}): Promise<PageHeader> => {
  const response = await apiClient.request<{ success: boolean; header: PageHeader }>(`/pages/subjects/${subjectId}/headers`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
  return response.header;
};

// Update page header
export const updatePageHeader = async (headerId: string, data: {
  title?: string;
  order?: number;
  audience?: "tat-ca" | "sinh-vien" | "giang-vien";
}): Promise<PageHeader> => {
  const response = await apiClient.request<{ success: boolean; header: PageHeader }>(`/pages/headers/${headerId}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
  return response.header;
};

// Delete page header
export const deletePageHeader = async (headerId: string): Promise<void> => {
  await apiClient.request(`/pages/headers/${headerId}`, {
    method: 'DELETE'
  });
};

// Create sub-header
export const createSubHeader = async (headerId: string, data: {
  title: string;
  content?: string;
  order: number;
  kind: "thuong" | "thong-bao" | "nop-file" | "van-ban" | "file";
  audience: "tat-ca" | "sinh-vien" | "giang-vien";
  startAt?: string;
  endAt?: string;
  fileUrl?: string;
  fileName?: string;
}): Promise<SubHeader> => {
  const response = await apiClient.request<{ success: boolean; subHeader: SubHeader }>(`/pages/headers/${headerId}/subs`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
  return response.subHeader;
};

// Update sub-header
export const updateSubHeader = async (subId: string, data: {
  title?: string;
  content?: string;
  order?: number;
  audience?: "tat-ca" | "sinh-vien" | "giang-vien";
  startAt?: string;
  endAt?: string;
  fileUrl?: string;
  fileName?: string;
}): Promise<SubHeader> => {
  const response = await apiClient.request<{ success: boolean; subHeader: SubHeader }>(`/pages/subs/${subId}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
  return response.subHeader;
};

// Delete sub-header
export const deleteSubHeader = async (subId: string): Promise<void> => {
  await apiClient.request(`/pages/subs/${subId}`, {
    method: 'DELETE'
  });
};

// Get single sub-header
export const getSubHeader = async (subId: string) => {
  const response = await apiClient.request<{ success: boolean; subHeader: SubHeader; canEdit: boolean; subject: { id: string; title: string } }>(`/pages/subs/${subId}`);
  return response;
};

// Reorder headers
export const reorderHeaders = async (subjectId: string, headerIds: string[]): Promise<void> => {
  await apiClient.request(`/pages/subjects/${subjectId}/headers/reorder`, {
    method: 'PUT',
    body: JSON.stringify({ headerIds })
  });
};

// Reorder sub-headers
export const reorderSubHeaders = async (headerId: string, subHeaderIds: string[]): Promise<void> => {
  await apiClient.request(`/pages/headers/${headerId}/subs/reorder`, {
    method: 'PUT',
    body: JSON.stringify({ subHeaderIds })
  });
};

// Teacher-specific page management
export const getTeacherPageStructure = async () => {
  return apiClient.request('/pages/teacher/managed');
};

export const createTeacherPageHeader = async (subjectId: string, data: {
  title: string;
  order: number;
  audience: string;
}) => {
  return apiClient.request(`/pages/teacher/subjects/${subjectId}/headers`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
};

export const updateTeacherPageHeader = async (headerId: string, data: {
  title: string;
  order: number;
  audience: string;
}) => {
  return apiClient.request(`/pages/teacher/headers/${headerId}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
};

export const deleteTeacherPageHeader = async (headerId: string) => {
  return apiClient.request(`/pages/teacher/headers/${headerId}`, {
    method: 'DELETE'
  });
};

export const createTeacherSubHeader = async (headerId: string, data: {
  title: string;
  content?: string;
  order: number;
  kind: string;
  audience: string;
  startAt?: string;
  endAt?: string;
  fileUrl?: string;
  fileName?: string;
}) => {
  return apiClient.request(`/pages/teacher/headers/${headerId}/subs`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
};

export const deleteTeacherSubHeader = async (headerId: string, subId: string) => {
  return apiClient.request(`/pages/teacher/headers/${headerId}/subs/${subId}`, {
    method: 'DELETE'
  });
};

// Get teacher-specific page structure for viewing (used by students)
export const getTeacherPageStructureForViewing = async (instructorId: string, subjectId?: string): Promise<PageStructure> => {
  if (!instructorId) {
    throw new Error('Instructor ID is required');
  }
  
  const params = new URLSearchParams();
  if (subjectId) params.append('subjectId', subjectId);
  
  // Use pageManagement route which has the authenticate middleware
  const response = await apiClient.request<PageStructure>(`/pages/teacher/${instructorId}/view?${params.toString()}`);
  return response;
};

// Reorder teacher headers
export const reorderTeacherHeaders = async (subjectId: string, headerIds: string[]): Promise<void> => {
  await apiClient.request(`/pages/teacher/subjects/${subjectId}/headers/reorder`, {
    method: 'PUT',
    body: JSON.stringify({ headerIds })
  });
};

// Reorder teacher sub-headers
export const reorderTeacherSubHeaders = async (headerId: string, subHeaderIds: string[]): Promise<void> => {
  await apiClient.request(`/pages/teacher/headers/${headerId}/subs/reorder`, {
    method: 'PUT',
    body: JSON.stringify({ subHeaderIds })
  });
};
