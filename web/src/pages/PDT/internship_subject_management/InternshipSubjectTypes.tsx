export type InternshipStatus = "open" | "locked";
export type RegistrationStatus = "not-started" | "open" | "ended" | "full";

export interface InternshipSubject {
  id: string;            
  title: string;
  description?: string;
  duration: string;
  registrationStartDate: string;
  registrationEndDate: string;
  maxStudents: number;      
  manager: {
    id: string;
    name: string;
    email: string;
  };   
  status: InternshipStatus;
  registrationStatus?: RegistrationStatus;
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
  currentStudents: number;
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
