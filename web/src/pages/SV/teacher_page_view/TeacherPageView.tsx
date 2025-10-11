import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { HeaderBlock, SubHeader } from "./TeacherPageViewTypes";
import dayjs from "dayjs";

const htmlToTextWithBreaks = (html: string) => {
  let s = html || "";
  s = s.replace(/<(br|BR)\s*\/?>/g, "\n")
       .replace(/<\/(p|div|li|h\d)>/g, "\n")
       .replace(/<li[^>]*>/g, "• ")
       .replace(/&nbsp;/g, " ");
  s = s.replace(/<[^>]+>/g, "");
  s = s.replace(/\r\n?/g, "\n");
  s = s.replace(/[ \t]+\n/g, "\n");
  return s.trim();
};

const MOCK: HeaderBlock[] = [
  {
    id: "h1",
    title: "Thông báo từ giảng viên",
    order: 1,
    subs: [
      { id: "s1", title: "Lịch học tuần này", order: 1, kind: "thong-bao" },
      { id: "s2", title: "Hướng dẫn làm bài.pdf", order: 2, kind: "file", fileUrl: "/files/huong-dan-lam-bai.pdf", fileName: "Hướng dẫn làm bài.pdf" },
    ],
  },
  {
    id: "h2",
    title: "Bài tập và nộp bài",
    order: 2,
    subs: [
      { id: "s3", title: "Nộp bài tập tuần 1", order: 1, kind: "nop-file", startAt: "2025-01-20T00:00", endAt: "2025-01-27T23:59" },
      { id: "s4", title: "Đề bài tập.docx", order: 2, kind: "file", fileUrl: "/files/de-bai-tap.docx", fileName: "Đề bài tập.docx" },
    ],
  },
];

const ChevronBtn: React.FC<{ open: boolean; onClick: () => void }> = ({ open, onClick }) => (
  <button onClick={onClick} className="h-7 w-7 grid place-items-center rounded-md hover:bg-gray-100">
    <svg viewBox="0 0 24 24" className={`h-4 w-4 transition ${open ? "rotate-90" : ""}`}>
      <path fill="currentColor" d="m10 17 5-5-5-5v10z" />
    </svg>
  </button>
);

const TeacherPageView: React.FC = () => {
  const navigate = useNavigate();
  const [subjectId] = useState("CNTT - TT2025");
  const [query, setQuery] = useState("");
  const [data] = useState<HeaderBlock[]>(MOCK);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ h1: true, h2: true });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data;
    return data
      .map((h) => ({ ...h, subs: h.subs.filter((s) => s.title.toLowerCase().includes(q)) }))
      .filter((h) => h.title.toLowerCase().includes(q) || h.subs.length > 0);
  }, [data, query]);

  const handleSubClick = (h: HeaderBlock, s: SubHeader) => {
    if (s.kind === "file" && s.fileUrl) {
      const link = document.createElement('a');
      link.href = s.fileUrl;
      link.download = s.fileName || s.title;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (s.kind === "nop-file") {
      navigate(`/docs-teacher/sub/${encodeURIComponent(s.id)}/upload`, { state: { header: h, sub: s, subjectId } });
    } else if (s.kind !== "van-ban") {
      navigate(`/docs-teacher/sub/${encodeURIComponent(s.id)}`, { state: { header: h, sub: s, subjectId } });
    }
  };

  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-200">
        <div className="mx-0 sm:mx-1 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-2 py-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <span className="absolute inset-y-0 left-3 flex items-center text-gray-400">
                <svg viewBox="0 0 24 24" className="h-4 w-4"><path fill="currentColor" d="M10 2a8 8 0 1 1-5.3 13.9l-3.4 3.4 1.4 1.4 3.4-3.4A8 8 0 0 1 10 2m0 2a6 6 0 1 0 0 12A6 6 0 0 0 10 4z"/></svg>
              </span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm kiếm nội dung"
                className="w-[340px] h-10 rounded-lg border border-gray-300 bg-white pl-8 pr-3 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <span className="inline-flex items-center gap-2 rounded-full border px-3 h-9 text-sm text-gray-700">
              <span className="w-2 h-2 rounded-full bg-blue-500" /> {subjectId}
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {filtered.sort((a, b) => a.order - b.order).map((h) => {
          const open = !!expanded[h.id];
          return (
            <div key={h.id} className="border-b last:border-b-0">
              <div className="flex items-center gap-2 px-4 py-4 bg-gray-50">
                <ChevronBtn open={open} onClick={() => setExpanded((m) => ({ ...m, [h.id]: !open }))} />
                <h3 className="text-lg font-bold flex-1">{h.title}</h3>
              </div>

              {open && (
                <div className="px-6 pb-4">
                  {h.subs.sort((a, b) => a.order - b.order).map((s) => (
                    <div key={s.id} className="flex items-center py-2.5">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {s.kind === "thong-bao" ? (
                          <span className="shrink-0 text-blue-600" title="Thông báo">🔔</span>
                        ) : s.kind === "nop-file" ? (
                          <span className="shrink-0 text-orange-600" title="Nộp file">📤</span>
                        ) : s.kind === "file" ? (
                          <span className="shrink-0 text-green-600" title="Tải file">📎</span>
                        ) : (
                          <span className="shrink-0 w-4 grid place-items-center text-gray-400" aria-hidden title="Mục">•</span>
                        )}

                        {s.kind === "van-ban" ? (
                          <span className="text-gray-900 whitespace-pre-line">
                            {htmlToTextWithBreaks(s.title) || "(Văn bản trống)"}
                          </span>
                        ) : (
                          <button
                            className="truncate text-left text-gray-900 hover:underline"
                            onClick={() => handleSubClick(h, s)}
                          >
                            {s.title}
                          </button>
                        )}
                      </div>

                      <div className="ml-4 flex items-center gap-3">
                        <span className="inline-flex rounded-full bg-gray-100 text-gray-700 px-2.5 py-0.5 text-xs font-medium">
                          {{
                            "thuong": "Thông tin",
                            "thong-bao": "Thông báo",
                            "nop-file": "Nộp file",
                            "van-ban": "Văn bản",
                            "file": "Tải file",
                          }[s.kind]}
                        </span>

                        {s.kind === "nop-file" && (
                          <span className="text-xs text-gray-500 whitespace-nowrap">
                            {s.startAt ? `${dayjs(s.startAt).format("DD/MM")}` : "?"} - {s.endAt ? `${dayjs(s.endAt).format("DD/MM")}` : "?"}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TeacherPageView;
