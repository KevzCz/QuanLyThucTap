import React, { type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Icons } from "./Icons";
import SearchInput from "./SearchInput";

interface PageLayoutProps {
  children: ReactNode;
  
  // Header
  title?: string;
  breadcrumb?: Array<{ label: string; path?: string }>;
  
  // Toolbar
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  
  // Filters
  filters?: ReactNode;
  
  // Actions
  primaryAction?: {
    label: string;
    onClick: () => void;
    icon?: ReactNode;
    variant?: 'primary' | 'success';
  };
  
  secondaryActions?: Array<{
    label: string;
    onClick: () => void;
    icon?: ReactNode;
    variant?: 'secondary' | 'ghost';
  }>;
  
  // Status indicators
  statusPill?: {
    label: string;
    color?: 'blue' | 'green' | 'yellow' | 'red' | 'gray';
  };
  
  // Layout
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
}

const PageLayout: React.FC<PageLayoutProps> = ({
  children,
  title,
  breadcrumb,
  searchValue,
  onSearchChange,
  searchPlaceholder = "Tìm kiếm...",
  filters,
  primaryAction,
  secondaryActions,
  statusPill,
  loading,
  error,
  onRetry
}) => {
  const navigate = useNavigate();

  const statusColors = {
    blue: 'bg-blue-100 text-blue-700 border-blue-200',
    green: 'bg-green-100 text-green-700 border-green-200', 
    yellow: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    red: 'bg-red-100 text-red-700 border-red-200',
    gray: 'bg-gray-100 text-gray-700 border-gray-200'
  };

  const actionVariants = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    success: 'bg-green-600 hover:bg-green-700 text-white',
    secondary: 'border border-gray-300 text-gray-700 hover:bg-gray-50',
    ghost: 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {/* Toolbar skeleton */}
        <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-[340px] h-9 bg-gray-200 rounded-md animate-pulse" />
            <div className="w-32 h-9 bg-gray-200 rounded-full animate-pulse" />
          </div>
          <div className="w-24 h-9 bg-gray-200 rounded-md animate-pulse" />
        </div>
        
        {/* Content skeleton */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-8">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        {title && (
          <div className="flex items-center gap-3 p-4">
            <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
          </div>
        )}
        
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-8 text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Không thể tải dữ liệu</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Thử lại
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      {breadcrumb && breadcrumb.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          {breadcrumb.map((item, index) => (
            <React.Fragment key={index}>
              {index > 0 && <span>/</span>}
              {item.path ? (
                <button 
                  onClick={() => navigate(item.path!)}
                  className="text-blue-600 hover:underline"
                >
                  {item.label}
                </button>
              ) : (
                <span className={index === breadcrumb.length - 1 ? "text-gray-800 font-medium" : ""}>{item.label}</span>
              )}
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 bg-white rounded-2xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3 flex-1">
          {title && !breadcrumb && (
            <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
          )}
          
          {onSearchChange && (
            <SearchInput
              value={searchValue || ""}
              onChange={onSearchChange}
              placeholder={searchPlaceholder}
              width="w-[340px]"
            />
          )}
          
          {filters}
          
          {statusPill && (
            <span className={`inline-flex items-center gap-2 rounded-full border px-3 h-9 text-sm ${
              statusColors[statusPill.color || 'gray']
            }`}>
              <span className="w-2 h-2 rounded-full bg-current" />
              {statusPill.label}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {secondaryActions?.map((action, index) => (
            <button
              key={index}
              onClick={action.onClick}
              className={`inline-flex items-center gap-2 rounded-md px-3 h-9 text-sm font-medium transition-colors ${
                actionVariants[action.variant || 'secondary']
              }`}
            >
              {action.icon}
              {action.label}
            </button>
          ))}
          
          {primaryAction && (
            <button
              onClick={primaryAction.onClick}
              className={`inline-flex items-center gap-2 rounded-md px-3 h-9 text-sm font-medium transition-colors ${
                actionVariants[primaryAction.variant || 'primary']
              }`}
            >
              {primaryAction.icon || <Icons.add size="sm" />}
              {primaryAction.label}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {children}
      </div>
    </div>
  );
};

export default PageLayout;
