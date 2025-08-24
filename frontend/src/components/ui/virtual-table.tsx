'use client';

import { useMemo, forwardRef } from 'react';
import { useFixedVirtualScroll } from '@/hooks/useVirtualScroll';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface Column<T> {
  key: keyof T | string;
  header: string;
  width?: number;
  render?: (item: T, index: number) => React.ReactNode;
  className?: string;
}

interface VirtualTableProps<T> {
  data: T[];
  columns: Column<T>[];
  itemHeight?: number;
  height?: number;
  className?: string;
  onRowClick?: (item: T, index: number) => void;
  rowClassName?: (item: T, index: number) => string;
}

const ITEM_HEIGHT = 52; // Default row height
const DEFAULT_HEIGHT = 400;

function VirtualTableInner<T extends Record<string, any>>({
  data,
  columns,
  itemHeight = ITEM_HEIGHT,
  height = DEFAULT_HEIGHT,
  className,
  onRowClick,
  rowClassName,
}: VirtualTableProps<T>) {
  const { virtualItems, totalSize, scrollElementRef } = useFixedVirtualScroll(
    data.length,
    itemHeight,
    height
  );

  const visibleItems = useMemo(() => {
    return virtualItems.map(virtualItem => ({
      ...virtualItem,
      item: data[virtualItem.index],
    }));
  }, [virtualItems, data]);

  return (
    <div
      ref={scrollElementRef}
      className={cn(
        "overflow-auto border rounded-md",
        className
      )}
      style={{ height }}
    >
      <Table>
        <TableHeader className="sticky top-0 bg-background z-10">
          <TableRow>
            {columns.map((column) => (
              <TableHead
                key={String(column.key)}
                style={{ width: column.width }}
                className={column.className}
              >
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {/* Spacer for items before visible area */}
          {virtualItems[0] && (
            <tr style={{ height: virtualItems[0].start }} />
          )}
          
          {visibleItems.map(({ item, index, size }) => (
            <TableRow
              key={index}
              className={cn(
                "cursor-pointer hover:bg-muted/50",
                rowClassName?.(item, index)
              )}
              style={{ height: size }}
              onClick={() => onRowClick?.(item, index)}
            >
              {columns.map((column) => (
                <TableCell
                  key={String(column.key)}
                  className={column.className}
                >
                  {column.render 
                    ? column.render(item, index)
                    : item[column.key] ?? '-'
                  }
                </TableCell>
              ))}
            </TableRow>
          ))}
          
          {/* Spacer for items after visible area */}
          {virtualItems.length > 0 && (
            <tr
              style={{
                height: totalSize - (virtualItems[virtualItems.length - 1]?.start + itemHeight || 0)
              }}
            />
          )}
        </TableBody>
      </Table>
      
      {/* Show message when no data */}
      {data.length === 0 && (
        <div className="flex items-center justify-center h-32 text-muted-foreground">
          <p>No data available</p>
        </div>
      )}
    </div>
  );
}

// Generic virtual table component
export const VirtualTable = forwardRef(<T extends Record<string, any>>(
  props: VirtualTableProps<T>,
  ref: React.Ref<HTMLDivElement>
) => <VirtualTableInner {...props} />) as <T extends Record<string, any>>(
  props: VirtualTableProps<T> & { ref?: React.Ref<HTMLDivElement> }
) => React.ReactElement;

VirtualTable.displayName = 'VirtualTable';

// Utility function to create columns easily
export function createColumn<T>(
  key: keyof T | string,
  header: string,
  options?: Partial<Omit<Column<T>, 'key' | 'header'>>
): Column<T> {
  return {
    key,
    header,
    ...options,
  };
}