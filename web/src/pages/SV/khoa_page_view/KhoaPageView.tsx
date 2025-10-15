import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type { HeaderBlock, SubHeader } from "./KhoaPageViewTypes";
import SearchInput from "../../../components/UI/SearchInput";
import ChevronButton from "../../../components/UI/ChevronButton";
import PageToolbar from "../../../components/UI/PageToolbar";
import { getPageStructure } from "../../../services/pageApi";
import { useAuth } from "../../../contexts/UseAuth";
import { apiClient } from "../../../utils/api";
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

const KhoaPageView: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [data, setData] = useState<HeaderBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Load available subjects and select the first one
  useEffect(() => {
    const loadAvailableSubjects = async () => {
      try {
        if (user?.role === "giang-vien") {
          const response = await apiClient.request<{ success: boolean; subjects: Array<{ id: string; title: string }> }>("/internship-subjects/teacher/available");
          
          if (response.subjects && response.subjects.length > 0) {
            setSubjectId(response.subjects[0].id);
          } else {
            setSubjectId("CNTT - TT2025");
          }
        } else {
          // For students, get their assigned instructor's subject
          const instructorResponse = await apiClient.getStudentAssignedInstructor();
          
          if (instructorResponse.subject?.id) {
            setSubjectId(instructorResponse.subject.id);
          } else {
            // No instructor assigned, try to get available subjects
            const response = await apiClient.request<{ success: boolean; subjects: Array<{ id: string; title: string }> }>("/internship-subjects/student/available");
            
            if (response.subjects && response.subjects.length > 0) {
              setSubjectId(response.subjects[0].id);
            } else {
              setSubjectId("CNTT - TT2025");
            }
          }
        }
      } catch (err) {
        console.error('Failed to load available subjects:', err);
        // Fallback to mock data
        setSubjectId("CNTT - TT2025");
      }
    };

    loadAvailableSubjects();
  }, [user?.role]);

  // Load page data when subjectId is available
  useEffect(() => {
    if (!subjectId) return;
    
    const loadPageData = async () => {
      try {
        setLoading(true);
        const audience = user?.role === "giang-vien" ? "giang-vien" : "sinh-vien";
        const response = await getPageStructure(subjectId, audience);
        
        // Transform backend data to frontend format
        const transformedHeaders = response.headers.map(header => ({
          ...header,
          id: header._id || header.id,
          subs: header.subs.map(sub => ({
            ...sub,
            id: sub._id || sub.id
          }))
        }));
        
        setData(transformedHeaders);
        
        // Auto-expand all headers initially
        const initialExpanded: Record<string, boolean> = {};
        transformedHeaders.forEach(h => {
          initialExpanded[h.id] = true;
        });
        setExpanded(initialExpanded);
        
        setError(null);
      } finally {
        setLoading(false);
      }
    };

    loadPageData();
  }, [subjectId, user?.role]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data.filter(h => h.audience === "tat-ca" || h.audience === "sinh-vien");
    return data
      .filter(h => h.audience === "tat-ca" || h.audience === "sinh-vien")
      .map((h) => ({ ...h, subs: h.subs.filter((s) => s.title.toLowerCase().includes(q) && (s.audience === "tat-ca" || s.audience === "sinh-vien")) }))
      .filter((h) => h.title.toLowerCase().includes(q) || h.subs.length > 0);
  }, [data, query]);

  const handleSubClick = (h: HeaderBlock, s: SubHeader) => {
    if (s.kind === "file" && s.fileUrl) {
      // Download file
      const link = document.createElement('a');
      link.href = s.fileUrl;
      link.download = s.fileName || s.title;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (s.kind === "nop-file") {
      navigate(`/docs-dept/sub/${encodeURIComponent(s.id)}/upload`, { state: { header: h, sub: s, subjectId } });
    } else if (s.kind !== "van-ban") {
      navigate(`/docs-dept/sub/${encodeURIComponent(s.id)}`, { state: { header: h, sub: s, subjectId } });
    }
  };

  const getBackPath = () => {
    return user?.role === "giang-vien" ? "/teacher-students" : "/dashboard";
  };

  if (loading || !subjectId) {
    return (
      <div className="space-y-4">
        <PageToolbar>
          <div className="flex items-center gap-3">
            <div className="w-[340px] h-9 bg-gray-200 rounded-md animate-pulse" />
            <div className="w-32 h-9 bg-gray-200 rounded-full animate-pulse" />
          </div>
        </PageToolbar>
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-8">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-gray-200 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <PageToolbar>
          <div className="flex items-center gap-3">
            <button 
              className="text-sm text-blue-600 hover:underline"
              onClick={() => navigate(getBackPath())}
            >
              ← Quay lại
            </button>
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder="Tìm kiếm nội dung"
              width="w-[340px]"
            />
            <span className="inline-flex items-center gap-2 rounded-full border px-3 h-9 text-sm text-gray-700">
              <span className="w-2 h-2 rounded-full bg-blue-500" /> {subjectId}
            </span>
          </div>
        </PageToolbar>
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-8 text-center">
          <div className="text-red-600 mb-2">⚠️</div>
          <p className="text-gray-600">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageToolbar>
        <div className="flex items-center gap-3">
          <button 
            className="text-sm text-blue-600 hover:underline"
            onClick={() => navigate(getBackPath())}
          >
            ← Quay lại
          </button>
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Tìm kiếm nội dung"
            width="w-[340px]"
          />
          <span className="inline-flex items-center gap-2 rounded-full border px-3 h-9 text-sm text-gray-700">
            <span className="w-2 h-2 rounded-full bg-blue-500" /> {subjectId}
          </span>
        </div>
      </PageToolbar>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {filtered.sort((a, b) => a.order - b.order).map((h) => {
          const open = !!expanded[h.id];
          return (
            <div key={h.id} className="border-b last:border-b-0">
              <div className="flex items-center gap-2 px-4 py-4 bg-gray-50">
                <ChevronButton open={open} onClick={() => setExpanded((m) => ({ ...m, [h.id]: !open }))} />
                <h3 className="text-lg font-bold flex-1">{h.title}</h3>
              </div>

              {open && (
                <div className="px-6 pb-4">
                  {h.subs
                    .filter(s => s.audience === "tat-ca" || s.audience === "sinh-vien")
                    .sort((a, b) => a.order - b.order)
                    .map((s) => (
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

                          {(s.kind === "van-ban" || s.kind === "thuong") ? (
                            <span className="text-gray-900 whitespace-pre-line">
                              {htmlToTextWithBreaks(s.content || s.title) || "(Nội dung trống)"}
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

export default KhoaPageView;
