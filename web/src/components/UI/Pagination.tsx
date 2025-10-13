import React from "react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 border-t border-gray-200 bg-white px-4 py-3">
      <button
        className="h-8 w-8 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40"
        disabled={currentPage === 1}
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        title="Trang trước"
      >
        ‹
      </button>
      <span className="text-sm text-gray-700">
        <span className="font-semibold">{currentPage}</span> / {totalPages}
      </span>
      <button
        className="h-8 w-8 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        title="Trang sau"
      >
        ›
      </button>
    </div>
  );
};

export default Pagination;
