import BreakingNews from '../components/home/BreakingNews';
import HeroSection from '../components/home/HeroSection';
import MatchesWidget from '../components/home/MatchesWidget';
import LatestNews from '../components/home/LatestNews';
import PredictionsWidget from '../components/home/PredictionsWidget';
import HomeSidebar from '../components/home/HomeSidebar';
import { useSEO } from '../hooks/useSEO';

export default function Home() {
  useSEO('الرئيسية | KoraNews', 'موقع كورة نيوز - تغطية شاملة ومباشرة لأحدث الأخبار الرياضية، جدول المباريات اليومية، نتائج الدوريات العالمية وتوقعات المباريات.');

  return (
    <div className="w-full animate-in fade-in duration-500 space-y-4 sm:space-y-6 max-w-full pb-6">
      {/* 1. Featured News (Hero Section) */}
      <HeroSection />

      {/* 2. Breaking News Ticker */}
      <BreakingNews />

      {/* 3. Live & Upcoming Matches Widget */}
      <MatchesWidget />

      {/* 4. Main Grid: Latest News + Predictions Widget + Home Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-7 items-start">
        <div className="lg:col-span-8 space-y-6">
          {/* Latest News Cards */}
          <LatestNews />

          {/* Predictions Contest Section */}
          <PredictionsWidget />
        </div>

        <div className="lg:col-span-4 space-y-6">
          {/* Home Sidebar (Most Read + League Standings) */}
          <HomeSidebar />
        </div>
      </div>
    </div>
  );
}

