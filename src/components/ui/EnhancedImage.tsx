import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';

interface EnhancedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  aspectRatio?: string;
}

export function EnhancedImage({ className, src, alt, aspectRatio = "aspect-[4/5]", ...props }: EnhancedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  // Filter out any props that might conflict with motion
  const { onAnimationStart, ...imgProps } = props as any;

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
        initial={{ opacity: 0, scale: 1.05, filter: 'blur(20px)' }}
        animate={{ 
          opacity: isLoaded ? 1 : 0,
          scale: isLoaded ? 1 : 1.05,
          filter: isLoaded ? 'blur(0px)' : 'blur(20px)'
        }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        onLoad={() => setIsLoaded(true)}
        className={cn("w-full h-full object-cover", className)}
        decoding="async"
        loading="lazy"
        {...imgProps}
      />
    </div>
  );
}
