export type InternshipStatus = "open" | "locked";

export interface InternshipSubject {
  id: string;            
  title: string;
  description?: string;
  duration: string;
  registrationStartDate: string;
  registrationEndDate: string;
  maxStudents: number;      
  currentStudents: number;
  status: InternshipStatus;
  manager: {
    id: string;
    name: string;
    email: string;
  };   
  lecturers: Array<{
    id: string;
    name: string;
    email: string;
    managedStudents?: Array<{
      id: string;
      name: string;
      email: string;
    }>;
  }>;
  students: Array<{
    id: string;
    name: string;
    email: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInternshipSubjectDTO {
  title: string;
  description?: string;
  duration?: string;
  registrationStartDate?: string;
  registrationEndDate?: string;
  maxStudents: number;
  managerId: string;
}

export interface UpdateInternshipSubjectDTO {
  title?: string;
  description?: string;
  duration?: string;
  registrationStartDate?: string;
  registrationEndDate?: string;
  maxStudents?: number;
  managerId?: string;
  status?: InternshipStatus;
}
