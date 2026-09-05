import { create } from 'zustand';
import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastStore {
  toasts: Toast[];
  addToast: (type: ToastType, message: string) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (type, message) => {
    const id = Math.random().toString(36).slice(2, 9);
    set((state) => ({
      toasts: [...state.toasts, { id, type, message }],
    }));
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, 5000);
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));

const icons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle size={18} className="text-success-500" />,
  error: <XCircle size={18} className="text-danger-500" />,
  warning: <AlertTriangle size={18} className="text-warning-500" />,
  info: <Info size={18} className="text-primary-500" />,
};

const bgStyles: Record<ToastType, string> = {
  success: 'bg-success-50 border-success-200',
  error: 'bg-danger-50 border-danger-200',
  warning: 'bg-warning-50 border-warning-200',
  info: 'bg-primary-50 border-primary-200',
};

function ToastItem({ toast }: { toast: Toast }) {
  const { removeToast } = useToastStore();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 50, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 50, scale: 0.95 }}
      className={`flex items-start gap-3 p-4 rounded-lg border shadow-lg min-w-[300px] max-w-sm ${bgStyles[toast.type]}`}
    >
      <span className="shrink-0 mt-0.5">{icons[toast.type]}</span>
      <p className="flex-1 text-sm text-surface-800">{toast.message}</p>
      <button
        onClick={() => removeToast(toast.id)}
        className="shrink-0 text-surface-400 hover:text-surface-600"
      >
        <X size={16} />
      </button>
    </motion.div>
  );
}

export default function ToastContainer() {
  const { toasts } = useToastStore();

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2">
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} />
        ))}
      </AnimatePresence>
    </div>
  );
}
