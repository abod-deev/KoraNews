import React from 'react';

export type BadgeVariant = 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'error' | 'outline';
export type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: React.ReactNode;
  className?: string;
}

export default function Badge({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  className = '',
}: BadgeProps) {
  const variantClasses: Record<BadgeVariant, string> = {
    primary: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20',
    secondary: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20',
    accent: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
    success: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
    warning: 'bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/30',
    error: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20',
    outline: 'bg-transparent text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800',
  };

  const sizeClasses: Record<BadgeSize, string> = {
    sm: 'px-2 py-0.5 text-[10px] gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5',
    lg: 'px-3 py-1.5 text-sm gap-2',
  };

  return (
    <span
      className={`inline-flex items-center font-extrabold rounded-lg border leading-none transition-all ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
}
