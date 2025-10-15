import React, { type ReactNode } from "react";
import Modal from "../../util/Modal";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Icons } from "./Icons";

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
  type?: 'default' | 'confirmation' | 'form';
}

const StandardDialog: React.FC<StandardDialogProps> = ({
  open,
  onClose,
  title,
  children,
  primaryAction,
  secondaryAction,
  size = 'md',
  icon,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  type = 'default'
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

  const actions = (
    <div className="flex items-center gap-3 justify-end">
      {secondaryAction && (
        <button
          onClick={secondaryAction.onClick}
          className={`h-10 px-4 rounded-md font-medium transition-colors ${
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
          className={`h-10 px-4 rounded-md font-medium transition-colors inline-flex items-center gap-2 ${
            primaryVariants[primaryAction.variant || 'primary']
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {primaryAction.loading && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          )}
          {primaryAction.label}
        </button>
      )}
    </div>
  );

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
