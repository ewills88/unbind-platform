'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface UseInfiniteScrollOptions {
  threshold?: number;
  rootMargin?: string;
  enabled?: boolean;
}

interface UseInfiniteScrollResult {
  sentinelRef: React.RefObject<HTMLDivElement | null>;
  isIntersecting: boolean;
}

export function useInfiniteScroll(
  onLoadMore: () => void,
  options: UseInfiniteScrollOptions = {}
): UseInfiniteScrollResult {
  const { threshold = 0.1, rootMargin = '100px', enabled = true } = options;
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [isIntersecting, setIsIntersecting] = useState(false);

  const handleIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const entry = entries[0];
      setIsIntersecting(entry.isIntersecting);
      if (entry.isIntersecting && enabled) {
        onLoadMore();
      }
    },
    [onLoadMore, enabled]
  );

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !enabled) return;

    const observer = new IntersectionObserver(handleIntersect, {
      threshold,
      rootMargin,
    });

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [handleIntersect, threshold, rootMargin, enabled]);

  return { sentinelRef, isIntersecting };
}

interface UsePaginationOptions {
  initialPage?: number;
  pageSize?: number;
}

interface UsePaginationResult {
  page: number;
  pageSize: number;
  setPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  offset: number;
}

export function usePagination(options: UsePaginationOptions = {}): UsePaginationResult {
  const { initialPage = 1, pageSize = 20 } = options;
  const [page, setPage] = useState(initialPage);

  const nextPage = useCallback(() => setPage((p) => p + 1), []);
  const prevPage = useCallback(() => setPage((p) => Math.max(1, p - 1)), []);

  return {
    page,
    pageSize,
    setPage,
    nextPage,
    prevPage,
    offset: (page - 1) * pageSize,
  };
}
