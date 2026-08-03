import BreakingNews from '../components/home/BreakingNews';
import HeroSection from '../components/home/HeroSection';
import MatchesWidget from '../components/home/MatchesWidget';
import LatestNews from '../components/home/LatestNews';
import HomeSidebar from '../components/home/HomeSidebar';

export default function Home() {
  return (
    <div className="w-full animate-in fade-in duration-500">
      <BreakingNews />
      <HeroSection />
      <MatchesWidget />
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8">
          <LatestNews />
        </div>
        <div className="lg:col-span-4">
          <HomeSidebar />
        </div>
      </div>
    </div>
  );
}
