// pages/BCN/khoa_page/KhoaPageTypes.ts
export type Audience = "tat-ca" | "sinh-vien" | "giang-vien";

// + add "thong-bao"
export type SubKind  = "thuong" | "nop-file" | "van-ban" | "thong-bao";

export interface SubHeader {
  id: string;
  title: string;          // can be plain text or HTML (for "van-ban")
  order: number;
  kind: SubKind;
  audience: Audience;
  startAt?: string;       // only for "nop-file"
  endAt?: string;         // only for "nop-file"
}

export interface HeaderBlock {
  id: string;
  title: string;
  order: number;
  audience: Audience;
  subs: SubHeader[];
}
