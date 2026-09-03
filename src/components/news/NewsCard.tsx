import { Link } from 'react-router-dom';
import { Clock, Eye, Sparkles } from 'lucide-react';

interface NewsCardProps {
  article: any;
  key?: string | number;
}

export default function NewsCard({ article }: NewsCardProps) {
  const defaultImage = 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=600';
  const categoryName = typeof article?.category === 'object' && article?.category !== null
    ? (article.category.name || 'أخبار الرياضة')
    : (article?.category || article?.categoryName || 'أخبار الرياضة');
  const authorName = typeof article?.author === 'object' && article?.author !== null
    ? (article.author.name || 'محرر الرياضة')
    : (typeof article?.author === 'string' ? article.author : (article?.authorName || 'محرر الرياضة'));
  const authorAvatar = (typeof article?.author === 'object' && article?.author !== null && article.author.avatar)
    ? article.author.avatar
    : (typeof article?.authorAvatar === 'string' ? article.authorAvatar : 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=100');

  return (
    <Link 
      to={`/news/${article.id}`} 
      className="group flex flex-col bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800/80 overflow-hidden shadow-2xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full select-none"
    >
      <div className="relative w-full aspect-[16/9] overflow-hidden shrink-0 bg-slate-950 flex items-center justify-center">
        {/* Ambient backdrop */}
        <img 
          src={article.image || defaultImage} 
          alt="" 
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover blur-md opacity-40 scale-110 pointer-events-none" 
        />
        {/* Full unclipped image */}
        <img 
          loading="lazy" 
          src={article.image || defaultImage} 
          alt={article.title} 
          className="relative z-1 max-w-full max-h-full w-auto h-full object-contain group-hover:scale-105 transition-transform duration-500" 
          onError={(e) => {
            (e.target as HTMLImageElement).src = defaultImage;
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent opacity-80 pointer-events-none z-2" />
        
        <span className="absolute top-2.5 right-2.5 bg-sky-600/90 backdrop-blur-md text-white text-[10px] sm:text-xs font-black px-2 py-0.5 rounded-lg shadow-xs border border-white/20 flex items-center gap-1 z-10">
          {article.isFeatured && <Sparkles className="w-3 h-3 text-amber-300 fill-current" />}
          <span>{categoryName}</span>
        </span>
      </div>
      
      <div className="p-3 sm:p-5 flex flex-col flex-1">
        <h3 className="text-xs sm:text-base font-extrabold text-slate-900 dark:text-slate-100 mb-2.5 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors line-clamp-2 leading-snug">
          {article.title}
        </h3>

        {article.summary && (
          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 font-medium mb-3 leading-relaxed hidden sm:block">
            {article.summary}
          </p>
        )}

        <div className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <img 
              loading="lazy" 
              src={authorAvatar} 
              alt={authorName} 
              className="w-5 h-5 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0" 
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=100';
              }}
            />
            <span className="text-[10px] sm:text-xs font-bold text-slate-700 dark:text-slate-300 truncate max-w-[85px] sm:max-w-[120px]">
              {authorName}
            </span>
          </div>

          <div className="flex items-center gap-2.5 text-[10px] sm:text-xs text-slate-400 font-bold shrink-0">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-sky-500" />
              <span>{new Date(article.createdAt || Date.now()).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' })}</span>
            </div>
            {article.views !== undefined && (
              <div className="flex items-center gap-1">
                <Eye className="w-3 h-3 text-slate-400" />
                <span>{article.views}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

