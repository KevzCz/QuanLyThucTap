import React, { useEffect } from "react";

interface ModalProps {
  open: boolean;
  title: string;
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className={`relative w-full ${widthClass ?? "max-w-2xl"}`}>
        <div className="rounded-2xl bg-white shadow-xl ring-1 ring-black/5 max-h-[calc(100vh-2rem)] flex flex-col">
          <div className="px-5 py-3 border-b bg-gray-50 flex-shrink-0">
            <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          </div>
          <div className="p-5 flex-1 min-h-0 overflow-y-auto">{children}</div>
          {actions && (
            <div className="px-5 py-3 bg-gray-50 border-t flex justify-end gap-2 flex-shrink-0">
              {actions}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Modal;
