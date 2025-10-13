export type Role = "phong-dao-tao" | "ban-chu-nhiem" | "giang-vien" | "sinh-vien";
export type Status = "open" | "locked";

export interface Account {
  id: string;
  name: string;
  email?: string;
  role: Role;
  status: Status;
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
