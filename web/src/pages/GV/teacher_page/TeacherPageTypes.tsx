export type SubKind = "thuong" | "nop-file" | "van-ban" | "thong-bao" | "file";
export type Audience = "tat-ca" | "sinh-vien" | "giang-vien";

export interface SubHeader {
  id: string;
  _id?: string; // Backend MongoDB ID
  title: string;          // can be plain text or HTML (for "van-ban")
  content?: string;       // Rich content for thuong/van-ban types
  order: number;
  kind: SubKind;
  audience: Audience;
  startAt?: string;       // only for "nop-file"
  endAt?: string;         // only for "nop-file"
  fileUrl?: string;
  fileName?: string;
  isActive?: boolean;
}

export interface HeaderBlock {
  id: string;
  _id?: string; // Backend MongoDB ID
  title: string;
  order: number;
  audience: Audience;
  instructor?: {
    id: string;
    name: string;
  };
  subs: SubHeader[];
  isActive?: boolean;
}

// Teacher-specific page structure
export interface TeacherPageStructure {
  instructor: {
    id: string;
    name: string;
    email: string;
  };
  subject: {
    id: string;
    title: string;
    canManage: boolean;
  } | null;
  headers: HeaderBlock[];
}
