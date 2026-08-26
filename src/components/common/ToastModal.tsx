import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

interface ToastModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  type?: 'success' | 'error' | 'info';
}

export default function ToastModal({
  isOpen,
  onClose,
  title,
  message,
  type = 'success'
}: ToastModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 dir-rtl">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-gray-950/50 backdrop-blur-xs"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={{ type: "spring", duration: 0.3 }}
            className="relative w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 p-6 z-10 text-center"
          >
            <button
              onClick={onClose}
              className="absolute top-3 left-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col items-center">
              <div className={`p-4 rounded-2xl mb-3 ${
                type === 'success' 
                  ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400' 
                  : type === 'error'
                  ? 'bg-red-100 dark:bg-red-950/80 text-red-600 dark:text-red-400'
                  : 'bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400'
              }`}>
                {type === 'success' ? (
                  <CheckCircle2 className="w-8 h-8" />
                ) : type === 'error' ? (
                  <AlertCircle className="w-8 h-8" />
                ) : (
                  <Info className="w-8 h-8" />
                )}
              </div>

              {title && (
                <h3 className="text-lg font-black text-gray-900 dark:text-white mb-1">
                  {title}
                </h3>
              )}

              <p className="text-sm font-bold text-gray-700 dark:text-gray-300 leading-relaxed">
                {message}
              </p>

              <button
                type="button"
                onClick={onClose}
                className="mt-5 w-full bg-brand hover:bg-brand/90 text-white font-bold py-2.5 rounded-xl transition-all active:scale-95 text-sm"
              >
                حسناً
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
