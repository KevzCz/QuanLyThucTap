export interface InternshipSubject {
  id: string;
  name: string;
  code: string;
  description: string;
  instructors: Array<{
    id: string;
    name: string;
    studentCount: number;
    maxStudents: number;
  }>;
  bcnManager: {
    id: string;
    name: string;
  };
  maxStudents: number;
  currentStudents: number;
  credits: number;
  duration: string; // e.g., "8 tuần"
  startDate: string;
  endDate: string;
  requirements: string[];
  status: "open" | "full" | "closed";
}

export interface StudentRegistration {
  studentId: string;
  subjectId: string;
  registeredAt: string;
}
