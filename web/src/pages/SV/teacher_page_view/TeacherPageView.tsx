import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { HeaderBlock, SubHeader } from "./TeacherPageViewTypes";
import SearchInput from "../../../components/UI/SearchInput";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import SubjectPill from "../../../components/UI/SubjectPill";
import ChevronButton from "../../../components/UI/ChevronButton";
import PageToolbar from "../../../components/UI/PageToolbar";
import dayjs from "dayjs";
import { getTeacherPageStructureForViewing } from "../../../services/pageApi";
import { useAuth } from "../../../contexts/UseAuth";
import apiClient from "../../../utils/api";

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


const TeacherPageView: React.FC = () => {
  const navigate = useNavigate();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { user } = useAuth();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [instructorId, setInstructorId] = useState<string | null>(null);
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [data, setData] = useState<HeaderBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [teacherInfo, setTeacherInfo] = useState<{
    instructor: { id: string; name: string; email: string };
    subject: { id: string; title: string };
  } | null>(null);

  // Load student's assigned instructor and page data
  useEffect(() => {
    loadStudentTeacherPage();
  }, []);

  const loadStudentTeacherPage = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use the correct API method
      const studentResponse = await apiClient.getStudentAssignedInstructor();
      console.log('Student response:', studentResponse);
      
      if (!studentResponse.instructor) {
        setError("Bạn chưa được phân công giảng viên hướng dẫn");
        setTeacherInfo({
          instructor: { id: '', name: '', email: '' },
          subject: studentResponse.subject || { id: '', title: '' }
        });
        return;
      }

      setInstructorId(studentResponse.instructor.id);
      setSubjectId(studentResponse.subject?.id || null);
      setTeacherInfo({
        instructor: studentResponse.instructor,
        subject: studentResponse.subject || { id: '', title: '' }
      });

      // Then load the instructor's page structure
      try {
        const pageResponse = await getTeacherPageStructureForViewing(
          studentResponse.instructor.id,
          studentResponse.subject?.id
        );
        
        // Transform backend data to frontend format
        const transformedHeaders = pageResponse.headers.map(header => ({
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
      } catch (pageError) {
        console.error('Failed to load page structure:', pageError);
        // Continue with empty data instead of failing completely
        setData([]);
        setExpanded({});
      }
      
    } catch (err) {
      console.error('Failed to load teacher page:', err);
      setError('Không thể tải trang giảng viên: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

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

  const getBackPath = () => {
    return "/dashboard";
  };

  if (loading) {
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

  if (error || !teacherInfo) {
    return (
      <div className="space-y-4">
        <PageToolbar>
          <div className="flex items-center gap-3">
            <span className="text-lg font-semibold text-gray-900">Trang giảng viên</span>
          </div>
        </PageToolbar>
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-8 text-center">
          <div className="text-6xl mb-4">👨‍🏫</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Chưa có giảng viên hướng dẫn</h3>
          <p className="text-gray-600">{error || "Bạn chưa được phân công giảng viên hướng dẫn."}</p>
          <button 
            onClick={loadStudentTeacherPage} 
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
          {teacherInfo && teacherInfo.subject && (
            <span className="inline-flex items-center gap-2 rounded-full border px-3 h-9 text-sm text-gray-700">
              <span className="w-2 h-2 rounded-full bg-green-500" /> 
              {teacherInfo.subject.title} - {teacherInfo.instructor.name}
            </span>
          )}
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
                {/* Add instructor indicator */}
                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 text-green-700 px-2 py-1 text-xs font-medium">
                  👨‍🏫 {teacherInfo.instructor.name}
                </span>
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

export default TeacherPageView;
