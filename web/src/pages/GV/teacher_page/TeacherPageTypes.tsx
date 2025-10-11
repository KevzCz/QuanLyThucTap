export type SubKind = "thuong" | "nop-file" | "van-ban" | "thong-bao";

export interface SubHeader {
  id: string;
  title: string;          // can be plain text or HTML (for "van-ban")
  order: number;
  kind: SubKind;
  startAt?: string;       // only for "nop-file"
  endAt?: string;         // only for "nop-file"
}

export interface HeaderBlock {
  id: string;
  title: string;
  order: number;
  subs: SubHeader[];
}
