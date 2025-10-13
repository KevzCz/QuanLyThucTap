import React from "react";

interface SubjectPillProps {
  value: string;
  disabled?: boolean;
  className?: string;
}

const SubjectPill: React.FC<SubjectPillProps> = ({ 
  value, 
  disabled = true, 
  className = "min-w-[220px] max-w-[320px]" 
}) => (
  <div className="flex-1 flex justify-center px-4">
    <input
      disabled={disabled}
      value={value}
      className={`h-10 rounded-full border border-gray-300 bg-white px-6 text-sm text-gray-700 text-center w-full ${className} ${
        disabled ? 'cursor-not-allowed' : ''
      }`}
    />
  </div>
);

export default SubjectPill;
