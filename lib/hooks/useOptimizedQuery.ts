'use client';

import { useQuery, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { useCallback } from 'react';

interface OptimizedQueryOptions<T> {
  queryKey: string[];
  queryFn: () => Promise<T>;
  staleTime?: number;
  cacheTime?: number;
  refetchOnWindowFocus?: boolean;
  enabled?: boolean;
}

export function useOptimizedQuery<T>(options: OptimizedQueryOptions<T>) {
  const {
    queryKey,
    queryFn,
    staleTime = 5 * 60 * 1000, // 5 minutes
    cacheTime = 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus = false,
    enabled = true,
  } = options;

  const queryOptions: UseQueryOptions<T, Error, T, string[]> = {
    queryKey,
    queryFn,
    staleTime,
    gcTime: cacheTime,
    refetchOnWindowFocus,
    enabled,
  };

  return useQuery(queryOptions);
}

export function usePrefetch() {
  const queryClient = useQueryClient();

  const prefetch = useCallback(
    <T>(queryKey: string[], queryFn: () => Promise<T>, staleTime: number = 5 * 60 * 1000) => {
      queryClient.prefetchQuery({
        queryKey,
        queryFn,
        staleTime,
      });
    },
    [queryClient]
  );

  const invalidate = useCallback(
    (queryKey: string[]) => {
      queryClient.invalidateQueries({ queryKey });
    },
    [queryClient]
  );

  return { prefetch, invalidate };
}

// Fetch helper for API routes
export async function fetchAPI<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}
