'use client';

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';

export interface Column<T> {
  header: string;
  accessor: keyof T | ((row: T) => React.ReactNode);
  className?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  pageSize?: number;
  searchableKey?: keyof T;
  searchPlaceholder?: string;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  pageSize = 15,
  searchableKey,
  searchPlaceholder = 'Поиск...',
}: DataTableProps<T>) {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredData = React.useMemo(() => {
    if (!searchableKey || !searchQuery.trim()) return data;
    return data.filter((item) => {
      const val = item[searchableKey];
      return String(val || '')
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
    });
  }, [data, searchableKey, searchQuery]);

  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const currentData = filteredData.slice(startIndex, startIndex + pageSize);

  return (
    <div className="w-full flex flex-col gap-4">
      {searchableKey && (
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder={searchPlaceholder}
            className="w-full pl-9 pr-4 py-2 text-sm bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-brand min-h-[44px]"
          />
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {columns.map((col, idx) => (
                <th key={idx} className={`p-3.5 ${col.className || ''}`}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-sm">
            {currentData.length > 0 ? (
              currentData.map((row, rowIdx) => (
                <tr key={rowIdx} className="hover:bg-muted/30 transition-colors">
                  {columns.map((col, colIdx) => (
                    <td key={colIdx} className={`p-3.5 ${col.className || ''}`}>
                      {typeof col.accessor === 'function'
                        ? col.accessor(row)
                        : (row[col.accessor] ?? '-')}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="p-6 text-center text-muted-foreground">
                  Данные не найдены
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Страница {currentPage} из {totalPages} ({filteredData.length} записей)
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="p-2 border border-border rounded-lg hover:bg-muted disabled:opacity-50 min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-2 border border-border rounded-lg hover:bg-muted disabled:opacity-50 min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
