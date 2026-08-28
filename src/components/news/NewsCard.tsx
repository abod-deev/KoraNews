import { Link } from 'react-router-dom';
import { Clock, Eye } from 'lucide-react';

interface NewsCardProps {
  article: any;
}

export default function NewsCard({ article }: NewsCardProps) {
  return (
    <Link to={`/news/${article.id}`} className="group flex flex-col bg-white dark:bg-gray-900 rounded-2xl sm:rounded-3xl border border-gray-100 dark:border-gray-800/60 overflow-hidden shadow-2xs hover:shadow-lg transition-all duration-300 h-full">
      {article.image && (
        <div className="relative h-32 sm:h-48 overflow-hidden shrink-0 bg-gray-100 dark:bg-gray-800">
          <img 
            loading="lazy" 
            src={article.image} 
            alt={article.title} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-950/20 to-transparent"></div>
        </div>
      )}
      
      <div className="p-3 sm:p-4 flex flex-col flex-1">
        <h3 className="text-xs sm:text-base font-bold text-gray-900 dark:text-white mb-2 group-hover:text-brand transition-colors line-clamp-2 leading-snug">
          {article.title}
        </h3>

        <div className="mt-auto pt-2 sm:pt-2.5 border-t border-gray-100 dark:border-gray-800/80 flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <img 
              loading="lazy" 
              src={article.author?.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=100'} 
              alt={article.author?.name || 'كاتب'} 
              className="w-5 h-5 rounded-full object-cover border border-gray-100 dark:border-gray-700 shrink-0" 
            />
            <span className="text-[10px] sm:text-xs font-bold text-gray-700 dark:text-gray-300 truncate max-w-[85px] sm:max-w-[120px]">
              {article.author?.name || 'محرر'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[10px] sm:text-xs text-gray-400 font-medium shrink-0">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{new Date(article.createdAt || Date.now()).toLocaleDateString('ar-EG')}</span>
            </div>
            <div className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              <span>{article.views || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
