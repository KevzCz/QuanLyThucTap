import React, { useState, useEffect, useCallback } from "react";
import { Plus, Calendar, Users, Eye, Filter, X } from "lucide-react";
import apiClient, { type HocKy } from "../../../utils/api";
import ImportHocKyDialog from "./ImportHocKyDialog";

const HocKyManagement: React.FC = () => {
  const [hocKyList, setHocKyList] = useState<HocKy[]>([]);
  const [namHocList, setNamHocList] = useState<string[]>([]);
  const [selectedNamHoc, setSelectedNamHoc] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedHocKy, setSelectedHocKy] = useState<HocKy | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  const fetchNamHocList = useCallback(async () => {
    try {
      const data = await apiClient.getNamHocList();
      setNamHocList(data);
    } catch (error) {
      console.error("Error fetching năm học list:", error);
    }
  }, []);

  const fetchHocKyList = useCallback(async () => {
    setLoading(true);
    try {
      const filterNamHoc = selectedNamHoc === "all" ? undefined : selectedNamHoc;
      const response = await apiClient.getHocKyList(filterNamHoc);
      // Handle response structure: { success: true, data: HocKy[] }
      const data = Array.isArray(response) ? response : (response as { success: boolean; data: HocKy[] })?.data || [];
      setHocKyList(data);
    } catch (error) {
      console.error("Error fetching học kỳ list:", error);
      setHocKyList([]);
    } finally {
      setLoading(false);
    }
  }, [selectedNamHoc]);

  useEffect(() => {
    fetchNamHocList();
    fetchHocKyList();
  }, [fetchNamHocList, fetchHocKyList]);

  const handleImportSuccess = () => {
    fetchHocKyList();
    fetchNamHocList();
    setImportDialogOpen(false);
  };

  const handleView = async (hocKy: HocKy) => {
    try {
      const details = await apiClient.getHocKyDetails(hocKy.id);
      setSelectedHocKy(details);
      setViewDialogOpen(true);
    } catch (error) {
      console.error("Error fetching học kỳ details:", error);
      alert("Không thể tải thông tin học kỳ.");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN");
  };

  return (
    <div className="p-6">
      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Filter size={20} className="text-gray-400" />
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Năm học:</label>
              <select
                value={selectedNamHoc}
                onChange={(e) => setSelectedNamHoc(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Tất cả</option>
                {namHocList.map((namHoc) => (
                  <option key={namHoc} value={namHoc}>
                    {namHoc}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button
            onClick={() => setImportDialogOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={20} />
            Nhập từ Excel
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500">Đang tải...</div>
        </div>
      ) : hocKyList.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <Calendar size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Chưa có học kỳ nào</h3>
          <p className="text-gray-500 mb-6">
            Nhấn vào nút "Nhập từ Excel" để thêm học kỳ mới
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Học kỳ
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Năm học
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thời gian
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Số sinh viên
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {hocKyList.map((hocKy) => (
                <tr key={hocKy.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Calendar size={16} className="text-blue-500 mr-2" />
                      <span className="font-medium text-gray-900">Học kỳ {hocKy.hocKyNumber}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {hocKy.namHoc}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {formatDate(hocKy.durationStart)} - {formatDate(hocKy.durationEnd)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-700">
                      <Users size={16} className="text-gray-400 mr-2" />
                      {hocKy.studentCount || hocKy.sinhViens.length} sinh viên
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleView(hocKy)}
                      className="text-blue-600 hover:text-blue-800"
                      title="Xem chi tiết"
                    >
                      <Eye size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Import Dialog */}
      <ImportHocKyDialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        onSuccess={handleImportSuccess}
      />

      {/* View Dialog */}
      {viewDialogOpen && selectedHocKy && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div 
            className="absolute inset-0" 
            onClick={() => setViewDialogOpen(false)}
          />
          <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                Chi tiết Học kỳ {selectedHocKy.hocKyNumber} - {selectedHocKy.namHoc}
              </h2>
              <button
                onClick={() => setViewDialogOpen(false)}
                className="text-gray-400 hover:text-gray-600 rounded-lg p-1 hover:bg-gray-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="px-6 py-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Thời gian bắt đầu
                  </label>
                  <p className="text-gray-900">{formatDate(selectedHocKy.durationStart)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Thời gian kết thúc
                  </label>
                  <p className="text-gray-900">{formatDate(selectedHocKy.durationEnd)}</p>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">
                  Danh sách sinh viên ({selectedHocKy.sinhViens.length})
                </h3>
                <div className="text-sm text-gray-500">
                  Tổng số sinh viên: {selectedHocKy.sinhViens.length}
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setViewDialogOpen(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HocKyManagement;
