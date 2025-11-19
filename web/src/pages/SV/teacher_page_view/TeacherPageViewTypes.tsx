export type SubKind = "thuong" | "nop-file" | "van-ban" | "thong-bao" | "file";

export interface Attachment {
  fileUrl: string;
  fileName: string;
  fileSize: number;
  uploadedAt: string;
}

export interface SubHeader {
  id: string;
  title: string;
  content?: string; // Add content property
  order: number;
  kind: SubKind;
  audience: "tat-ca" | "sinh-vien" | "giang-vien";
  startAt?: string;
  endAt?: string;
  fileUrl?: string;
  fileName?: string;
  attachments?: Attachment[]; // files that can be added to any subheader
}

export interface HeaderBlock {
  id: string;
  title: string;
  order: number;
  audience: "tat-ca" | "sinh-vien" | "giang-vien";
  instructor?: {
    id: string;
    name: string;
    email: string;
  };
  subs: SubHeader[];
}

export interface SubmittedFile {
  id: string;
  name: string;
  size: number;
  uploadedAt: string;
  status: "pending" | "approved" | "rejected";
  submitter?: {
    id: string;
    name: string;
  };
}

export const submissionStatusLabel: Record<SubmittedFile['status'], string> = {
  "pending": "Chờ duyệt",
  "approved": "Đã duyệt", 
  "rejected": "Từ chối",
};

// Add instructor context for teacher pages
export interface TeacherPageContext {
  instructor: {
    id: string;
    name: string;
    email: string;
  };
  subject: {
    id: string;
    title: string;
  } | null;
}
