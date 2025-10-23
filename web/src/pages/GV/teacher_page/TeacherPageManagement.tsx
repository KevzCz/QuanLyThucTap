import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type { HeaderBlock, SubHeader, TeacherPageStructure } from "./TeacherPageTypes";
import ChevronButton from "../../../components/UI/ChevronButton";
import PageToolbar from "../../../components/UI/PageToolbar";
import CreateHeaderDialog from "../teacher_page/CreateHeaderDialog";
import EditHeaderDialog from "../teacher_page/EditHeaderDialog";
import CreateSubDialog from "../teacher_page/CreateSubDialog";
import EditSubDialog from "../teacher_page/EditSubDialog";
import ConfirmDeleteDialog from "../teacher_page/ConfirmDeleteDialog";
import dayjs from "dayjs";

// Add missing API functions
import { apiClient } from "../../../utils/api";
import { useToast } from "../../../components/UI/Toast";
import PageLayout from "../../../components/UI/PageLayout";

const htmlToTextWithBreaks = (html: string) => {
  let s = html || "";
  s = s.replace(/<(br|BR)\s*\/?>/g, "\n")
       .replace(/<\/(p|div|li|h\d)>/g, "\n")
       .replace(/<li[^>]*>/g, "• ")
       .replace(/&nbsp;/g, " ");
  s = s.replace(/<[^>]+>/g, "");      // strip tags
  s = s.replace(/\r\n?/g, "\n");      // normalise newlines
  s = s.replace(/[ \t]+\n/g, "\n");   // trim trailing spaces before \n
  return s.trim();
};


/* ---------- Small UI helpers ---------- */
const Tag: React.FC<React.PropsWithChildren<{ color?: string }>> = ({ children, color = "bg-gray-100 text-gray-700" }) => (
  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${color}`}>{children}</span>
);

const AudienceText = {
  "tat-ca": "Tất cả",
  "sinh-vien": "Sinh viên",
  "giang-vien": "Giảng viên",
} as const;

/* ---------- UI helpers ---------- */
const TeacherPageManagement: React.FC = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const [teacherData, setTeacherData] = useState<TeacherPageStructure | null>(null);
  const [query, setQuery] = useState("");
  const [data, setData] = useState<HeaderBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // dialogs
  const [openCreateHeader, setOpenCreateHeader] = useState(false);
  const [editHeader, setEditHeader] = useState<HeaderBlock | null>(null);
  const [createUnder, setCreateUnder] = useState<HeaderBlock | null>(null);
  const [editSub, setEditSub] = useState<{ headerId: string; sub: SubHeader } | null>(null);
  const [confirmDelHeader, setConfirmDelHeader] = useState<HeaderBlock | null>(null);
  const [confirmDelSub, setConfirmDelSub] = useState<{ header: HeaderBlock; sub: SubHeader } | null>(null);

  // drag-and-drop state
  const [draggedHeader, setDraggedHeader] = useState<string | null>(null);
  const [draggedSub, setDraggedSub] = useState<{ headerId: string; subId: string } | null>(null);
  const [dragOverHeader, setDragOverHeader] = useState<string | null>(null);
  const [dragOverSub, setDragOverSub] = useState<{ headerId: string; subId: string } | null>(null);

  // Load teacher's managed subject and page data
  useEffect(() => {
    loadTeacherPageData();
  }, []);

  // Clear drag states when component unmounts or on global end/cancel
  useEffect(() => {
    const clearAll = () => {
      setDraggedHeader(null);
      setDraggedSub(null);
      setDragOverHeader(null);
      setDragOverSub(null);
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') clearAll();
    };

    window.addEventListener('dragend', clearAll);
    window.addEventListener('drop', clearAll);
    window.addEventListener('mouseup', clearAll);
    window.addEventListener('keydown', onKey);

    return () => {
      window.removeEventListener('dragend', clearAll);
      window.removeEventListener('drop', clearAll);
      window.removeEventListener('mouseup', clearAll);
      window.removeEventListener('keydown', onKey);
      clearAll();
    };
  }, []);


  const loadTeacherPageData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use the correct API route from pages.js
      const response = await apiClient.request('/pages/teacher/managed') as TeacherPageStructure;
      
      if (!response.subject) {
        setError("Bạn chưa được phân công hướng dẫn môn thực tập nào");
        setTeacherData(response);
        setData([]);
        return;
      }

      // Transform the response to match expected types
      const transformedResponse: TeacherPageStructure = {
        ...response,
        headers: response.headers.map(header => ({
          ...header,
          id: header._id || header.id,
          audience: header.audience as "tat-ca" | "sinh-vien" | "giang-vien",
          subs: header.subs.map(sub => ({
            ...sub,
            id: sub._id || sub.id,
            audience: sub.audience as "tat-ca" | "sinh-vien" | "giang-vien",
            kind: sub.kind as "thuong" | "thong-bao" | "nop-file" | "van-ban" | "file"
          }))
        }))
      };
      setTeacherData(transformedResponse);
      setData(transformedResponse.headers);
      
      // Auto-expand all headers initially
      const initialExpanded: Record<string, boolean> = {};
      response.headers.forEach(h => {
        initialExpanded[h._id || h.id] = true;
      });
      setExpanded(initialExpanded);
      
    } catch (err) {
      console.error('Failed to load teacher page data:', err);
      setError('Không thể tải dữ liệu trang giảng viên');
    } finally {
      setLoading(false);
    }
  };

  // filter
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data;
    return data
      .map((h) => ({ ...h, subs: h.subs.filter((s) => s.title.toLowerCase().includes(q)) }))
      .filter((h) => h.title.toLowerCase().includes(q) || h.subs.length > 0);
  }, [data, query]);

  // CRUD: headers - Updated for teacher context
  const addHeader = async (h: Omit<HeaderBlock, 'id' | 'subs' | 'order'>) => {
    if (!teacherData?.subject) return;
    
    try {
      // Use the correct API route from pages.js
      const response = await apiClient.request(`/pages/teacher/subjects/${teacherData.subject.id}/headers`, {
        method: 'POST',
        body: JSON.stringify({
          title: h.title,
          order: 1, // Server will auto-adjust if needed
          audience: h.audience
        })
      }) as { header: HeaderBlock };
      
      const newHeader = response.header;
      const transformedHeader = {
        ...newHeader,
        id: newHeader._id || newHeader.id,
        instructor: teacherData.instructor,
        subs: [],
        audience: newHeader.audience as "tat-ca" | "sinh-vien" | "giang-vien"
      };
      
      setData(prev => [...prev, transformedHeader].sort((a, b) => a.order - b.order));
      setExpanded(prev => ({ ...prev, [transformedHeader.id]: true }));
      showSuccess("Tạo header thành công", `Header "${h.title}" đã được tạo`);
    } catch (err) {
      console.error('Failed to create header:', err);
      showError("Không thể tạo header", "Vui lòng thử lại sau");
    }
  };

  const saveHeader = async (h: HeaderBlock) => {
    try {
      await apiClient.request(`/pages/teacher/headers/${h._id || h.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: h.title,
          order: h.order,
          audience: h.audience
        })
      });
      
      setData(prev => prev.map(x => x.id === h.id ? h : x).sort((a, b) => a.order - b.order));
      showSuccess("Cập nhật header thành công");
    } catch (err) {
      console.error('Failed to update header:', err);
      showError("Không thể cập nhật header", "Vui lòng thử lại sau");
    }
  };

  const removeHeader = async (id: string) => {
    try {
      const header = data.find(h => h.id === id);
      if (header) {
        await apiClient.request(`/pages/teacher/headers/${header._id || header.id}`, {
          method: 'DELETE'
        });
        setData(prev => prev.filter(x => x.id !== id));
        showSuccess('Đã xóa header thành công');
      }
    } catch (err) {
      console.error('Failed to delete header:', err);
      showError('Không thể xóa header');
    }
  };

  // CRUD: subs - Updated for teacher context
  // CRUD: subs - Updated for teacher context
  const addSub = async (headerId: string, sub: Omit<SubHeader, 'id' | 'order'>) => {
    try {
      const header = data.find(h => h.id === headerId);
      if (!header) return;

      const maxOrder = header.subs.length > 0 ? Math.max(...header.subs.map(s => s.order)) : 0;
      const nextOrder = maxOrder + 1;

      // Call API
      const raw = await apiClient.request<{ success?: boolean; subHeader?: SubHeader; id?: string; _id?: string; title?: string; content?: string; order?: number; kind?: string; audience?: string; startAt?: string; endAt?: string; fileUrl?: string; fileName?: string }>(`/pages/teacher/headers/${header._id || header.id}/subs`, {
        method: 'POST',
        body: JSON.stringify({
          title: sub.title,
          content: sub.content,
          order: nextOrder,
          kind: sub.kind,
          audience: sub.audience,
          startAt: sub.startAt,
          endAt: sub.endAt,
          fileUrl: sub.fileUrl,
          fileName: sub.fileName
        })
      });

      // Support both server payloads:
      //  1) { success, subHeader: {...} }
      //  2) { success, ...subFields, id: ... }
      const created = raw?.subHeader ?? raw;

      const transformedSub: SubHeader = {
        ...created,
        id: created._id || created.id || crypto.randomUUID(),
        title: created.title || sub.title,
        audience: (created.audience ?? sub.audience) as "tat-ca" | "sinh-vien" | "giang-vien",
        kind: (created.kind ?? sub.kind) as "thuong" | "thong-bao" | "nop-file" | "van-ban" | "file",
        order: created.order ?? nextOrder
      };

      setData(prev =>
        prev.map(h =>
          h.id === headerId
            ? { ...h, subs: [...h.subs, transformedSub].sort((a, b) => a.order - b.order) }
            : h
        )
      );
      showSuccess('Đã tạo sub-header thành công');
    } catch (err) {
      console.error('Failed to create sub-header:', err);
      showError('Không thể tạo sub-header');
    }
  };

  const saveSub = (headerId: string, sub: SubHeader) =>
    setData((prev) => prev.map((h) => (h.id === headerId ? { ...h, subs: h.subs.map((s) => (s.id === sub.id ? sub : s)).sort((a, b) => a.order - b.order) } : h)));
  const removeSub = async (headerId: string, subId: string) => {
    try {
      // Use the MongoDB _id if available, otherwise use the frontend id
      const sub = data.find(h => h.id === headerId)?.subs.find(s => s.id === subId);
      const subMongoId = sub?._id || subId;
      
      await apiClient.deleteTeacherSubHeader(subMongoId);
      setData(prev => prev.map((h) => (h.id === headerId ? { ...h, subs: h.subs.filter((s) => s.id !== subId) } : h)));
      showSuccess('Đã xóa sub-header thành công');
    } catch (err) {
      console.error('Failed to delete sub-header:', err);
      showError('Không thể xóa sub-header');
    }
  };

  const gotoSub = (h: HeaderBlock, s: SubHeader) => {
    const base = `/teacher-page/sub/${encodeURIComponent(s.id)}`;
    const path = s.kind === "nop-file" ? `${base}/upload` : base;
    navigate(path, { state: { header: h, sub: s, subjectId: teacherData?.subject?.id } });
  };

  // Enhanced drag and drop handlers for headers
  const handleHeaderDragStart = (e: React.DragEvent, headerId: string) => {
    setDraggedHeader(headerId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', '');
    
    const dragElement = e.currentTarget as HTMLElement;
    const rect = dragElement.getBoundingClientRect();
    e.dataTransfer.setDragImage(dragElement, rect.width / 2, rect.height / 2);
  };

  const handleHeaderDragEnd = () => {
    setDraggedHeader(null);
    setDragOverHeader(null);
  };

  const handleHeaderDragOver = (e: React.DragEvent, headerId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    // Only handle header drag over if we're dragging a header (not a sub)
    if (draggedHeader && draggedHeader !== headerId && !draggedSub) {
      setDragOverHeader(headerId);
    }
  };

  const handleHeaderDragLeave = (e: React.DragEvent) => {
    // Only clear if we're leaving the element, not entering a child
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverHeader(null);
    }
  };

  const handleHeaderDrop = async (e: React.DragEvent, targetHeaderId: string) => {
    e.preventDefault();
    setDragOverHeader(null);
    
    if (!draggedHeader || draggedHeader === targetHeaderId || !teacherData?.subject || draggedSub) return;

    try {
      const newData = [...data];
      const draggedIndex = newData.findIndex(h => h.id === draggedHeader);
      const targetIndex = newData.findIndex(h => h.id === targetHeaderId);
      
      if (draggedIndex === -1 || targetIndex === -1) return;

      const [draggedItem] = newData.splice(draggedIndex, 1);
      newData.splice(targetIndex, 0, draggedItem);

      newData.forEach((header, index) => {
        header.order = index + 1;
      });

      setData(newData);

      // Create a simple reorder endpoint call
      const headerIds = newData.map(h => h._id || h.id);
      await apiClient.reorderTeacherHeaders(teacherData.subject.id, headerIds);
      showSuccess('Đã thay đổi thứ tự header thành công');
    } catch (err) {
      console.error('Failed to reorder headers:', err);
      showError('Không thể thay đổi thứ tự header');
      await loadTeacherPageData();
    } finally {
      setDraggedHeader(null);
    }
  };

  // Enhanced drag and drop handlers for sub-headers
  const handleSubDragStart = (e: React.DragEvent, headerId: string, subId: string) => {
    e.stopPropagation(); // Prevent header drag from triggering
    setDraggedSub({ headerId, subId });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', '');
  };

  const handleSubDragEnd = (e: React.DragEvent) => {
    e.stopPropagation();
    setDraggedSub(null);
    setDragOverSub(null);
  };

  const handleSubDragOver = (e: React.DragEvent, headerId: string, subId: string) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    
    // Only handle sub drag over if we're dragging a sub within the same header
    if (draggedSub && 
        draggedSub.headerId === headerId && 
        draggedSub.subId !== subId &&
        !draggedHeader) {
      setDragOverSub({ headerId, subId });
    }
  };

  const handleSubDragLeave = (e: React.DragEvent) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverSub(null);
    }
  };

  const handleSubDrop = async (e: React.DragEvent, targetHeaderId: string, targetSubId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverSub(null);
    
    if (!draggedSub || !teacherData?.subject || draggedHeader) return;
    
    const { headerId: sourceHeaderId, subId: sourceSubId } = draggedSub;
    
    if (sourceHeaderId !== targetHeaderId || sourceSubId === targetSubId) {
      setDraggedSub(null);
      return;
    }

    try {
      const newData = [...data];
      const headerIndex = newData.findIndex(h => h.id === sourceHeaderId);
      
      if (headerIndex === -1) return;

      const header = newData[headerIndex];
      const sourceSubs = [...header.subs];
      const draggedIndex = sourceSubs.findIndex(s => s.id === sourceSubId);
      const targetIndex = sourceSubs.findIndex(s => s.id === targetSubId);
      
      if (draggedIndex === -1 || targetIndex === -1) return;

      const [draggedItem] = sourceSubs.splice(draggedIndex, 1);
      sourceSubs.splice(targetIndex, 0, draggedItem);

      sourceSubs.forEach((sub, index) => {
        sub.order = index + 1;
      });

      newData[headerIndex] = { ...header, subs: sourceSubs };
      setData(newData);

      // Create a simple reorder endpoint call
      const subHeaderIds = sourceSubs.map(s => s._id || s.id);
      await apiClient.reorderTeacherSubHeaders(header._id || header.id, subHeaderIds);
      showSuccess('Đã thay đổi thứ tự sub-header thành công');
    } catch (err) {
      console.error('Failed to reorder sub-headers:', err);
      showError('Không thể thay đổi thứ tự sub-header');
      await loadTeacherPageData();
    } finally {
      setDraggedSub(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <PageToolbar>
          <div className="flex items-center gap-3">
            <div className="w-[340px] h-9 bg-gray-200 rounded-md animate-pulse" />
            <div className="w-32 h-9 bg-gray-200 rounded-full animate-pulse" />
          </div>
          <div className="w-24 h-9 bg-gray-200 rounded-md animate-pulse" />
        </PageToolbar>
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-8">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => (
              <div key={`loading-${i}`} className="h-16 bg-gray-200 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !teacherData?.subject) {
    return (
      <div className="space-y-4">
        <PageToolbar>
          <div className="flex items-center gap-3">
            <span className="text-lg font-semibold text-gray-900">Trang giảng viên</span>
          </div>
        </PageToolbar>
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-8 text-center">
          <div className="text-6xl mb-4">👨‍🏫</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {error || "Chưa có môn hướng dẫn"}
          </h3>
          <p className="text-gray-600">
            {error || "Bạn chưa được phân công hướng dẫn môn thực tập nào."}
          </p>
          <button
            onClick={loadTeacherPageData}
            className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <PageLayout
      title="Quản lý trang giảng viên"
      loading={loading}
      error={error || undefined}
      onRetry={loadTeacherPageData}
      searchValue={query}
      onSearchChange={setQuery}
      searchPlaceholder="Tìm kiếm header / sub-header"
      statusPill={teacherData?.subject ? {
        label: `${teacherData.subject.title} - ${teacherData.instructor.name}`,
        color: 'green'
      } : undefined}
      primaryAction={{
        label: "Tạo header",
        onClick: () => setOpenCreateHeader(true),
        icon: <span>➕</span>
      }}
    >
      {/* Content */}
      {[...filtered].sort((a, b) => a.order - b.order).map((h) => {
        const open = !!expanded[h.id];
        const isHeaderBeingDragged = draggedHeader === h.id;
        const isHeaderDragTarget = dragOverHeader === h.id && draggedHeader && !draggedSub;
        
        return (
          <div
            key={h._id || h.id}
            className={`border-b last:border-b-0 transition-all duration-200 ${
              isHeaderBeingDragged ? 'opacity-40 scale-95 rotate-1 shadow-lg' : ''
            } ${
              isHeaderDragTarget ? 'ring-2 ring-blue-500 ring-opacity-50 bg-blue-50' : ''
            }`}
            draggable={!draggedSub}
            onDragStart={(e) => !draggedSub && handleHeaderDragStart(e, h.id)}
            onDragEnd={handleHeaderDragEnd}
            onDragOver={(e) => handleHeaderDragOver(e, h.id)}
            onDragLeave={handleHeaderDragLeave}
            onDrop={(e) => handleHeaderDrop(e, h.id)}
          >

            <div className="flex items-center gap-2 px-4 py-4 bg-gray-50">
              {/* Enhanced drag handle */}
              <div 
                className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-200 transition-colors" 
                title="Kéo để sắp xếp lại thứ tự"
              >
                <span>⋮⋮</span>
              </div>
              
              <ChevronButton open={open} onClick={() => setExpanded((m) => ({ ...m, [h.id]: !open }))} />
              <h3 className="text-lg font-bold flex-1">{h.title}</h3>
              <Tag>{AudienceText[h.audience]}</Tag>
              
              {/* Order indicator */}
              <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded-full font-mono">
                #{h.order}
              </span>
              
              <button className="ml-2 h-8 w-8 grid place-items-center rounded-md bg-emerald-600 text-white hover:bg-emerald-700 transition-colors" title="Sửa header" onClick={() => setEditHeader(h)}>
                <span>✏️</span>
              </button>
              <button className="h-8 w-8 grid place-items-center rounded-md bg-cyan-600 text-white hover:bg-cyan-700 transition-colors" title="Thêm sub-header" onClick={() => setCreateUnder(h)}>
                <span>➕</span>
              </button>
              <button
                className="h-8 w-8 grid place-items-center rounded-md bg-rose-600 text-white hover:bg-rose-700 transition-colors"
                title="Xóa header"
                onClick={() => setConfirmDelHeader(h)}
              >
                <span>🗑️</span>
              </button>
            </div>

            {open && (
              <div className="px-6 pb-4 space-y-2">
                {/* Sub-headers with unified icons */}
                {[...h.subs].sort((a, b) => a.order - b.order).map((s, sIdx) => {
                   const subKey = s._id || s.id || `s-${sIdx}`;
                  const isSubBeingDragged = draggedSub?.subId === s.id;
                  const isSubDragTarget = dragOverSub?.subId === s.id && 
                                          dragOverSub?.headerId === h.id && 
                                          draggedSub && 
                                          !draggedHeader;
                  
                  return (
                    <div key={subKey} className={`flex items-center py-3 px-3 rounded-lg transition-all duration-200 ${
                          isSubBeingDragged ? 'opacity-40 scale-95 shadow-lg bg-gray-100' : 'hover:bg-gray-50'
                        } ${
                          isSubDragTarget ? 'ring-2 ring-blue-500 ring-opacity-50 bg-blue-50' : ''
                        }`}
                        draggable={!draggedHeader}
                        onDragStart={(e) => !draggedHeader && handleSubDragStart(e, h.id, s.id)}
                        onDragEnd={handleSubDragEnd}
                        onDragOver={(e) => handleSubDragOver(e, h.id, s.id)}
                        onDragLeave={handleSubDragLeave}
                        onDrop={(e) => handleSubDrop(e, h.id, s.id)}
                      >
                      {/* Drag handle */}
                      <div className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-200 transition-colors mr-2">
                        <span>⋮⋮</span>
                      </div>
                      
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {/* Unified content type icons */}
                        {s.kind === "thong-bao" ? (
                          <span className="shrink-0 text-blue-600" title="Thông báo">🔔</span>
                        ) : s.kind === "nop-file" ? (
                          <span className="shrink-0 text-orange-600" title="Nộp file">📤</span>
                        ) : s.kind === "file" ? (
                          <span className="shrink-0 text-green-600" title="File tải xuống">📎</span>
                        ) : (
                          <span className="shrink-0 w-4 grid place-items-center text-gray-400" aria-hidden title="Mục">•</span>
                        )}

                        {/* label */}
                        {(s.kind === "van-ban" || s.kind === "thuong") ? (
                          <span className="text-gray-900 whitespace-pre-line">
                            {htmlToTextWithBreaks(s.content || s.title) || "(Nội dung trống)"}
                          </span>
                        ) : (
                          <button
                            className="truncate text-left text-gray-900 hover:underline"
                            onClick={() => gotoSub(h, s)}
                          >
                            {s.title}
                          </button>
                        )}
                      </div>

                      {/* Actions with unified icons */}
                      <div className="ml-4 flex items-center gap-3 shrink-0">
                        {/* Order indicator */}
                        <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded-full font-mono">
                          #{s.order}
                        </span>
                        
                        <span className="inline-flex rounded-full bg-gray-100 text-gray-700 px-2.5 py-0.5 text-xs font-medium">
                          {{
                            "thuong": "Thường",
                            "thong-bao": "Thông báo",
                            "nop-file": "Nộp file",
                            "van-ban": "Văn bản",
                            "file": "File tải xuống",
                          }[s.kind]}
                        </span>

                        {s.kind === "nop-file" && (
                          <span className="text-xs text-gray-500 whitespace-nowrap">
                            {s.startAt ? `${dayjs(s.startAt).format("DD/MM")}` : "?"} - {s.endAt ? `${dayjs(s.endAt).format("DD/MM")}` : "?"}
                          </span>
                        )}

                        <button
                          className="h-7 w-7 grid place-items-center rounded-md bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                          title="Sửa sub-header"
                          onClick={() => setEditSub({ headerId: h.id, sub: s })}
                        >
                          <span>✏️</span>
                        </button>
                        <button
                          className="h-7 w-7 grid place-items-center rounded-md bg-rose-600 text-white hover:bg-rose-700 transition-colors"
                          title="Xóa"
                          onClick={() => setConfirmDelSub({ header: h, sub: s })}
                        >
                          <span>🗑️</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Dialogs */}
      <CreateHeaderDialog open={openCreateHeader} onClose={() => setOpenCreateHeader(false)} onCreate={(h) => { addHeader(h); setOpenCreateHeader(false); }} />
      <EditHeaderDialog open={!!editHeader} header={editHeader ?? undefined} onClose={() => setEditHeader(null)} onSave={(h) => { saveHeader(h); setEditHeader(null); }} onDelete={(id) => { removeHeader(id); setEditHeader(null); }} />
      <CreateSubDialog open={!!createUnder} header={createUnder ?? undefined} onClose={() => setCreateUnder(null)} onCreate={(hid, s) => { addSub(hid, s); setCreateUnder(null); }} />
      <EditSubDialog open={!!editSub} headerId={editSub?.headerId} sub={editSub?.sub} onClose={() => setEditSub(null)} onSave={(hid, s) => { saveSub(hid, s); setEditSub(null); }} onDelete={(hid, sid) => { removeSub(hid, sid); setEditSub(null); }} />
      <ConfirmDeleteDialog
        open={!!confirmDelHeader}
        title="Xóa header"
        message={`Xóa header "${confirmDelHeader?.title}" và tất cả sub-header bên trong?`}
        onCancel={() => setConfirmDelHeader(null)}
        onConfirm={() => {
          if (confirmDelHeader) removeHeader(confirmDelHeader.id);
          setConfirmDelHeader(null);
        }}
      />
      <ConfirmDeleteDialog
        open={!!confirmDelSub}
        title="Xóa sub-header"
        message={`Xóa sub-header "${confirmDelSub?.sub.title}"?`}
        onCancel={() => setConfirmDelSub(null)}
        onConfirm={() => {
          if (confirmDelSub) removeSub(confirmDelSub.header.id, confirmDelSub.sub.id);
          setConfirmDelSub(null);
        }}
      />
    </PageLayout>
  );
};

export default TeacherPageManagement;
