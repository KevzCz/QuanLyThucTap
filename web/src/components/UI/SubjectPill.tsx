import React from "react";

interface SubjectPillProps {
  value: string;
  disabled?: boolean;
  className?: string;
}

const SubjectPill: React.FC<SubjectPillProps> = ({ 
  value, 
  disabled = true, 
  className = "" 
}) => (
  <div 
    className={`h-10 rounded-full border border-gray-300 bg-white px-6 text-sm text-gray-700 text-center flex items-center justify-center whitespace-nowrap ${className} ${
      disabled ? 'cursor-not-allowed' : ''
    }`}
  >
    {value}
  </div>
);

export default SubjectPill;
