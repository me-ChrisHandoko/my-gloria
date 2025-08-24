'use client';

import { useState, forwardRef } from 'react';
import Image, { ImageProps } from 'next/image';
import { cn } from '@/lib/utils';
import { ImageIcon, AlertCircle } from 'lucide-react';

interface OptimizedImageProps extends Omit<ImageProps, 'onError' | 'onLoad'> {
  fallback?: React.ReactNode;
  showFallbackIcon?: boolean;
  containerClassName?: string;
  loadingClassName?: string;
  errorClassName?: string;
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Optimized image component with loading states and error handling
 * Built on top of Next.js Image component for automatic optimization
 */
export const OptimizedImage = forwardRef<HTMLImageElement, OptimizedImageProps>(
  ({
    className,
    containerClassName,
    loadingClassName,
    errorClassName,
    fallback,
    showFallbackIcon = true,
    alt,
    onLoad,
    onError,
    ...props
  }, ref) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const handleLoad = () => {
      setLoading(false);
      setError(null);
      onLoad?.();
    };

    const handleError = (error: any) => {
      setLoading(false);
      const errorObj = new Error(`Failed to load image: ${props.src}`);
      setError(errorObj);
      onError?.(errorObj);
    };

    const LoadingFallback = () => (
      <div className={cn(
        "flex items-center justify-center bg-muted rounded-md",
        "animate-pulse",
        loadingClassName
      )}>
        <ImageIcon className="h-8 w-8 text-muted-foreground" />
      </div>
    );

    const ErrorFallback = () => {
      if (fallback) return <>{fallback}</>;

      return (
        <div className={cn(
          "flex flex-col items-center justify-center bg-muted rounded-md p-4",
          "text-muted-foreground",
          errorClassName
        )}>
          {showFallbackIcon && <AlertCircle className="h-8 w-8 mb-2" />}
          <span className="text-sm text-center">
            Failed to load image
          </span>
        </div>
      );
    };

    if (error) {
      return <ErrorFallback />;
    }

    return (
      <div className={cn("relative overflow-hidden", containerClassName)}>
        {loading && (
          <div className="absolute inset-0 z-10">
            <LoadingFallback />
          </div>
        )}
        
        <Image
          ref={ref}
          {...props}
          alt={alt}
          className={cn(
            "transition-opacity duration-300",
            loading ? "opacity-0" : "opacity-100",
            className
          )}
          onLoad={handleLoad}
          onError={handleError}
          // Optimize for better performance
          placeholder="blur"
          blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWEREiMxUf/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
        />
      </div>
    );
  }
);

OptimizedImage.displayName = 'OptimizedImage';

// Specialized image components for common use cases

interface AvatarImageProps extends Omit<OptimizedImageProps, 'width' | 'height'> {
  size?: number;
  name?: string;
}

export const AvatarImage = forwardRef<HTMLImageElement, AvatarImageProps>(
  ({ size = 40, name, className, alt, ...props }, ref) => {
    // Generate initials as fallback
    const initials = name
      ?.split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2) || '?';

    const fallback = (
      <div 
        className={cn(
          "flex items-center justify-center bg-primary text-primary-foreground font-medium rounded-full",
          className
        )}
        style={{ width: size, height: size }}
      >
        <span style={{ fontSize: size * 0.4 }}>{initials}</span>
      </div>
    );

    return (
      <OptimizedImage
        ref={ref}
        {...props}
        width={size}
        height={size}
        alt={alt || `${name || 'User'} avatar`}
        className={cn("rounded-full object-cover", className)}
        fallback={fallback}
        showFallbackIcon={false}
      />
    );
  }
);

AvatarImage.displayName = 'AvatarImage';

interface LogoImageProps extends Omit<OptimizedImageProps, 'alt'> {
  company?: string;
}

export const LogoImage = forwardRef<HTMLImageElement, LogoImageProps>(
  ({ company, className, ...props }, ref) => {
    return (
      <OptimizedImage
        ref={ref}
        {...props}
        alt={`${company || 'Company'} logo`}
        className={cn("object-contain", className)}
        priority // Logos are often above the fold
      />
    );
  }
);

LogoImage.displayName = 'LogoImage';

// Utility function for generating responsive image sizes
export function generateSrcSet(
  baseSrc: string,
  sizes: number[] = [640, 768, 1024, 1280, 1536]
): string {
  return sizes
    .map(size => `${baseSrc}?w=${size} ${size}w`)
    .join(', ');
}

// Common responsive sizes
export const responsiveSizes = {
  full: '100vw',
  half: '50vw',
  third: '33vw',
  quarter: '25vw',
  card: '(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw',
  hero: '(max-width: 768px) 100vw, (max-width: 1024px) 80vw, 60vw',
  thumbnail: '(max-width: 768px) 50vw, 25vw',
};