export type InternshipStatus = "open" | "locked";

export interface InternshipSubject {
  id: string;            
  title: string;            
  maxStudents: number;      
  departmentLead: string;   
  status: InternshipStatus;
}
