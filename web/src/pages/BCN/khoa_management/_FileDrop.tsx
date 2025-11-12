import React, { useRef, useState } from "react";
import { useToast } from "../../../components/UI/Toast";
import * as XLSX from 'xlsx';

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

  const parseXLSX = async (file: File) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData = XLSX.utils.sheet_to_json<unknown>(worksheet, { header: 1 }) as unknown[][];
      
      if (jsonData.length <= 1) return onParsed([]);
      
      // Skip header row and parse data
      const rows: ParsedRow[] = jsonData.slice(1)
        .map((row: unknown[]) => {
          const id = row[0]?.toString().trim() || '';
          const name = row[1]?.toString().trim() || '';
          const advisorId = row[2]?.toString().trim();
          const advisorName = row[3]?.toString().trim();
          return acceptAdvisor 
            ? { id, name, advisorId, advisorName } 
            : { id, name };
        })
        .filter((r): r is ParsedRow => Boolean(r.id && r.name));
      
      onParsed(rows);
    } catch (error) {
      console.error("Error parsing Excel file:", error);
      showWarning("Lỗi đọc file", "Không thể đọc file Excel. Vui lòng kiểm tra định dạng file.");
    }
  };

  const handleFiles = (files: FileList | null) => {
    if (!files || !files[0]) return;
    const f = files[0];
    const lower = f.name.toLowerCase();
    if (lower.endsWith(".csv")) return void parseCSV(f);
    if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) return void parseXLSX(f);

    showWarning("File không hỗ trợ", "Vui lòng nộp file .xlsx hoặc .csv");
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
        accept=".xlsx,.xls,.csv"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <div className="text-center text-gray-600">
        <div className="text-4xl mb-2">📄</div>
        <div className="font-medium">Nộp danh sách excel tại đây</div>
        <div className="text-xs text-gray-500 mt-1">Hỗ trợ .xlsx, .csv (cột: id, name{acceptAdvisor ? ", advisorId, advisorName" : ""})</div>
      </div>
    </div>
  );
};

export default FileDrop;
