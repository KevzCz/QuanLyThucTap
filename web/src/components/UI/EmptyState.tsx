import React from 'react';

interface EmptyStateProps {
  /** Icon or emoji to display (optional) */
  icon?: React.ReactNode;
  /** Main title/heading */
  title: string;
  /** Description text (optional) */
  description?: string;
  /** Primary action button (optional) */
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  /** Secondary action button (optional) */
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  /** Custom className for styling */
  className?: string;
}

/**
 * EmptyState component for displaying when no data is available
 * 
 * @example
 * <EmptyState
 *   icon="📭"
 *   title="Chưa có thông báo"
 *   description="Bạn sẽ nhận được thông báo khi có cập nhật mới"
 * />
 * 
 * @example
 * <EmptyState
 *   icon={<Icons.Folder className="w-16 h-16 text-gray-300" />}
 *   title="Chưa có báo cáo"
 *   description="Bắt đầu bằng cách tạo báo cáo đầu tiên"
 *   action={{
 *     label: "Tạo báo cáo",
 *     onClick: () => setShowCreateDialog(true),
 *     icon: "➕"
 *   }}
 * />
 */
const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className = ''
}) => {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}>
      {/* Icon */}
      {icon && (
        <div className="mb-4 text-6xl opacity-50">
          {icon}
        </div>
      )}

      {/* Title */}
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p className="text-sm text-gray-500 max-w-md mb-6">
          {description}
        </p>
      )}

      {/* Actions */}
      {(action || secondaryAction) && (
        <div className="flex gap-3">
          {action && (
            <button
              onClick={action.onClick}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
            >
              {action.icon && <span>{action.icon}</span>}
              {action.label}
            </button>
          )}
          
          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default EmptyState;
