const API_URL = import.meta.env.VITE_API_URL || '';

export const fetchNews = async () => {
  const res = await fetch(`${API_URL}/api/news`);
  if (!res.ok) throw new Error('Failed to fetch news');
  return res.json();
};

export const fetchNewsById = async (id: number) => {
  const res = await fetch(`${API_URL}/api/news/${id}`);
  if (!res.ok) throw new Error('Failed to fetch news details');
  return res.json();
};

export const fetchCategories = async () => {
  const res = await fetch(`${API_URL}/api/categories`);
  if (!res.ok) throw new Error('Failed to fetch categories');
  return res.json();
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
  if (!res.ok) throw new Error('Failed to create news');
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
  if (!res.ok) throw new Error('Failed to update news');
  return res.json();
};

export const deleteNews = async (id: number, token: string) => {
  const res = await fetch(`${API_URL}/api/news/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error('Failed to delete news');
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
  if (!res.ok) throw new Error('Failed to create category');
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
  if (!res.ok) throw new Error('Failed to add comment');
  return res.json();
};
