/**
 * Utility to prefetch assets or data for better perceived performance
 */

export const prefetchRoute = (path: string) => {
  // Simple heuristic: if it's a known page, we can try to hint the browser
  // or trigger lazy load early. 
  // In dynamic imports, we can use React.lazy's internal preload if we had a ref.
  // For now, we use standard link prefetch hints.
  
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = path; // This is naive as it needs the chunk name
  document.head.appendChild(link);
};

export const prefetchImage = (src: string) => {
  if (!src) return;
  const img = new Image();
  img.src = src;
};

export const usePagePrefetch = () => {
  const onHoverLink = (path: string) => {
    // We could trigger data fetching or asset loading here
    console.log(`[Performance] Prefetching ${path}...`);
  };

  return { onHoverLink };
};
