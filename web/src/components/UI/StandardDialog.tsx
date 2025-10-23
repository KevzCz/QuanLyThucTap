import React, { type ReactNode } from "react";
import Modal from "../../util/Modal";

interface StandardDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  
  // Action buttons
  primaryAction?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'success' | 'danger';
    loading?: boolean;
    disabled?: boolean;
  };
  
  secondaryAction?: {
    label: string;
    onClick: () => void;
    variant?: 'secondary' | 'ghost';
  };
  
  // Layout
  size?: 'sm' | 'md' | 'lg' | 'xl';
  
  // Visual
  icon?: ReactNode;
}

const StandardDialog: React.FC<StandardDialogProps> = ({
  open,
  onClose,
  title,
  children,
  primaryAction,
  secondaryAction,
  size = 'md',
  icon
}) => {
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg', 
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
  };

  const primaryVariants = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    success: 'bg-green-600 hover:bg-green-700 text-white',
    danger: 'bg-red-600 hover:bg-red-700 text-white'
  };

  const secondaryVariants = {
    secondary: 'border border-gray-300 text-gray-700 hover:bg-gray-50',
    ghost: 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
  };

  const actions = primaryAction || secondaryAction ? (
    <div className="flex items-center gap-3 justify-end">
      {secondaryAction && (
        <button
          onClick={secondaryAction.onClick}
          className={`h-10 px-4 rounded-lg font-medium transition-all hover:scale-[1.02] active:scale-[0.98] ${
            secondaryVariants[secondaryAction.variant || 'secondary']
          }`}
        >
          {secondaryAction.label}
        </button>
      )}
      
      {primaryAction && (
        <button
          onClick={primaryAction.onClick}
          disabled={primaryAction.disabled || primaryAction.loading}
          className={`h-10 px-4 rounded-lg font-medium transition-all inline-flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] ${
            primaryVariants[primaryAction.variant || 'primary']
          } disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100`}
        >
          {primaryAction.loading && (
            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          )}
          {primaryAction.label}
        </button>
      )}
    </div>
  ) : undefined;

  const titleWithIcon = icon ? (
    <div className="flex items-center gap-3">
      {icon}
      <span>{title}</span>
    </div>
  ) : title;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={titleWithIcon}
      widthClass={sizeClasses[size]}
      actions={actions}
    >
      {children}
    </Modal>
  );
};

export default StandardDialog;
