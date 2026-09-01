import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hoverEffect?: boolean;
}

export default function Card({ children, className = '', hoverEffect = false }: CardProps) {
  return (
    <div
      className={`bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs transition-all duration-200 ${
        hoverEffect ? 'hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 hover:-translate-y-0.5' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}
