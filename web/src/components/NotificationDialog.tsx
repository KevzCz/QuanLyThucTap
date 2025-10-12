import React, { useState } from "react";
import Modal from "../util/Modal";

interface Props {
  open: boolean;
  onClose: () => void;
  type: "success" | "error";
  title: string;
  message: string;
  details?: string;
}

const NotificationDialog: React.FC<Props> = ({ open, onClose, type, title, message, details }) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopyError = () => {
    if (details) {
      navigator.clipboard.writeText(details);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      widthClass="max-w-lg"
      actions={
        <div className="flex gap-3">
          {type === "error" && details && (
            <button
              onClick={handleCopyError}
              className={`h-10 px-4 rounded-md border font-medium transition-colors ${
                isCopied 
                  ? "border-green-300 text-green-700 bg-green-50" 
                  : "border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              {isCopied ? "Copied!" : "Copy Error"}
            </button>
          )}
          <button
            onClick={onClose}
            className={`h-10 px-4 rounded-md text-white font-medium ${
              type === "success" 
                ? "bg-green-600 hover:bg-green-700" 
                : "bg-red-600 hover:bg-red-700"
            }`}
          >
            OK
          </button>
        </div>
      }
    >
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
            type === "success" ? "bg-green-100" : "bg-red-100"
          }`}>
            {type === "success" ? (
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-green-600">
                <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19L21 7l-1.41-1.41z"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-red-600">
                <path fill="currentColor" d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12z"/>
              </svg>
            )}
          </div>
          <div className="flex-1">
            <p className="text-sm text-gray-700">{message}</p>
          </div>
        </div>
        
        {details && type === "error" && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <div className="text-xs font-medium text-gray-700 mb-1">Error Details:</div>
            <pre className="text-xs text-gray-600 whitespace-pre-wrap break-all">{details}</pre>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default NotificationDialog;
