export type ParticipantRole = "giang-vien" | "sinh-vien";
export type ParticipantStatus =
  | "dang-huong-dan"
  | "chua-co-sinh-vien"
  | "dang-thuc-tap"
  | "dang-lam-do-an"
  | "chua-co-giang-vien";

export interface Participant {
  id: string;
  name: string;
  role: ParticipantRole;
  status: ParticipantStatus;
  advisorId?: string;
  advisorName?: string;
}

export const roleLabel: Record<ParticipantRole, string> = {
  "giang-vien": "Giảng viên",
  "sinh-vien": "Sinh viên",
};

export const subjectDisplayName = (id: string) => id; // customize if needed
