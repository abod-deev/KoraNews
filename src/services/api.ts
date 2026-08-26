const API_URL = import.meta.env.VITE_API_URL || '';

export const fetchNews = async () => {
  try {
    const res = await fetch(`${API_URL}/api/news`);
    if (!res.ok) {
      console.warn('API /api/news returned status:', res.status);
      return [];
    }
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('fetchNews error:', error);
    return [];
  }
};

export const fetchNewsById = async (id: number) => {
  try {
    const res = await fetch(`${API_URL}/api/news/${id}`);
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error(`fetchNewsById error for id ${id}:`, error);
    return null;
  }
};

export const fetchCategories = async () => {
  try {
    const res = await fetch(`${API_URL}/api/categories`);
    if (!res.ok) {
      console.warn('API /api/categories returned status:', res.status);
      return [];
    }
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('fetchCategories error:', error);
    return [];
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
