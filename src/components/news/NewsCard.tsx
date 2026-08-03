import { Link } from 'react-router-dom';
import { Clock, Eye } from 'lucide-react';

interface NewsCardProps {
  article: any;
}

export default function NewsCard({ article }: NewsCardProps) {
  return (
    <Link to={`/news/${article.id}`} className="group flex flex-col bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm hover:shadow-md transition-all h-full">
      <div className="relative h-48 sm:h-56 overflow-hidden shrink-0">
        <img loading="lazy" 
          src={article.image || 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&q=80&w=600'} 
          alt={article.title} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950/20 to-transparent"></div>
        <span className="absolute top-4 right-4 bg-brand text-white text-xs font-bold px-2.5 py-1 rounded-md shadow-lg">
          {article.category?.name || 'أخبار'}
        </span>
      </div>
      <div className="p-5 flex flex-col flex-1">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 group-hover:text-brand transition-colors line-clamp-2 leading-snug">
          {article.title}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5 line-clamp-2 leading-relaxed">
          {article.excerpt}
        </p>
        <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img loading="lazy" src={article.author?.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=100'} alt={article.author?.name || 'كاتب'} className="w-7 h-7 rounded-full object-cover border border-gray-100 dark:border-gray-700" />
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{article.author?.name || 'محرر'}</span>
          </div>
          <div className="flex items-center gap-3.5 text-xs text-gray-400 font-semibold">
            <div className="flex items-center gap-1.5"><Clock className="w-4 h-4" />{new Date(article.createdAt).toLocaleDateString('ar-EG')}</div>
            <div className="flex items-center gap-1.5"><Eye className="w-4 h-4" />{article.views}</div>
          </div>
        </div>
      </div>
    </Link>
  );
}
