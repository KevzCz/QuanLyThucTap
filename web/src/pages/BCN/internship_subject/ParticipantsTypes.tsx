export type ParticipantRole = "giang-vien" | "sinh-vien";
export type ParticipantStatus =
  | "dang-huong-dan"
  | "chua-co-sinh-vien"
  | "duoc-huong-dan"
  | "chua-duoc-huong-dan"
  | "dang-lam-do-an"
  | "dang-thuc-tap";

export interface Participant {
  id: string;
  name: string;
  email: string;
  role: ParticipantRole;
  status: ParticipantStatus;
  advisorId?: string;
  advisorName?: string;
  managedStudents?: Array<{
    id: string;
    name: string;
    email: string;
  }>;
}

// Backend API types for participants
export interface InternshipSubjectDetail {
  id: string;
  title: string;
  maxStudents: number;
  manager: {
    id: string;
    name: string;
    email: string;
  };
  status: "open" | "locked";
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

export const roleLabel: Record<ParticipantRole, string> = {
  "giang-vien": "Giảng viên",
  "sinh-vien": "Sinh viên",
};

export const subjectDisplayName = (id: string) => id; // customize if needed

// Helper function to convert backend data to participant format
export const convertToParticipants = (subjectData: InternshipSubjectDetail): Participant[] => {
  const participants: Participant[] = [];

  // Add lecturers
  subjectData.lecturers.forEach(lecturer => {
    participants.push({
      id: lecturer.id,
      name: lecturer.name,
      email: lecturer.email,
      role: "giang-vien",
      status: lecturer.managedStudents && lecturer.managedStudents.length > 0 
        ? "dang-huong-dan" 
        : "chua-co-sinh-vien",
      managedStudents: lecturer.managedStudents
    });
  });

  // Add students
  subjectData.students.forEach(student => {
    // Find supervisor from lecturers
    const supervisor = subjectData.lecturers.find(lecturer => 
      lecturer.managedStudents?.some(managedStudent => managedStudent.id === student.id)
    );

    participants.push({
      id: student.id,
      name: student.name,
      email: student.email,
      role: "sinh-vien",
      status: supervisor ? "duoc-huong-dan" : "chua-duoc-huong-dan",
      advisorId: supervisor?.id,
      advisorName: supervisor?.name
    });
  });

  return participants;
};
