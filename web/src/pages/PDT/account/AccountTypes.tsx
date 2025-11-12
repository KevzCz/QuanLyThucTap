export type Role = "phong-dao-tao" | "ban-chu-nhiem" | "giang-vien" | "sinh-vien";
export type Status = "open" | "locked";

export interface Account {
  id: string;
  name: string;
  email?: string;
  role: Role;
  status: Status;
  khoa?: string;
  year?: number;
  maxStudents?: number; // Calculated dynamically for GV
  currentStudentCount?: number; // For GV
}

export interface CreateAccountDTO {
  name: string;
  email: string;
  role: Role;
  status: Status;
  password: string;
  khoa?: string;
  year?: number;
}

export interface UpdateAccountDTO {
  name: string;
  email: string;
  role: Role;
  status: Status;
  password?: string;
  khoa?: string;
  year?: number;
}

export const roleLabel: Record<Role, string> = {
  "phong-dao-tao": "Phòng Đào Tạo",
  "ban-chu-nhiem": "Ban chủ nhiệm",
  "giang-vien": "Giảng viên",
  "sinh-vien": "Sinh viên",
};

export const statusLabel: Record<Status, string> = {
  "open": "Hoạt động",
  "locked": "Đã khóa",
};
