export type SubKind = "thuong" | "nop-file" | "van-ban" | "thong-bao" | "file";

export interface SubHeader {
  id: string;
  title: string;
  order: number;
  kind: SubKind;
  startAt?: string;
  endAt?: string;
  fileUrl?: string;
  fileName?: string;
}

export interface HeaderBlock {
  id: string;
  title: string;
  order: number;
  subs: SubHeader[];
}

export interface SubmittedFile {
  id: string;
  name: string;
  size: number;
  uploadedAt: string;
  status: "pending" | "approved" | "rejected";
}
