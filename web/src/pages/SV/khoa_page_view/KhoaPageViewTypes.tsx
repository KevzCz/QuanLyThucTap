export type Audience = "tat-ca" | "sinh-vien" | "giang-vien";
export type SubKind = "thuong" | "nop-file" | "van-ban" | "thong-bao" | "file";

export interface SubHeader {
  id: string;
  title: string;
  order: number;
  kind: SubKind;
  audience: Audience;
  startAt?: string;
  endAt?: string;
  fileUrl?: string; // for file downloads
  fileName?: string; // display name for files
}

export interface HeaderBlock {
  id: string;
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
