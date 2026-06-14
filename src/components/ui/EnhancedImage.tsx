import React, { useState } from 'react';
import { motion, AnimatePresence, HTMLMotionProps } from 'motion/react';
import { cn } from '@/src/lib/utils';

interface EnhancedImageProps extends HTMLMotionProps<"img"> {
  aspectRatio?: string;
}

export function EnhancedImage({ className, src, alt, aspectRatio = "aspect-[4/5]", ...props }: EnhancedImageProps) {
  const [prevSrc, setPrevSrc] = useState(src);
  const [isLoaded, setIsLoaded] = useState(() => {
    if (!src) return false;
    const img = new Image();
    img.src = src;
    return img.complete;
  });

  if (src !== prevSrc) {
    setPrevSrc(src);
    const img = new Image();
    img.src = src;
    setIsLoaded(img.complete);
  }

  // Filter out internal motion props to merge with external ones
  const { 
    initial: extInitial, 
    animate: extAnimate, 
    transition: extTransition, 
    onLoad: extOnLoad,
    ...restProps 
  } = props;

  // Merge external active animate properties with our default opacity & blur
  const activeAnimate = isLoaded 
    ? {
        opacity: 1,
        filter: 'blur(0px)',
        scale: 1,
        ...(typeof extAnimate === 'object' ? extAnimate : {}),
      }
    : {
        opacity: 0,
        filter: 'blur(20px)',
        scale: 1.05,
      };

  return (
    <div className={cn("relative overflow-hidden bg-white/5", aspectRatio, className)}>
      <AnimatePresence>
        {!isLoaded && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer"
            style={{ backgroundSize: '200% 100%' }}
          />
        )}
      </AnimatePresence>
      <motion.img
        src={src}
        alt={alt}
        initial={extInitial || { opacity: 0, scale: 1.05, filter: 'blur(20px)' }}
        animate={activeAnimate}
        transition={extTransition || { duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        onLoad={(e) => {
          setIsLoaded(true);
          if (extOnLoad) (extOnLoad as any)(e);
        }}
        className={cn("w-full h-full object-cover", className)}
        decoding="async"
        loading="lazy"
        {...restProps}
      />
    </div>
  );
}
