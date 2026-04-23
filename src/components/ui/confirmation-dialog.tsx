'use client';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  isDangerous?: boolean;
  isLoading?: boolean;
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {children}
    </div>,
    document.body
  );
}

export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  isDangerous = true,
  isLoading = false,
}: ConfirmationDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal onClose={onClose}>
      <div className="bg-white rounded-lg shadow-lg w-96">
        <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-900 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {description && (
          <div className="p-4 border-b border-neutral-100">
            <p className="text-sm text-neutral-600">{description}</p>
          </div>
        )}

        <div className="p-4 flex gap-2 justify-end">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-100 rounded-md disabled:opacity-60 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className={cn(
              'px-4 py-2 text-sm rounded-md font-medium transition-colors disabled:opacity-60',
              isDangerous
                ? 'bg-destructive text-white hover:bg-red-600'
                : 'bg-accent text-white hover:bg-sky-600'
            )}
          >
            {loading ? `${confirmText}…` : confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}
