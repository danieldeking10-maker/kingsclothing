import { useEffect, useRef, useCallback } from 'react';

// Keep a global cache (Set of strings) to avoid redundant image preloading in the same session
const preloadedUrls = new Set<string>();

export interface PreloadOptions {
  hoverDwellMs?: number; // Time in ms before we consider hover a strong signal (default: 80ms)
}

export function useProductPreloader(options: PreloadOptions = {}) {
  const { hoverDwellMs = 80 } = options;
  const hoverTimers = useRef<Record<string, NodeJS.Timeout>>({});

  // Core preloader function for a single URL
  const preloadImage = useCallback((url: string) => {
    if (!url || preloadedUrls.has(url)) return;

    preloadedUrls.add(url);
    
    // Create preloading image object in background
    const img = new Image();
    img.src = url;
  }, []);

  // Preloads all key images for a product blueprint (primary mockup + color variant images)
  const preloadProduct = useCallback((product: any) => {
    if (!product) return;

    const urlsToPreload: string[] = [];

    // 1. Primary mock-up
    if (product.mockupImage) {
      urlsToPreload.push(product.mockupImage);
    }

    // 2. All color variant images
    if (product.colorImages && typeof product.colorImages === 'object') {
      Object.values(product.colorImages).forEach((imgUrl: any) => {
        if (typeof imgUrl === 'string' && imgUrl) {
          urlsToPreload.push(imgUrl);
        }
      });
    }

    // Preload them
    urlsToPreload.forEach(preloadImage);
  }, [preloadImage]);

  // Clean up any active timers on unmount
  useEffect(() => {
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      Object.values(hoverTimers.current).forEach(clearTimeout);
    };
  }, []);

  // Returns event handlers to attach to elements (like link, button, card) for hover-intent preloading
  const getPreloadHandlers = useCallback((product: any) => {
    if (!product || !product.id) return {};

    const productId = product.id;

    const onMouseEnter = () => {
      // Cancel previous timer for this product if any
      if (hoverTimers.current[productId]) {
        clearTimeout(hoverTimers.current[productId]);
      }

      // Establish a small delay to filter out accidental pointer passes (dwell intent threshold)
      hoverTimers.current[productId] = setTimeout(() => {
        preloadProduct(product);
        delete hoverTimers.current[productId];
      }, hoverDwellMs);
    };

    const onMouseLeave = () => {
      if (hoverTimers.current[productId]) {
        clearTimeout(hoverTimers.current[productId]);
        delete hoverTimers.current[productId];
      }
    };

    const onFocus = () => {
      // Immediate preloading on keyboard focus for peak accessibility
      preloadProduct(product);
    };

    return {
      onMouseEnter,
      onMouseLeave,
      onFocus,
    };
  }, [preloadProduct, hoverDwellMs]);

  // Intersection Observer hook helper to preload images as cards scroll near viewport
  const attachIntersectionPreloader = useCallback((element: HTMLElement | null, product: any) => {
    if (!element || !product || typeof IntersectionObserver === 'undefined') return () => {};

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          preloadProduct(product);
          observer.unobserve(entry.target);
        }
      });
    }, {
      rootMargin: '120px', // preload when product is near the viewport
      threshold: 0.1
    });

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [preloadProduct]);

  return {
    preloadImage,
    preloadProduct,
    getPreloadHandlers,
    attachIntersectionPreloader,
    preloadedCount: preloadedUrls.size
  };
}
