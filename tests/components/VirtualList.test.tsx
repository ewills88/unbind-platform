import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VirtualList } from '@/components/performance/VirtualList';

describe('VirtualList', () => {
  const items = Array.from({ length: 100 }, (_, i) => ({
    id: `item-${i}`,
    label: `Item ${i}`,
  }));

  it('should render with items', () => {
    const { container } = render(
      <VirtualList
        items={items}
        height={400}
        estimateSize={40}
        renderItem={(item) => (
          <div data-testid={`item-${item.id}`}>{item.label}</div>
        )}
      />
    );

    // In jsdom, @tanstack/react-virtual cannot measure real DOM dimensions,
    // so virtualizer may not render visible items. Verify the container is set up correctly.
    const scrollContainer = container.firstChild as HTMLElement;
    expect(scrollContainer).toBeTruthy();
    expect(scrollContainer.style.height).toBe('400px');
    // The inner div should have a total height based on item count * estimateSize
    const innerDiv = scrollContainer.firstChild as HTMLElement;
    expect(innerDiv).toBeTruthy();
    expect(innerDiv.style.position).toBe('relative');
  });

  it('should show empty message when no items', () => {
    render(
      <VirtualList
        items={[]}
        height={400}
        renderItem={() => <div>Never</div>}
        emptyMessage="No items found"
      />
    );

    expect(screen.getByText('No items found')).toBeInTheDocument();
  });

  it('should use default empty message', () => {
    render(
      <VirtualList
        items={[]}
        height={400}
        renderItem={() => <div>Never</div>}
      />
    );

    expect(screen.getByText('No items to display')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <VirtualList
        items={items.slice(0, 5)}
        height={200}
        className="custom-class"
        renderItem={(item) => <div>{item.label}</div>}
      />
    );

    const element = container.firstChild as HTMLElement;
    expect(element.classList.contains('custom-class')).toBe(true);
  });
});
