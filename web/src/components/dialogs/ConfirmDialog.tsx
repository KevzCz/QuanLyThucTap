import React from 'react';
import Modal from '../../util/Modal';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'success' | 'primary';
  loading?: boolean;
  children?: React.ReactNode;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  message,
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Hủy',
  onConfirm,
  onCancel,
  variant = 'primary',
  loading = false,
  children
}) => {
  const variantStyles = {
    danger: 'bg-red-600 hover:bg-red-700',
    success: 'bg-green-600 hover:bg-green-700',
    primary: 'bg-blue-600 hover:bg-blue-700'
  };

  const actions = (
    <>
      <button
        onClick={onCancel}
        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        disabled={loading}
      >
        {cancelLabel}
      </button>
      <button
        onClick={onConfirm}
        className={`px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variantStyles[variant]}`}
        disabled={loading}
      >
        {loading ? 'Đang xử lý...' : confirmLabel}
      </button>
    </>
  );

  return (
    <Modal
      open={open}
      title={title}
      onClose={onCancel}
      widthClass="max-w-md"
      actions={actions}
    >
      <div className="space-y-4">
        <p className="text-gray-600">{message}</p>
        {children}
      </div>
    </Modal>
  );
};

export default ConfirmDialog;
