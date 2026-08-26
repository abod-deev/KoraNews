import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

export default function TopProgressBar() {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setVisible(true);
    setProgress(15);

    const timer1 = setTimeout(() => setProgress(45), 100);
    const timer2 = setTimeout(() => setProgress(80), 300);
    const timer3 = setTimeout(() => {
      setProgress(100);
    }, 500);

    const hideTimer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => setProgress(0), 200); // reset after fade out
    }, 800);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(hideTimer);
    };
  }, [location.pathname, location.search]);

  if (!visible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none">
      <div
        className="h-1 bg-brand transition-all duration-300 ease-out shadow-[0_0_15px_#10b981]"
        style={{ 
          width: `${progress}%`,
          opacity: progress === 100 ? 0 : 1,
          transition: progress === 100 ? 'width 300ms ease-out, opacity 300ms ease-in 200ms' : 'width 300ms ease-out'
        }}
      />
    </div>
  );
}
