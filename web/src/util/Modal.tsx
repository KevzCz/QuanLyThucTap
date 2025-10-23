import React, { useEffect } from "react";

interface ModalProps {
  open: boolean;
  title: string | React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  actions?: React.ReactNode;
  widthClass?: string; // e.g. "max-w-2xl"
}

const Modal: React.FC<ModalProps> = ({ open, title, onClose, children, actions, widthClass }) => {
  useEffect(() => {
    if (!open) return;

    // Save current scroll position
    const scrollY = window.scrollY || document.documentElement.scrollTop;

    // Compute scrollbar width (innerWidth includes, clientWidth excludes)
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    // Save current inline styles so we can restore
    const prevStyle = {
      position: document.body.style.position,
      top: document.body.style.top,
      left: document.body.style.left,
      right: document.body.style.right,
      width: document.body.style.width,
      paddingRight: document.body.style.paddingRight,
      overflow: document.body.style.overflow,
    };

    // Lock the body without causing layout shift
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      // preserve the gap where the scrollbar was
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      // Restore styles
      document.body.style.position = prevStyle.position;
      document.body.style.top = prevStyle.top;
      document.body.style.left = prevStyle.left;
      document.body.style.right = prevStyle.right;
      document.body.style.width = prevStyle.width;
      document.body.style.paddingRight = prevStyle.paddingRight;
      document.body.style.overflow = prevStyle.overflow;

      // Restore scroll position
      const y = parseInt((prevStyle.top || "0").replace("-", "")) || scrollY;
      window.scrollTo(0, y);
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
      {/* Enhanced backdrop with blur effect */}
      <div 
        className="absolute inset-0 bg-gradient-to-br from-gray-900/60 via-gray-900/50 to-gray-900/60 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      {/* Modal container with slide-up animation */}
      <div className={`relative w-full ${widthClass ?? "max-w-2xl"} animate-in slide-in-from-bottom-4 duration-300`}>
        <div className="rounded-2xl bg-white shadow-2xl ring-1 ring-gray-900/10 max-h-[calc(100vh-2rem)] flex flex-col overflow-hidden">
          {/* Enhanced header with gradient and close button */}
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-white to-gray-50 flex-shrink-0">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                {title}
              </h3>
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                aria-label="Close dialog"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          
          {/* Content area with custom scrollbar */}
          <div className="p-6 flex-1 min-h-0 overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-gray-400">
            {children}
          </div>
          
          {/* Enhanced footer with better spacing */}
          {actions && (
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3 flex-shrink-0">
              {actions}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Modal;
