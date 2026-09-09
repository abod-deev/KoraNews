import { cachedFetch, invalidateClientCache, getSyncCached } from '../utils/apiCache';

const API_URL = import.meta.env.VITE_API_URL || '';

export const FALLBACK_CATEGORIES = [
  { id: 8, name: 'أخبار عاجلة', slug: 'breaking-news' },
  { id: 1, name: 'كرة قدم عالمية', slug: 'world-football' },
  { id: 2, name: 'كرة قدم محلية', slug: 'local-football' },
  { id: 5, name: 'دوري روشن السعودي', slug: 'saudi-pro-league' },
  { id: 6, name: 'دوري أبطال أوروبا', slug: 'champions-league' },
  { id: 4, name: 'الدوريات الأوروبية', slug: 'european-leagues' },
  { id: 3, name: 'الانتقالات والشائعات', slug: 'transfers' },
  { id: 7, name: 'تحليلات وتكتيك', slug: 'tactics-and-analysis' },
];

export const getCachedNewsSync = (): any[] | undefined => {
  return getSyncCached<any[]>('news_list', 60000);
};

export const fetchNews = async (options?: { forceFresh?: boolean; onBackgroundUpdate?: (data: any[]) => void }) => {
  try {
    return await cachedFetch<any[]>(
      'news_list',
      async () => {
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const res = await fetch(`${API_URL}/api/news`);
            if (!res.ok) {
              console.warn('API /api/news returned status:', res.status);
              return [];
            }
            const data = await res.json();
            return Array.isArray(data) ? data : [];
          } catch (err) {
            if (attempt === 0) {
              await new Promise((r) => setTimeout(r, 600));
              continue;
            }
            throw err;
          }
        }
        return [];
      },
      {
        ttlMs: 45000,
        forceFresh: options?.forceFresh,
        onBackgroundUpdate: options?.onBackgroundUpdate,
      }
    );
  } catch (error) {
    console.warn('fetchNews network notice:', (error as any)?.message || error);
    return [];
  }
};

export const fetchNewsById = async (id: number, forceFresh: boolean = false) => {
  try {
    return await cachedFetch<any>(
      `news_detail_${id}`,
      async () => {
        const res = await fetch(`${API_URL}/api/news/${id}`);
        if (!res.ok) return null;
        return await res.json();
      },
      { ttlMs: 60000, forceFresh }
    );
  } catch (error) {
    console.warn(`fetchNewsById notice for id ${id}:`, (error as any)?.message || error);
    return null;
  }
};

export const fetchCategories = async () => {
  try {
    return await cachedFetch<any[]>(
      'categories_list',
      async () => {
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const res = await fetch(`${API_URL}/api/categories`);
            if (!res.ok) {
              console.warn('API /api/categories returned status:', res.status);
              return FALLBACK_CATEGORIES;
            }
            const data = await res.json();
            return Array.isArray(data) && data.length > 0 ? data : FALLBACK_CATEGORIES;
          } catch (err) {
            if (attempt === 0) {
              await new Promise((r) => setTimeout(r, 600));
              continue;
            }
            throw err;
          }
        }
        return FALLBACK_CATEGORIES;
      },
      { ttlMs: 120000 }
    );
  } catch (error) {
    console.warn('fetchCategories notice:', (error as any)?.message || error);
    return FALLBACK_CATEGORIES;
  }
};

export const createNews = async (data: any, token: string) => {
  const res = await fetch(`${API_URL}/api/news`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(errText || 'فشل إضافة الخبر');
  }
  invalidateClientCache('news');
  return res.json();
};

export const updateNews = async (id: number, data: any, token: string) => {
  const res = await fetch(`${API_URL}/api/news/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(errText || 'فشل تعديل الخبر');
  }
  invalidateClientCache('news');
  return res.json();
};

export const deleteNews = async (id: number, token: string) => {
  const res = await fetch(`${API_URL}/api/news/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(errText || 'فشل حذف الخبر');
  }
  invalidateClientCache('news');
};

export const createCategory = async (data: { name: string; slug: string }, token: string) => {
  const res = await fetch(`${API_URL}/api/categories`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(errText || 'فشل إضافة التصنيف');
  }
  invalidateClientCache('categories');
  return res.json();
};

export const addComment = async (newsId: number, content: string, token: string) => {
  const res = await fetch(`${API_URL}/api/news/${newsId}/comments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(errText || 'فشل إضافة التعليق');
  }
  return res.json();
};
