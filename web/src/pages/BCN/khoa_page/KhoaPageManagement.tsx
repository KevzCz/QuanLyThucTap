import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type { HeaderBlock, SubHeader } from "./KhoaPageTypes";
import ChevronButton from "../../../components/UI/ChevronButton";
import CreateHeaderDialog from "./CreateHeaderDialog";
import EditHeaderDialog from "./EditHeaderDialog";
import CreateSubDialog from "./CreateSubDialog";
import EditSubDialog from "./EditSubDialog";
import ConfirmDeleteDialog from "./ConfirmDeleteDialog";
import { 
  getPageStructure, 
  createPageHeader, 
  updatePageHeader, 
  deletePageHeader,
  createSubHeader,
  updateSubHeader,
  deleteSubHeader,
  reorderHeaders,
  reorderSubHeaders
} from "../../../services/pageApi";
import { apiClient } from "../../../utils/api";
import dayjs from "dayjs";
import { useToast } from "../../../components/UI/Toast";
import PageLayout from "../../../components/UI/PageLayout";
import { useDebounce } from "../../../hooks/useDebounce";
import EmptyState from "../../../components/UI/EmptyState";

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

/* ---------- Page ---------- */
const KhoaPageManagement: React.FC = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const [subject, setSubject] = useState<{ id: string; title: string } | null>(null);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);
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

  // Load BCN managed subject and page data
  useEffect(() => {
    loadManagedSubject();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadManagedSubject = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // First get the BCN's managed subject
      const response = await apiClient.getBCNManagedSubject();
      
      if (!response.subject) {
        setError("Bạn chưa được phân công quản lý môn thực tập nào");
        setSubject(null);
        setData([]);
        return;
      }

      setSubject({
        id: response.subject.id,
        title: response.subject.title
      });

      // Then load page structure for that subject
      await loadPageData(response.subject.id);
      
    } catch (err) {
      console.error('Failed to load managed subject:', err);
      setError('Không thể tải thông tin môn thực tập được quản lý');
      setSubject(null);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const loadPageData = async (subjectId: string) => {
    try {
      const response = await getPageStructure(subjectId);
      
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
      
    } catch (err) {
      console.error('Failed to load page data:', err);
      throw err; // Re-throw to be handled by parent
    }
  };

  // filter
  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    if (!q) return data;
    return data
      .map((h) => ({ ...h, subs: h.subs.filter((s) => s.title.toLowerCase().includes(q)) }))
      .filter((h) => h.title.toLowerCase().includes(q) || h.subs.length > 0);
  }, [data, debouncedQuery]);

  // CRUD: headers
  const addHeader = async (h: Omit<HeaderBlock, 'id' | 'subs' | 'order'>) => {
    if (!subject) return;
    
    try {
      // Auto-calculate next order
      const maxOrder = data.length > 0 ? Math.max(...data.map(header => header.order)) : 0;
      const nextOrder = maxOrder + 1;
      
      const newHeader = await createPageHeader(subject.id, {
        title: h.title,
        order: nextOrder,
        audience: h.audience
      });
      
      const transformedHeader = {
        ...newHeader,
        id: newHeader._id || newHeader.id,
        subs: []
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
      await updatePageHeader(h._id || h.id, {
        title: h.title,
        order: h.order,
        audience: h.audience
      });
      
      setData(prev => prev.map(x => x.id === h.id ? h : x).sort((a, b) => a.order - b.order));
      showSuccess('Đã cập nhật header thành công');
    } catch (err) {
      console.error('Failed to update header:', err);
      showError('Không thể cập nhật header');
    }
  };

  const removeHeader = async (id: string) => {
    try {
      const header = data.find(h => h.id === id);
      if (header) {
        await deletePageHeader(header._id || header.id);
        setData(prev => prev.filter(x => x.id !== id));
        showSuccess('Đã xóa header thành công');
      }
    } catch (err) {
      console.error('Failed to delete header:', err);
      showError('Không thể xóa header');
    }
  };

  // CRUD: subs
  const addSub = async (headerId: string, sub: Omit<SubHeader, 'id' | 'order'>) => {
    try {
      const header = data.find(h => h.id === headerId);
      if (!header) return;
      
      // Auto-calculate next order within this header
      const maxOrder = header.subs.length > 0 ? Math.max(...header.subs.map(s => s.order)) : 0;
      const nextOrder = maxOrder + 1;
      
      const newSub = await createSubHeader(header._id || header.id, {
        title: sub.title,
        content: sub.content,
        order: nextOrder,
        kind: sub.kind,
        audience: sub.audience,
        startAt: sub.startAt,
        endAt: sub.endAt,
        fileUrl: sub.fileUrl,
        fileName: sub.fileName
      });
      
      const transformedSub = {
        ...newSub,
        id: newSub._id || newSub.id
      };
      
      setData(prev => prev.map(h => 
        h.id === headerId ? 
        { ...h, subs: [...h.subs, transformedSub].sort((a, b) => a.order - b.order) } : 
        h
      ));
      showSuccess('Đã tạo sub-header thành công');
    } catch (err) {
      console.error('Failed to create sub-header:', err);
      showError('Không thể tạo sub-header');
    }
  };

  const saveSub = async (headerId: string, sub: SubHeader) => {
    try {
      await updateSubHeader(sub._id || sub.id, {
        title: sub.title,
        content: sub.content,
        order: sub.order,
        audience: sub.audience,
        startAt: sub.startAt,
        endAt: sub.endAt,
        fileUrl: sub.fileUrl,
        fileName: sub.fileName
      });
      
      setData(prev => prev.map(h => 
        h.id === headerId ? 
        { ...h, subs: h.subs.map(s => s.id === sub.id ? sub : s).sort((a, b) => a.order - b.order) } : 
        h
      ));
      showSuccess('Đã cập nhật sub-header thành công');
    } catch (err) {
      console.error('Failed to update sub-header:', err);
      showError('Không thể cập nhật sub-header');
    }
  };

  const removeSub = async (headerId: string, subId: string) => {
    try {
      const header = data.find(h => h.id === headerId);
      const sub = header?.subs.find(s => s.id === subId);
      if (sub) {
        await deleteSubHeader(sub._id || sub.id);
        setData(prev => prev.map(h => 
          h.id === headerId ? 
          { ...h, subs: h.subs.filter(s => s.id !== subId) } : 
          h
        ));
        showSuccess('Đã xóa sub-header thành công');
      }
    } catch (err) {
      console.error('Failed to delete sub-header:', err);
      showError('Không thể xóa sub-header');
    }
  };

  const gotoSub = (h: HeaderBlock, s: SubHeader) => {
    const base = `/bcn-page/sub/${encodeURIComponent(s.id)}`;
    const path = s.kind === "nop-file" ? `${base}/upload` : base;
    navigate(path, { state: { header: h, sub: s, subjectId: subject?.id } });
  };

  // Enhanced drag and drop handlers for headers
  const handleHeaderDragStart = (e: React.DragEvent, headerId: string) => {
    setDraggedHeader(headerId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', ''); // For Safari compatibility
    
    // Create custom drag image
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
    
    if (draggedHeader && draggedHeader !== headerId) {
      setDragOverHeader(headerId);
    }
  };

  const handleHeaderDragLeave = (e: React.DragEvent) => {
    // Only clear if we're leaving the element, not entering a child
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverHeader(null);
    }
  };

  const handleHeaderDrop = async (e: React.DragEvent, targetHeaderId: string) => {
    e.preventDefault();
    setDragOverHeader(null);
    
    if (!draggedHeader || draggedHeader === targetHeaderId || !subject) return;

    try {
      const newData = [...data];
      const draggedIndex = newData.findIndex(h => h.id === draggedHeader);
      const targetIndex = newData.findIndex(h => h.id === targetHeaderId);
      
      if (draggedIndex === -1 || targetIndex === -1) return;

      // Reorder locally with smooth animation
      const [draggedItem] = newData.splice(draggedIndex, 1);
      newData.splice(targetIndex, 0, draggedItem);

      // Update orders
      newData.forEach((header, index) => {
        header.order = index + 1;
      });

      setData(newData);

      // Send to backend
      const headerIds = newData.map(h => h._id || h.id);
      await reorderHeaders(subject.id, headerIds);
      showSuccess('Đã thay đổi thứ tự header thành công');
    } catch (err) {
      console.error('Failed to reorder headers:', err);
      showError('Không thể thay đổi thứ tự header');
      // Reload data on error
      await loadPageData(subject.id);
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
    
    if (draggedSub && 
        draggedSub.headerId === headerId && 
        draggedSub.subId !== subId) {
      setDragOverSub({ headerId, subId });
    }
  };

  const handleSubDragLeave = (e: React.DragEvent) => {
    e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverSub(null);
    }
  };

  const handleSubDrop = async (e: React.DragEvent, targetHeaderId: string, targetSubId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverSub(null);
    
    if (!draggedSub || !subject) return;
    
    const { headerId: sourceHeaderId, subId: sourceSubId } = draggedSub;
    
    // Only allow reordering within the same header
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

      // Reorder locally
      const [draggedItem] = sourceSubs.splice(draggedIndex, 1);
      sourceSubs.splice(targetIndex, 0, draggedItem);

      // Update orders
      sourceSubs.forEach((sub, index) => {
        sub.order = index + 1;
      });

      newData[headerIndex] = { ...header, subs: sourceSubs };
      setData(newData);

      // Send to backend
      const subHeaderIds = sourceSubs.map(s => s._id || s.id);
      await reorderSubHeaders(header._id || header.id, subHeaderIds);
      showSuccess('Đã thay đổi thứ tự sub-header thành công');
    } catch (err) {
      console.error('Failed to reorder sub-headers:', err);
      showError('Không thể thay đổi thứ tự sub-header');
      // Reload data on error
      await loadPageData(subject.id);
    } finally {
      setDraggedSub(null);
    }
  };

  return (
    <PageLayout
      loading={loading}
      error={error || undefined}
      onRetry={loadManagedSubject}
      searchValue={query}
      onSearchChange={setQuery}
      searchPlaceholder="Tìm kiếm header / sub-header"
      statusPill={subject ? {
        label: `${subject.title} (${subject.id})`,
        color: 'blue'
      } : undefined}
      primaryAction={{
        label: "Tạo header",
        onClick: () => setOpenCreateHeader(true),
        icon: <span>➕</span>
      }}
    >
      <div className="space-y-4">

        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          {filtered.sort((a, b) => a.order - b.order).map((h) => {
            const open = !!expanded[h.id];
            const isHeaderBeingDragged = draggedHeader === h.id;
            const isHeaderDragTarget = dragOverHeader === h.id && !draggedSub; // Only for header drags
            
            return (
              <div 
                key={h.id} 
                className={`border-b last:border-b-0 transition-all duration-200 ${
                  isHeaderBeingDragged ? 'opacity-40 scale-95 rotate-1 shadow-lg' : ''
                } ${
                  isHeaderDragTarget ? 'ring-2 ring-blue-500 ring-opacity-50 bg-blue-50' : ''
                }`}
                draggable
                onDragStart={(e) => handleHeaderDragStart(e, h.id)}
                onDragEnd={handleHeaderDragEnd}
                onDragOver={(e) => handleHeaderDragOver(e, h.id)}
                onDragLeave={handleHeaderDragLeave}
                onDrop={(e) => handleHeaderDrop(e, h.id)}
              >
                <div className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-3 sm:py-4 bg-gray-50">
                  {/* Enhanced drag handle */}
                  <div 
                    className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-200 transition-colors touch-manipulation" 
                    title="Kéo để sắp xếp lại thứ tự"
                  >
                    <span className="text-xs sm:text-sm">⋮⋮</span>
                  </div>
                  
                  <ChevronButton open={open} onClick={() => setExpanded((m) => ({ ...m, [h.id]: !open }))} />
                  <h3 className="text-sm sm:text-lg font-bold flex-1 min-w-0 truncate">{h.title}</h3>
                  <Tag>{AudienceText[h.audience]}</Tag>
                  
                  {/* Order indicator */}
                  <span className="hidden sm:inline-flex text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded-full font-mono">
                    #{h.order}
                  </span>
                  
                  <button className="ml-1 sm:ml-2 h-7 w-7 sm:h-8 sm:w-8 grid place-items-center rounded-md bg-emerald-600 text-white hover:bg-emerald-700 transition-colors touch-manipulation" title="Sửa header" onClick={() => setEditHeader(h)}>
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 sm:h-4 sm:w-4"><path fill="currentColor" d="M3 17.2V21h3.8l11-11L14 6.2l-11 11Z"/></svg>
                  </button>
                  <button className="h-7 w-7 sm:h-8 sm:w-8 grid place-items-center rounded-md bg-cyan-600 text-white hover:bg-cyan-700 transition-colors touch-manipulation" title="Thêm sub-header" onClick={() => setCreateUnder(h)}>
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 sm:h-4 sm:w-4"><path fill="currentColor" d="M19 11h-6V5h-2v6H5v2h6v6h2v-6h6z"/></svg>
                  </button>
                  <button
                    className="h-7 w-7 sm:h-8 sm:w-8 grid place-items-center rounded-md bg-rose-600 text-white hover:bg-rose-700 transition-colors touch-manipulation"
                    title="Xóa header"
                    onClick={()=>setConfirmDelHeader(h)}
                  >
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 sm:h-4 sm:w-4"><path fill="currentColor" d="M6 7h12v2H6zm2 3h8l-1 10H9L8 10Zm3-7h2l1 2h4v2H6V5h4l1-2Z"/></svg>
                  </button>
                </div>

                {open && (
                  <div className="px-3 sm:px-6 pb-3 sm:pb-4 space-y-2">
                  {h.subs.sort((a,b)=>a.order-b.order).map((s)=>{
                    const isSubBeingDragged = draggedSub?.subId === s.id;
                    const isSubDragTarget = dragOverSub?.subId === s.id && dragOverSub?.headerId === h.id;
                    
                    return (
                    <div 
                      key={s.id} 
                      className={`flex items-center py-2.5 sm:py-3 px-2.5 sm:px-3 rounded-lg transition-all duration-200 ${
                        isSubBeingDragged ? 'opacity-40 scale-95 shadow-lg bg-gray-100' : 'hover:bg-gray-50'
                      } ${
                        isSubDragTarget ? 'ring-2 ring-blue-500 ring-opacity-50 bg-blue-50' : ''
                      }`}
                      draggable
                      onDragStart={(e) => handleSubDragStart(e, h.id, s.id)}
                      onDragEnd={handleSubDragEnd}
                      onDragOver={(e) => handleSubDragOver(e, h.id, s.id)}
                      onDragLeave={handleSubDragLeave}
                      onDrop={(e) => handleSubDrop(e, h.id, s.id)}
                    >
                      {/* Enhanced drag handle for sub-headers */}
                      <div className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-200 transition-colors mr-1.5 sm:mr-2 touch-manipulation" title="Kéo để sắp xếp lại thứ tự">
                        <span className="text-xs">⋮⋮</span>
                      </div>
                      
                      <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                      {/* icon by kind */}
                      {s.kind === "thong-bao" ? (
                        <span className="shrink-0 text-blue-600 text-sm sm:text-base" title="Thông báo">🔔</span>
                      ) : s.kind === "nop-file" ? (
                        <span className="shrink-0 text-orange-600 text-sm sm:text-base" title="Nộp file">📤</span>
                      ) : s.kind === "file" ? (
                        <span className="shrink-0 text-green-600 text-sm sm:text-base" title="File tải xuống">📎</span>
                      ) : (
                        <span className="shrink-0 w-3 sm:w-4 grid place-items-center text-gray-400 text-xs sm:text-sm" aria-hidden title="Mục">•</span>
                      )}

                      {/* label */}
                      {(s.kind === "van-ban" || s.kind === "thuong") ? (
                        <span className="text-xs sm:text-sm text-gray-900 whitespace-pre-line line-clamp-2">
                          {htmlToTextWithBreaks(s.content || s.title) || "(Nội dung trống)"}
                        </span>
                      ) : (
                        <button
                          className="truncate text-left text-xs sm:text-sm text-gray-900 hover:underline touch-manipulation"
                          onClick={() => gotoSub(h, s)}
                        >
                          {s.title}
                        </button>
                      )}
                    </div>

                      {/* right meta & actions */}
                      <div className="ml-2 sm:ml-4 flex items-center gap-1.5 sm:gap-3 shrink-0 flex-wrap">
                        {/* Order indicator - hide on mobile */}
                        <span className="hidden sm:inline-flex text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded-full font-mono">
                          #{s.order}
                        </span>
                        
                        <span className="hidden sm:inline-flex rounded-full bg-gray-100 text-gray-700 px-2.5 py-0.5 text-xs font-medium">
                          {{
                            "thuong": "Thường",
                            "thong-bao": "Thông báo",
                            "nop-file": "Nộp file",
                            "van-ban": "Văn bản",
                            "file": "File tải xuống",
                          }[s.kind]}
                        </span>

                        {s.kind === "nop-file" && (
                          <span className="text-[10px] sm:text-xs text-gray-500 whitespace-nowrap">
                            {s.startAt ? `${dayjs(s.startAt).format("DD/MM")}` : "?"} - {s.endAt ? `${dayjs(s.endAt).format("DD/MM")}` : "?"}
                          </span>
                        )}

                        <button
                          className="h-6 w-6 sm:h-7 sm:w-7 grid place-items-center rounded-md bg-emerald-600 text-white hover:bg-emerald-700 transition-colors touch-manipulation"
                          title="Sửa sub-header"
                          onClick={()=>setEditSub({ headerId: h.id, sub: s })}
                        >
                          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 sm:h-4 sm:w-4"><path fill="currentColor" d="M3 17.2V21h3.8l11-11L14 6.2l-11 11Z"/></svg>
                        </button>
                        <button
                          className="h-6 w-6 sm:h-7 sm:w-7 grid place-items-center rounded-md bg-rose-600 text-white hover:bg-rose-700 transition-colors touch-manipulation"
                          title="Xóa"
                          onClick={()=>setConfirmDelSub({ header: h, sub: s })}
                        >
                          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 sm:h-4 sm:w-4"><path fill="currentColor" d="M6 7h12v2H6zm2 3h8l-1 10H9L8 10Zm3-7h2l1 2h4v2H6V5h4l1-2Z"/></svg>
                        </button>
                      </div>
                    </div>
                  )})}
              </div>
              )}
            </div>
          );
          })}
          
          {filtered.length === 0 && !loading && (
            <div className="py-8 sm:py-12">
              <EmptyState
                icon={data.length === 0 ? "📄" : "🔍"}
                title={data.length === 0 ? "Chưa có nội dung trang" : "Không tìm thấy kết quả"}
                description={
                  data.length === 0
                    ? "Tạo header đầu tiên để bắt đầu quản lý nội dung trang khoa."
                    : "Thử thay đổi từ khóa tìm kiếm."
                }
                action={
                  data.length === 0
                    ? {
                        label: "Tạo header",
                        onClick: () => setOpenCreateHeader(true),
                        icon: "➕"
                      }
                    : undefined
                }
                secondaryAction={
                  data.length > 0
                    ? {
                        label: "Xóa tìm kiếm",
                        onClick: () => setQuery(""),
                      }
                    : undefined
                }
              />
            </div>
          )}
        </div>

        {/* Dialogs */}
        <CreateHeaderDialog 
          open={openCreateHeader} 
          onClose={() => setOpenCreateHeader(false)} 
          onCreate={(h) => { addHeader(h); setOpenCreateHeader(false); }} 
        />
        <EditHeaderDialog 
          open={!!editHeader} 
          header={editHeader ?? undefined} 
          onClose={() => setEditHeader(null)} 
          onSave={(h) => { saveHeader(h); setEditHeader(null); }} 
          onDelete={(id) => { removeHeader(id); setEditHeader(null); }} 
        />
        <CreateSubDialog 
          open={!!createUnder} 
          header={createUnder ?? undefined} 
          onClose={() => setCreateUnder(null)} 
          onCreate={(hid, s) => { addSub(hid, s); setCreateUnder(null); }} 
        />
        <EditSubDialog 
          open={!!editSub} 
          headerId={editSub?.headerId} 
          sub={editSub?.sub} 
          header={editSub ? data.find(h => h.id === editSub.headerId) : undefined}
          onClose={() => setEditSub(null)} 
          onSave={(hid, s) => { saveSub(hid, s); setEditSub(null); }} 
          onDelete={(hid, sid) => { removeSub(hid, sid); setEditSub(null); }} 
        />
        
        <ConfirmDeleteDialog
          open={!!confirmDelHeader}
          title="Xóa header"
          message={`Xóa header "${confirmDelHeader?.title}" và tất cả sub-header bên trong?`}
          onCancel={()=>setConfirmDelHeader(null)}
          onConfirm={()=>{
            if (confirmDelHeader) removeHeader(confirmDelHeader.id);
            setConfirmDelHeader(null);
          }}
        />

        <ConfirmDeleteDialog
          open={!!confirmDelSub}
          title="Xóa sub-header"
          message={`Xóa sub-header "${confirmDelSub?.sub.title}"?`}
          onCancel={()=>setConfirmDelSub(null)}
          onConfirm={()=>{
            if (confirmDelSub) removeSub(confirmDelSub.header.id, confirmDelSub.sub.id);
            setConfirmDelSub(null);
          }}
        />
      </div>
    </PageLayout>
  );
};

export default KhoaPageManagement;
