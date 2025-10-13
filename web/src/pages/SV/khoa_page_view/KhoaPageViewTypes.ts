export type Audience = "tat-ca" | "sinh-vien" | "giang-vien";
export type SubKind = "thuong" | "thong-bao" | "nop-file" | "van-ban" | "file";

export interface SubHeader {
  _id?: string;
  id: string;
  title: string;
  content?: string;
  order: number;
  kind: SubKind;
  audience: Audience;
  startAt?: string;
  endAt?: string;
  fileUrl?: string;
  fileName?: string;
  isActive?: boolean;
}

export interface HeaderBlock {
  _id?: string;
  id: string;
  title: string;
  order: number;
  audience: Audience;
  isActive?: boolean;
  subs: SubHeader[];
}

export interface SubmittedFile {
  id: string;
  name: string;
  size: number;
  uploadedAt: string;
  status: "pending" | "approved" | "rejected";
}
