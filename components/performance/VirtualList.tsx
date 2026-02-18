'use client';

import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

interface VirtualListProps<T> {
  items: T[];
  height: number;
  estimateSize?: number;
  overscan?: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  emptyMessage?: string;
}

export function VirtualList<T>({
  items,
  height,
  estimateSize = 50,
  overscan = 5,
  renderItem,
  className = '',
  emptyMessage = 'No items to display',
}: VirtualListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
  });

  if (items.length === 0) {
    return (
      <div
        className={`flex items-center justify-center text-gray-500 ${className}`}
        style={{ height }}
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className={`overflow-auto ${className}`}
      style={{ height }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            {renderItem(items[virtualItem.index], virtualItem.index)}
          </div>
        ))}
      </div>
    </div>
  );
}
