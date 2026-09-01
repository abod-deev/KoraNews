import { Link } from 'react-router-dom';
import { Clock, Eye, Sparkles } from 'lucide-react';

interface NewsCardProps {
  article: any;
  key?: string | number;
}

export default function NewsCard({ article }: NewsCardProps) {
  const defaultImage = 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=600';
  const categoryName = article.category || 'أخبار الرياضة';
  const authorName = article.author?.name || 'محرر الرياضة';

  return (
    <Link 
      to={`/news/${article.id}`} 
      className="group flex flex-col bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800/80 overflow-hidden shadow-2xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full select-none"
    >
      <div className="relative h-40 sm:h-48 overflow-hidden shrink-0 bg-slate-100 dark:bg-slate-800">
        <img 
          loading="lazy" 
          src={article.image || defaultImage} 
          alt={article.title} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
          onError={(e) => {
            (e.target as HTMLImageElement).src = defaultImage;
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent opacity-80" />
        
        <span className="absolute top-3 right-3 bg-sky-600/90 backdrop-blur-md text-white text-[10px] sm:text-xs font-black px-2.5 py-1 rounded-xl shadow-xs border border-white/20 flex items-center gap-1">
          {article.isFeatured && <Sparkles className="w-3 h-3 text-amber-300 fill-current" />}
          <span>{categoryName}</span>
        </span>
      </div>
      
      <div className="p-3.5 sm:p-5 flex flex-col flex-1">
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
              src={article.author?.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=100'} 
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

