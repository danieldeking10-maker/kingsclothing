import { useState, useEffect } from 'react';

const STORAGE_KEY = 'recently_viewed_products';
const MAX_ITEMS = 10;

export function useRecentlyViewed() {
  const [recentIds, setRecentIds] = useState<string[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setRecentIds(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse recently viewed', e);
      }
    }
  }, []);

  const addProduct = (id: string) => {
    setRecentIds(prev => {
      const filtered = prev.filter(pId => pId !== id);
      const updated = [id, ...filtered].slice(0, MAX_ITEMS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const clearRecent = () => {
    localStorage.removeItem(STORAGE_KEY);
    setRecentIds([]);
  };

  return { recentIds, addProduct, clearRecent };
}
