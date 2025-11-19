export type Audience = "tat-ca" | "sinh-vien" | "giang-vien";
export type SubKind = "thuong" | "nop-file" | "van-ban" | "thong-bao" | "file";

export interface Attachment {
  fileUrl: string;
  fileName: string;
  fileSize: number;
  uploadedAt: string;
}

export interface SubHeader {
  id: string;
  _id?: string; // Backend ID field
  title: string;
  content?: string; // Content field for rich text
  order: number;
  kind: SubKind;
  audience: Audience;
  startAt?: string;
  endAt?: string;
  fileUrl?: string; // for file downloads
  fileName?: string; // display name for files
  attachments?: Attachment[]; // files that can be added to any subheader
}

export interface HeaderBlock {
  id: string;
  _id?: string; // Backend ID field
  title: string;
  order: number;
  audience: Audience;
  subs: SubHeader[];
}

export interface SubmittedFile {
  id: string;
  name: string;
  size: number;
  uploadedAt: string;
  status: "pending" | "approved" | "rejected";
}
