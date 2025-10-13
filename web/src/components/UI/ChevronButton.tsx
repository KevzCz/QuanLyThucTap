import React from "react";

interface ChevronButtonProps {
  open: boolean;
  onClick: () => void;
  className?: string;
}

const ChevronButton: React.FC<ChevronButtonProps> = ({ 
  open, 
  onClick, 
  className = "h-7 w-7 grid place-items-center rounded-md hover:bg-gray-100" 
}) => (
  <button onClick={onClick} className={className}>
    <svg viewBox="0 0 24 24" className={`h-4 w-4 transition ${open ? "rotate-90" : ""}`}>
      <path fill="currentColor" d="m10 17 5-5-5-5v10z" />
    </svg>
  </button>
);

export default ChevronButton;
