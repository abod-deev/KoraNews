import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
            <RefreshCw className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white mb-2">حدث خطأ أثناء تحميل الصفحة</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 max-w-sm">
            نعتذر، لم نتمكن من تحميل المحتوى المطلوب. يرجى المحاولة مرة أخرى.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-md active:scale-95"
          >
            <RefreshCw className="w-4 h-4" />
            <span>إعادة المحاولة</span>
          </button>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

export default ErrorBoundary;
