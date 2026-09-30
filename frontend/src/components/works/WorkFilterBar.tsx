import React from 'react';
import { WorkFilters, WorkStatus } from '../../types';
import { Search, Calendar, Filter, ArrowUpDown, X, RefreshCw, Download } from 'lucide-react';

interface WorkFilterBarProps {
  filters: WorkFilters;
  onChange: (filters: WorkFilters) => void;
  onReset: () => void;
  categories: string[];
  onExportExcel?: () => void;
}

export const WorkFilterBar: React.FC<WorkFilterBarProps> = ({
  filters,
  onChange,
  onReset,
  categories,
  onExportExcel,
}) => {
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...filters, search: e.target.value });
  };

  const handleStatusChange = (status: WorkStatus | 'all') => {
    onChange({ ...filters, status });
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...filters, category: e.target.value });
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...filters, startDate: e.target.value });
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...filters, endDate: e.target.value });
  };

  const handleSortByChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...filters, sortBy: e.target.value as any });
  };

  const toggleSortOrder = () => {
    onChange({ ...filters, sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc' });
  };

  const hasActiveFilters =
    filters.search ||
    (filters.status && filters.status !== 'all') ||
    (filters.category && filters.category !== 'all') ||
    filters.startDate ||
    filters.endDate;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-4">
      {/* Search & Main Filter Controls */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
        {/* Search Input */}
        <div className="md:col-span-5 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="work-search-input"
            type="text"
            placeholder="Search by title, description, author..."
            value={filters.search || ''}
            onChange={handleSearchChange}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
          />
        </div>

        {/* Status Pills */}
        <div className="md:col-span-7 flex items-center justify-start md:justify-end gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((st) => {
            const isActive = (filters.status || 'all') === st;
            const labels = {
              all: 'All Works',
              pending: 'Pending',
              approved: 'Approved',
              rejected: 'Rejected',
            };

            return (
              <button
                key={st}
                onClick={() => handleStatusChange(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 whitespace-nowrap ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {labels[st]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Secondary Controls: Category, Date Range, Sort */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
        {/* Category Dropdown */}
        <div className="lg:col-span-3">
          <select
            id="work-filter-category-select"
            value={filters.category || 'all'}
            onChange={handleCategoryChange}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Start Date & End Date Range */}
        <div className="lg:col-span-5 flex items-center space-x-2 text-xs">
          <div className="flex-1 relative">
            <input
              id="work-filter-start-date"
              type="date"
              value={filters.startDate || ''}
              onChange={handleStartDateChange}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <span className="text-slate-400 font-medium">to</span>
          <div className="flex-1 relative">
            <input
              id="work-filter-end-date"
              type="date"
              value={filters.endDate || ''}
              onChange={handleEndDateChange}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>

        {/* Sort Controls */}
        <div className="lg:col-span-4 flex items-center space-x-2">
          <div className="flex-1">
            <select
              id="work-filter-sort-by"
              value={filters.sortBy || 'created_at'}
              onChange={handleSortByChange}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="created_at">Sort by Date</option>
              <option value="hours_spent">Sort by Hours Spent</option>
              <option value="status">Sort by Status</option>
              <option value="title">Sort by Title</option>
            </select>
          </div>

          <button
            onClick={toggleSortOrder}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            title={`Sort ${filters.sortOrder === 'asc' ? 'Ascending' : 'Descending'}`}
          >
            <ArrowUpDown className="w-4 h-4" />
          </button>

          {/* {onExportExcel && (
            <button
              id="export-excel-filter-btn"
              onClick={onExportExcel}
              className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center space-x-1.5 shadow-xs transition-colors shrink-0"
              title="Download daily work entries in Excel format"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Excel</span>
            </button>
          )} */}

          {hasActiveFilters && (
            <button
              onClick={onReset}
              className="px-2.5 py-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold flex items-center space-x-1"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
