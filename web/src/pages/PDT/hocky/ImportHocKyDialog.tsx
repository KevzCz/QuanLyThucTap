import React, { useState } from "react";
import { Upload, Download, CheckCircle, AlertCircle, X } from "lucide-react";
import apiClient, { type ImportedStudent } from "../../../utils/api";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ImportHocKyDialog: React.FC<Props> = ({ open, onClose, onSuccess }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    message: string;
    students?: ImportedStudent[];
    errors?: string[];
  } | null>(null);

  if (!open) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setImportResult(null);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    setImporting(true);
    setImportResult(null);

    try {
      const result = await apiClient.importHocKy(selectedFile);
      setImportResult({
        success: true,
        message: result.message,
        students: result.students,
        errors: result.errors,
      });
      
      // Auto-close after 2 seconds if successful
      if (!result.errors || result.errors.length === 0) {
        setTimeout(() => {
          onSuccess();
          handleClose();
        }, 2000);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Có lỗi xảy ra khi nhập dữ liệu";
      setImportResult({
        success: false,
        message: errorMessage,
      });
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setImportResult(null);
    onClose();
  };

  const downloadTemplate = () => {
    // Create a sample Excel template
    const templateContent = `Học kỳ 1\tNăm học 2024-2025\t01/09/2024 - 31/12/2024
Tên sinh viên\tKhoa\tNgày sinh
Nguyễn Văn A\tCông nghệ thông tin\t15/03/2004
Trần Thị B\tKinh tế\t22/07/2005
`;

    const blob = new Blob([templateContent], { type: "text/tab-separated-values" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "hocky-template.xls";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div 
        className="absolute inset-0" 
        onClick={importing ? undefined : handleClose}
      />
      <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Nhập học kỳ từ Excel</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 rounded-lg p-1 hover:bg-gray-100 transition-colors"
            disabled={importing}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 overflow-y-auto flex-1">
          {/* Template Download */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="text-sm font-medium text-blue-900 mb-2">
              Định dạng file Excel
            </h3>
            <p className="text-sm text-blue-700 mb-3">
              File Excel cần có định dạng:
            </p>
            <ul className="text-sm text-blue-700 mb-3 list-disc list-inside space-y-1">
              <li>Dòng 1: Học kỳ 1 | Năm học 2024-2025 | 01/09/2024 - 31/12/2024</li>
              <li>Dòng 2: Tên sinh viên | Khoa | Ngày sinh</li>
              <li>Từ dòng 3 trở đi: Danh sách sinh viên (Ngày sinh: DD/MM/YYYY)</li>
            </ul>
            <button
              onClick={downloadTemplate}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
            >
              <Download size={16} />
              Tải file mẫu
            </button>
          </div>

          {/* File Upload */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Chọn file Excel
            </label>
            <div className="relative">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
                disabled={importing}
              />
              <label
                htmlFor="file-upload"
                className={`flex items-center justify-center gap-2 px-4 py-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                  importing
                    ? "border-gray-300 bg-gray-50 cursor-not-allowed"
                    : "border-gray-300 hover:border-blue-400 hover:bg-blue-50"
                }`}
              >
                <Upload size={24} className="text-gray-400" />
                <div className="text-center">
                  {selectedFile ? (
                    <>
                      <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {(selectedFile.size / 1024).toFixed(2)} KB
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-gray-700">
                        Nhấn để chọn file hoặc kéo thả vào đây
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Chỉ chấp nhận file .xlsx, .xls
                      </p>
                    </>
                  )}
                </div>
              </label>
            </div>
          </div>

          {/* Import Result */}
          {importResult && (
            <div
              className={`p-4 rounded-lg border ${
                importResult.success
                  ? "bg-green-50 border-green-200"
                  : "bg-red-50 border-red-200"
              }`}
            >
              <div className="flex items-start gap-3">
                {importResult.success ? (
                  <CheckCircle size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <h4
                    className={`text-sm font-medium mb-1 ${
                      importResult.success ? "text-green-900" : "text-red-900"
                    }`}
                  >
                    {importResult.success ? "Nhập thành công!" : "Nhập thất bại"}
                  </h4>
                  <p
                    className={`text-sm ${
                      importResult.success ? "text-green-700" : "text-red-700"
                    }`}
                  >
                    {importResult.message}
                  </p>
                  
                  {/* Show created students */}
                  {importResult.students && importResult.students.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm font-medium text-green-900 mb-2">
                        Đã tạo {importResult.students.filter(s => !s.existing).length} tài khoản sinh viên mới:
                      </p>
                      <div className="max-h-40 overflow-y-auto bg-white rounded border border-green-200 p-2">
                        {importResult.students
                          .filter(s => !s.existing && s.password)
                          .map((student, idx) => (
                            <div key={idx} className="text-xs text-gray-700 py-1 border-b last:border-0">
                              <span className="font-medium">{student.name}</span>
                              <span className="text-gray-500"> - Username: </span>
                              <span className="font-mono">{student.username}</span>
                              <span className="text-gray-500"> - Password: </span>
                              <span className="font-mono text-blue-600">{student.password}</span>
                            </div>
                          ))}
                      </div>
                      <p className="text-xs text-green-600 mt-2">
                        💡 Lưu lại thông tin đăng nhập để gửi cho sinh viên
                      </p>
                    </div>
                  )}

                  {/* Show errors */}
                  {importResult.errors && importResult.errors.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm font-medium text-orange-900 mb-2">
                        Có {importResult.errors.length} lỗi:
                      </p>
                      <ul className="text-xs text-orange-700 space-y-1 list-disc list-inside">
                        {importResult.errors.map((error, idx) => (
                          <li key={idx}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            disabled={importing}
          >
            {importResult?.success ? "Đóng" : "Hủy"}
          </button>
          {!importResult?.success && (
            <button
              onClick={handleImport}
              disabled={!selectedFile || importing}
              className={`px-4 py-2 rounded-lg transition-colors ${
                !selectedFile || importing
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              {importing ? "Đang nhập..." : "Nhập dữ liệu"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImportHocKyDialog;
