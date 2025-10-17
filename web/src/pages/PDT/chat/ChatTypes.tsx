export type UserRole = "phong-dao-tao" | "ban-chu-nhiem" | "giang-vien" | "sinh-vien";

export interface ChatUser {
  id: string;
  name: string;
  role: UserRole;
  avatar?: string;
  isOnline: boolean;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  content: string;
  timestamp: string;
  type: "text" | "file" | "system";
  fileName?: string;
  fileUrl?: string;
}

export interface ChatRequest {
  id: string;
  fromUser: ChatUser;
  toUser?: ChatUser; // Made optional to match API
  message: string;
  subject?: string; // Added missing subject field
  timestamp: string;
  status: "pending" | "accepted" | "declined" | "expired" | "cancelled";
  // New fields for PDT binding system
  assignedTo?: ChatUser; // Which PDT member is handling this
  isAssigned?: boolean;   // Quick check if someone is handling it
}

export interface ChatConversation {
  id: string;
  participants: ChatUser[];
  lastMessage?: ChatMessage;
  updatedAt: string;
  unreadCount: number;
  isActive: boolean;
}

export const roleLabel: Record<UserRole, string> = {
  "phong-dao-tao": "Phòng Đào Tạo",
  "ban-chu-nhiem": "Ban Chủ Nhiệm",
  "giang-vien": "Giảng viên",
  "sinh-vien": "Sinh viên",
};

export const roleColor: Record<UserRole, string> = {
  "phong-dao-tao": "bg-blue-100 text-blue-800",
  "ban-chu-nhiem": "bg-cyan-100 text-cyan-800",
  "giang-vien": "bg-orange-100 text-orange-800",
  "sinh-vien": "bg-green-100 text-green-800",
};
