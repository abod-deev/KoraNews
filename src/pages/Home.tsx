import BreakingNews from '../components/home/BreakingNews';
import HeroSection from '../components/home/HeroSection';
import MatchesWidget from '../components/home/MatchesWidget';
import LatestNews from '../components/home/LatestNews';
import HomeSidebar from '../components/home/HomeSidebar';

export default function Home() {
  return (
    <div className="w-full animate-in fade-in duration-500 space-y-4 sm:space-y-7 max-w-full">
      {/* 1. أهم الأخبار (Featured Hero) */}
      <HeroSection />

      {/* 2. الأخبار العاجلة إن وجدت */}
      <BreakingNews />

      {/* 3. مباريات اليوم والنتائج المباشرة */}
      <MatchesWidget />
      
      {/* 4. آخر الأخبار + 5. باقي الأقسام */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-8">
        <div className="lg:col-span-8 space-y-5">
          <LatestNews />
        </div>
        <div className="lg:col-span-4 space-y-5">
          <HomeSidebar />
        </div>
      </div>
    </div>
  );
}
