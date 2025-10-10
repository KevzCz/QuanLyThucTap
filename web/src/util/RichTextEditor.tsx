import React, { useRef, useEffect } from "react";

interface Props {
  html: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
}

const TBtn: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ className = "", ...p }) => (
  <button
    {...p}
    type="button"
    className={`h-8 px-2 rounded-md border border-gray-300 bg-white text-sm hover:bg-gray-50 active:bg-gray-100 transition ${className}`}
  />
);

const Icon = ({ path }: { path: string }) => (
  <svg viewBox="0 0 24 24" className="h-4 w-4"><path fill="currentColor" d={path} /></svg>
);

const RichTextEditor: React.FC<Props> = ({ html, onChange, placeholder, className }) => {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== html) ref.current.innerHTML = html;
  }, [html]);

  const exec = (cmd: string, value?: string) => {
    document.execCommand(cmd, false, value);
    if (ref.current) onChange(ref.current.innerHTML);
  };

  const onInput = () => ref.current && onChange(ref.current.innerHTML);

  const addLink = () => {
    const url = prompt("Nhập URL:");
    if (url) exec("createLink", url);
  };

  const clear = () => {
    if (!ref.current) return;
    ref.current.innerHTML = "";
    onChange("");
  };

  return (
    <div className={className}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-2 py-2">
        <div className="flex gap-1">
          <TBtn title="Đậm" onClick={() => exec("bold")}><Icon path="M13.5 15H9v2h4.5a2 2 0 0 0 0-4H9V9h4a1.5 1.5 0 0 0 0-3H9V4h4a3 3 0 0 1 0 6 3 3 0 0 1 .5 6Z"/></TBtn>
          <TBtn title="Nghiêng" onClick={() => exec("italic")}><span className="italic">I</span></TBtn>
          <TBtn title="Gạch chân" onClick={() => exec("underline")}><span className="underline">U</span></TBtn>
        </div>

        <span className="h-6 w-px bg-gray-200" />

        <div className="flex gap-1">
          <TBtn title="Danh sách chấm" onClick={() => exec("insertUnorderedList")}>• List</TBtn>
          <TBtn title="Danh sách số" onClick={() => exec("insertOrderedList")}>1. List</TBtn>
          <TBtn title="Trích dẫn" onClick={() => exec("formatBlock", "<blockquote>")}>“Q”</TBtn>
        </div>

        <span className="h-6 w-px bg-gray-200" />

        <div className="flex gap-1">
          <TBtn title="Liên kết" onClick={addLink}>Link</TBtn>
          <TBtn title="Xóa tất cả" onClick={clear} className="text-rose-600 border-rose-200">Clear</TBtn>
        </div>
      </div>

      {/* Editor */}
      <div
        ref={ref}
        contentEditable
        onInput={onInput}
        className="mt-2 min-h-[240px] rounded-lg border border-gray-300 bg-white p-3 outline-none focus:ring-2 focus:ring-blue-500"
        data-placeholder={placeholder ?? "Nhập nội dung..."}
        style={{ whiteSpace: "pre-wrap" }}
      />
      <style>{`
        [contenteditable][data-placeholder]:empty:before{
          content: attr(data-placeholder);
          color:#9CA3AF;
        }
        [contenteditable] a { color: #2563eb; text-decoration: underline; }
        blockquote { border-left: 3px solid #e5e7eb; padding-left: .75rem; color:#4b5563; margin: .25rem 0; }
      `}</style>
    </div>
  );
};

export default RichTextEditor;
