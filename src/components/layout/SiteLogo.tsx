import React from 'react';

interface SiteLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export default function SiteLogo({ size = 'md', showText = true, className = '' }: SiteLogoProps) {
  const containerSizes = {
    sm: 'h-8 sm:h-9',
    md: 'h-9 sm:h-11',
    lg: 'h-12 sm:h-14',
  };

  const imgSizes = {
    sm: 'w-8 h-8 sm:w-9 sm:h-9',
    md: 'w-10 h-10 sm:w-11 sm:h-11',
    lg: 'w-14 h-14 sm:w-16 sm:h-16',
  };

  const textSize = {
    sm: 'text-sm sm:text-base',
    md: 'text-base sm:text-lg lg:text-xl',
    lg: 'text-xl sm:text-2xl',
  };

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Official Site Logo Image (With world map, megaphone, blue typography - NO BALL) */}
      <img loading="lazy"
        src="/site-logo.jpg"
        alt="أخبار كرة القدم العالمية"
        referrerPolicy="no-referrer"
        className={`${imgSizes[size]} object-cover rounded-xl shadow-md shadow-sky-600/20 border border-sky-500/30 hover:scale-105 transition-transform duration-200 shrink-0`}
      />

      {/* Brand Text */}
      {showText && (
        <div className="flex flex-col leading-tight">
          <span className={`${textSize[size]} font-black tracking-tight text-gray-900 dark:text-white font-sans flex items-center gap-1.5`}>
            <span className="text-sky-600 dark:text-sky-400">أخبار</span>
            <span className="text-gray-900 dark:text-white">كرة القدم</span>
            <span className="text-sky-500 dark:text-sky-400">العالمية</span>
          </span>
        </div>
      )}
    </div>
  );
}
