import React, { useRef, useState } from "react";
import { useToast } from "../../../components/UI/Toast";

export interface ParsedRow {
  id: string;
  name: string;
  advisorId?: string;
  advisorName?: string;
}

interface Props {
  onParsed: (rows: ParsedRow[]) => void;
  acceptAdvisor?: boolean; // if true, expect advisor columns too
}

const FileDrop: React.FC<Props> = ({ onParsed, acceptAdvisor }) => {
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { showWarning } = useToast();

  const parseCSV = async (file: File) => {
    const text = await file.text();
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length <= 1) return onParsed([]);
    const rows = lines.slice(1).map((l) => {
      const [id, name, advisorId, advisorName] = l.split(",").map((s) => s?.trim());
      return acceptAdvisor ? { id, name, advisorId, advisorName } : { id, name };
    }).filter((r) => r.id && r.name);
    onParsed(rows);
  };

  const handleFiles = (files: FileList | null) => {
    if (!files || !files[0]) return;
    const f = files[0];
    const lower = f.name.toLowerCase();
    if (lower.endsWith(".csv")) return void parseCSV(f);

    // To support real Excel: install 'xlsx' and parse here.
    showWarning("File không hỗ trợ", "Vui lòng nộp file .csv (hoặc cài đặt parser .xlsx).");
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); handleFiles(e.dataTransfer.files); }}
      onClick={() => inputRef.current?.click()}
      className={`mt-1 flex h-40 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed ${drag ? "border-blue-400 bg-blue-50" : "border-gray-300"}`}
    >
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept=".csv"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <div className="text-center text-gray-600">
        <div className="text-4xl mb-2">📄</div>
        <div className="font-medium">Nộp danh sách excel tại đây</div>
        <div className="text-xs text-gray-500 mt-1">Hỗ trợ .csv (id,name[,advisorId,advisorName])</div>
      </div>
    </div>
  );
};

export default FileDrop;
