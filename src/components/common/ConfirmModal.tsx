import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X, Trash2, Info } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'تأكيد',
  cancelText = 'إلغاء',
  variant = 'danger',
  isLoading = false
}: ConfirmModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 dir-rtl">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={isLoading ? undefined : onClose}
            className="fixed inset-0 bg-gray-950/60 backdrop-blur-xs"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 10 }}
            transition={{ type: "spring", duration: 0.3 }}
            className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 p-6 z-10 overflow-hidden"
          >
            <button
              onClick={onClose}
              disabled={isLoading}
              className="absolute top-4 left-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-start gap-4 mb-2">
              <div className={`p-3.5 rounded-2xl shrink-0 ${
                variant === 'danger' 
                  ? 'bg-red-100 dark:bg-red-950/80 text-red-600 dark:text-red-400' 
                  : variant === 'warning'
                  ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400'
                  : 'bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400'
              }`}>
                {variant === 'danger' ? (
                  <Trash2 className="w-6 h-6" />
                ) : variant === 'warning' ? (
                  <AlertTriangle className="w-6 h-6" />
                ) : (
                  <Info className="w-6 h-6" />
                )}
              </div>

              <div className="pt-1">
                <h3 className="text-lg font-black text-gray-900 dark:text-white leading-tight">
                  {title}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5 leading-relaxed font-medium">
                  {message}
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="px-4 py-2.5 rounded-xl font-bold text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                {cancelText}
              </button>

              <button
                type="button"
                onClick={onConfirm}
                disabled={isLoading}
                className={`px-5 py-2.5 rounded-xl font-bold text-sm text-white flex items-center gap-2 shadow-sm transition-all active:scale-95 disabled:opacity-50 ${
                  variant === 'danger'
                    ? 'bg-red-600 hover:bg-red-700 focus:ring-2 focus:ring-red-500'
                    : variant === 'warning'
                    ? 'bg-amber-500 hover:bg-amber-600 focus:ring-2 focus:ring-amber-400'
                    : 'bg-brand hover:bg-brand/90 focus:ring-2 focus:ring-brand'
                }`}
              >
                {isLoading && (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                )}
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
