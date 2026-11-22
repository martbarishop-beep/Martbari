import React, { useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Search,
} from 'lucide-react';
import { useAdminLanguage } from '../../context/AdminLanguageContext';
import { cn } from '../../lib/utils';
import { Button } from '../ui/Button';

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
  width?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  searchPlaceholder?: string;
  onSearchChange?: (term: string) => void;
  bulkActions?: React.ReactNode | ((selectedIds: string[]) => React.ReactNode);
  loading?: boolean;
  emptyMessage?: string;
  pageSize?: number;
  className?: string;
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  keyExtractor,
  searchPlaceholder,
  onSearchChange,
  bulkActions,
  loading = false,
  emptyMessage,
  pageSize = 15,
  className,
}: DataTableProps<T>) {
  const { at } = useAdminLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [visibleColumnKeys, setVisibleColumnKeys] = useState<string[]>(
    columns.map((c) => c.key),
  );
  const [isColMenuOpen, setIsColMenuOpen] = useState(false);

  // Client-side search if onSearchChange is not passed
  const filteredData = useMemo(() => {
    if (onSearchChange || !searchTerm.trim()) return data;
    const term = searchTerm.toLowerCase();
    return data.filter((row) =>
      Object.values(row).some((val) =>
        String(val ?? '').toLowerCase().includes(term),
      ),
    );
  }, [data, searchTerm, onSearchChange]);

  // Client-side sort
  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;
    return [...filteredData].sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];
      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      return sortOrder === 'asc' ? 1 : -1;
    });
  }, [filteredData, sortKey, sortOrder]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const paginatedData = useMemo(() => {
    const from = (currentPage - 1) * pageSize;
    return sortedData.slice(from, from + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortOrder === 'asc') setSortOrder('desc');
      else {
        setSortKey(null);
        setSortOrder('asc');
      }
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(paginatedData.map(keyExtractor));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const isAllSelected =
    paginatedData.length > 0 &&
    paginatedData.every((row) => selectedIds.includes(keyExtractor(row)));

  const visibleColumns = columns.filter((col) =>
    visibleColumnKeys.includes(col.key),
  );

  return (
    <div className={cn('space-y-3.5', className)}>
      {/* Top Toolbar: Search, Column visibility, Bulk actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
              onSearchChange?.(e.target.value);
            }}
            placeholder={searchPlaceholder ?? at('common.search')}
            className="h-9 w-full rounded-[8px] border border-[#17263E]/15 bg-white pl-8 pr-3 text-xs text-[#0F1A2C] placeholder:text-[#5B6577] focus:border-[#F47125] focus:outline-none"
          />
          <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#5B6577]" />
        </div>

        <div className="flex items-center gap-2">
          {/* Column Visibility Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsColMenuOpen((prev) => !prev)}
              className="inline-flex h-9 items-center gap-1.5 rounded-[8px] border border-[#17263E]/15 bg-white px-3 text-xs font-semibold text-[#0F1A2C] hover:bg-[#F5F7FA] cursor-pointer"
            >
              <Eye className="h-3.5 w-3.5 text-[#5B6577]" />
              <span>{at('common.columns')}</span>
            </button>

            {isColMenuOpen && (
              <div className="absolute right-0 top-full z-30 mt-1 w-48 rounded-[10px] border border-[#17263E]/15 bg-white p-2 shadow-card space-y-1">
                {columns.map((c) => {
                  const isChecked = visibleColumnKeys.includes(c.key);
                  return (
                    <label
                      key={c.key}
                      className="flex items-center gap-2 px-2 py-1 text-xs text-[#0F1A2C] hover:bg-[#F5F7FA] rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setVisibleColumnKeys([...visibleColumnKeys, c.key]);
                          } else if (visibleColumnKeys.length > 1) {
                            setVisibleColumnKeys(
                              visibleColumnKeys.filter((k) => k !== c.key),
                            );
                          }
                        }}
                        className="h-3.5 w-3.5 text-[#F47125] rounded border-[#17263E]/20"
                      />
                      <span>{c.header}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bulk action strip if rows are selected */}
      {selectedIds.length > 0 && bulkActions && (
        <div className="flex items-center justify-between gap-3 rounded-[8px] bg-[#17263E]/5 border border-[#17263E]/15 p-2 px-3 text-xs">
          <span className="font-semibold text-[#0F1A2C]">
            {at('common.selectedItems', { count: selectedIds.length })}
          </span>
          <div className="flex items-center gap-2">
            {typeof bulkActions === 'function'
              ? bulkActions(selectedIds)
              : bulkActions}
          </div>
        </div>
      )}

      {/* Main Table Container */}
      <div className="overflow-x-auto rounded-[10px] border border-[#17263E]/15 bg-white shadow-soft">
        <table className="w-full text-left text-xs text-[#0F1A2C]">
          <thead className="border-b border-[#17263E]/10 bg-[#F5F7FA] text-[11px] font-bold uppercase tracking-wider text-[#5B6577]">
            <tr>
              <th className="w-10 px-3.5 py-3 text-center">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={handleSelectAll}
                  aria-label="Select all"
                  className="h-3.5 w-3.5 rounded border-[#17263E]/20 text-[#F47125] focus:ring-[#F47125] cursor-pointer"
                />
              </th>
              {visibleColumns.map((col) => (
                <th
                  key={col.key}
                  style={{ width: col.width }}
                  onClick={() => col.sortable && handleSort(col.key)}
                  className={cn(
                    'px-3.5 py-3 whitespace-nowrap',
                    col.sortable && 'cursor-pointer select-none hover:text-[#0F1A2C]',
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{col.header}</span>
                    {col.sortable && (
                      <span className="text-[#5B6577]/60">
                        {sortKey === col.key ? (
                          sortOrder === 'asc' ? (
                            <ArrowUp className="h-3 w-3 text-[#F47125]" />
                          ) : (
                            <ArrowDown className="h-3 w-3 text-[#F47125]" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3 w-3" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#17263E]/5">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={visibleColumns.length + 1} className="p-4">
                    <div className="h-4 bg-[#E5E9F0] rounded w-full" />
                  </td>
                </tr>
              ))
            ) : paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={visibleColumns.length + 1}
                  className="p-8 text-center text-xs text-[#5B6577]"
                >
                  {emptyMessage ?? at('common.noRecords')}
                </td>
              </tr>
            ) : (
              paginatedData.map((row) => {
                const id = keyExtractor(row);
                const isSelected = selectedIds.includes(id);
                return (
                  <tr
                    key={id}
                    className={cn(
                      'transition-colors hover:bg-[#F5F7FA]',
                      isSelected && 'bg-[#F47125]/5',
                    )}
                  >
                    <td className="w-10 px-3.5 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectRow(id)}
                        aria-label={`Select row ${id}`}
                        className="h-3.5 w-3.5 rounded border-[#17263E]/20 text-[#F47125] focus:ring-[#F47125] cursor-pointer"
                      />
                    </td>
                    {visibleColumns.map((col) => (
                      <td key={col.key} className="px-3.5 py-3 whitespace-nowrap">
                        {col.render ? col.render(row) : String(row[col.key] ?? '')}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {!loading && sortedData.length > pageSize && (
        <div className="flex items-center justify-between text-xs text-[#5B6577] pt-1">
          <span>
            {at('common.showingEntries', {
              from: (currentPage - 1) * pageSize + 1,
              to: Math.min(currentPage * pageSize, sortedData.length),
              total: sortedData.length,
            })}
          </span>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-[6px] border border-[#17263E]/15 bg-white disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="font-semibold text-[#0F1A2C] px-2 tabular-nums">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-[6px] border border-[#17263E]/15 bg-white disabled:opacity-40 cursor-pointer"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
