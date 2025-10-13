import React from "react";

interface PageToolbarProps {
  children: React.ReactNode;
  className?: string;
}

const PageToolbar: React.FC<PageToolbarProps> = ({ 
  children, 
  className = "sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-200" 
}) => (
  <div className={className}>
    <div className="mx-0 sm:mx-1 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-2 py-3">
      {children}
    </div>
  </div>
);

export default PageToolbar;
