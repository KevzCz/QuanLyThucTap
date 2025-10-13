export interface InternshipSubject {
  id: string;
  title: string;
  description?: string;
  requirements?: string[];
  credits?: number;
  duration?: string;
  startDate?: string;
  endDate?: string;
  registrationStartDate?: string;
  registrationEndDate?: string;
  maxStudents: number;
  currentStudents: number;
  manager: {
    id: string;
    name: string;
    email: string;
  };
  status: "open" | "locked";
  registrationStatus?: "not-started" | "open" | "full" | "ended";
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
  
  // Legacy fields for backward compatibility
  name?: string;
  code?: string;
  instructors?: Array<{
    id: string;
    name: string;
    studentCount: number;
    maxStudents: number;
  }>;
  bcnManager?: {
    id: string;
    name: string;
  };
}

export interface TeacherRegistration {
  teacherId: string;
  subjectId: string;
  registeredAt: string;
}
