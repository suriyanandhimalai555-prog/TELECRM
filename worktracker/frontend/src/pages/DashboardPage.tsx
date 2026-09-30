import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { WorkFilters, WorkUpdate } from '../types';
import { api } from '../services/api';
import { Navbar } from '../components/layout/Navbar';
import { Sidebar } from '../components/layout/Sidebar';
import { WorkCard } from '../components/works/WorkCard';
import { WorkFilterBar } from '../components/works/WorkFilterBar';
import { WorkFormModal } from '../components/works/WorkFormModal';
import { ReviewModal } from '../components/works/ReviewModal';
import { BulkReviewModal } from '../components/works/BulkReviewModal';
import { TimelineModal } from '../components/works/TimelineModal';
import { EditHistoryModal } from '../components/works/EditHistoryModal';
import { AnalyticsDashboard } from '../components/dashboard/AnalyticsDashboard';
import { UserManagementView } from '../components/users/UserManagementModal';
import { EmployeeListPage } from '../components/users/EmployeeListPage';
import { ProfileSettings } from '../components/profile/ProfileSettings';
import { RaiseQueryPage } from '../components/queries/RaiseQueryPage';
import { EmployeeQueriesPage } from '../components/queries/EmployeeQueriesPage';
import { EodReportPage } from '../components/eod/EodReportPage';
import { WorkCardSkeleton } from '../components/common/Skeleton';
import { Button } from '../components/common/Button';
import { useToast } from '../contexts/ToastContext';
import { FileText, PlusCircle, CheckSquare, RefreshCcw, Layers, AlertCircle, Download } from 'lucide-react';
import { exportWorksToExcel } from '../utils/excelExport';

const CATEGORIES = [
  'State Head',

];

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState('home');
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Works state & infinite scroll / pagination
  const [works, setWorks] = useState<WorkUpdate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Filters state
  const [filters, setFilters] = useState<WorkFilters>({
    status: 'all',
    category: 'all',
    sortBy: 'created_at',
    sortOrder: 'desc',
  });

  // Bulk Selection State
  const [selectedWorkIds, setSelectedWorkIds] = useState<string[]>([]);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingWork, setEditingWork] = useState<WorkUpdate | null>(null);
  const [reviewingWork, setReviewingWork] = useState<WorkUpdate | null>(null);
  const [isBulkReviewModalOpen, setIsBulkReviewModalOpen] = useState(false);
  const [timelineWork, setTimelineWork] = useState<WorkUpdate | null>(null);
  const [historyWork, setHistoryWork] = useState<WorkUpdate | null>(null);

  const fetchWorks = useCallback(async (resetPage = true) => {
    const targetPage = resetPage ? 1 : page;
    if (resetPage) {
      setIsLoading(true);
      setPage(1);
    } else {
      setIsLoadingMore(true);
    }

    try {
      // If activeTab is 'approvals', override status filter to 'pending'
      const effectiveFilters = activeTab === 'approvals' ? { ...filters, status: 'pending' as const } : filters;

      const res = await api.works.list(effectiveFilters, targetPage, 20);

      if (resetPage) {
        setWorks(res.items);
        setSelectedWorkIds([]);
      } else {
        setWorks((prev) => [...prev, ...res.items]);
      }

      setHasMore(res.hasMore);
    } catch (err: any) {
      addToast('error', 'Fetch Error', err.message || 'Failed to load work entries');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [filters, activeTab, page, addToast]);

  useEffect(() => {
    fetchWorks(true);
  }, [filters, activeTab]);

  const handleLoadMore = () => {
    if (!hasMore || isLoadingMore) return;
    setPage((prev) => prev + 1);
  };

  useEffect(() => {
    if (page > 1) {
      fetchWorks(false);
    }
  }, [page]);

  const [isExporting, setIsExporting] = useState(false);

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const effectiveFilters = activeTab === 'approvals' ? { ...filters, status: 'pending' as const } : filters;
      const res = await api.works.list(effectiveFilters, 1, 2000);
      exportWorksToExcel(res.items, {
        startDate: filters.startDate,
        endDate: filters.endDate,
        searchName: filters.search,
      });
      addToast('success', 'Excel Export Downloaded', `Exported ${res.items.length} work entries matching criteria.`);
    } catch (e: any) {
      addToast('error', 'Export Error', e.message || 'Failed to download Excel file');
    } finally {
      setIsExporting(false);
    }
  };

  const handleResetFilters = () => {
    setFilters({
      status: 'all',
      category: 'all',
      sortBy: 'created_at',
      sortOrder: 'desc',
      startDate: '',
      endDate: '',
      search: '',
    });
  };

  const handleToggleSelectWork = (id: string) => {
    setSelectedWorkIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllPending = () => {
    const pendingIds = works.filter((w) => w.status === 'pending').map((w) => w.id);
    if (selectedWorkIds.length === pendingIds.length) {
      setSelectedWorkIds([]);
    } else {
      setSelectedWorkIds(pendingIds);
    }
  };

  const pendingCount = works.filter((w) => w.status === 'pending').length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* Top Navbar */}
      <Navbar
        onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onNavigate={(tab, linkId) => {
          setActiveTab(tab);
          setHighlightId(linkId || null);
        }}
      />

      {/* Main Layout Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto flex">
        {/* Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenCreateModal={() => {
            setEditingWork(null);
            setIsCreateModalOpen(true);
          }}
          pendingCount={pendingCount}
          isOpenMobile={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {/* TAB 1 & 2: Daily Work History / Team Approvals */}
          {(activeTab === 'works' || activeTab === 'approvals') && (
            <div className="space-y-6">
              {/* Header Title Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    {activeTab === 'approvals' ? 'Team Approvals & Reviews' : 'Daily Work History'}
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {activeTab === 'approvals'
                      ? 'Review and decide on pending work updates submitted by team members'
                      : 'View, filter, and track daily work logs and status updates'}
                  </p>
                </div>

                <div className="flex items-center space-x-3">
                  {/* Bulk Review Trigger Button */}
                  {selectedWorkIds.length > 0 && (
                    <Button
                      id="bulk-review-action-btn"
                      variant="primary"
                      onClick={() => setIsBulkReviewModalOpen(true)}
                      icon={<CheckSquare className="w-4 h-4" />}
                    >
                      Bulk Review ({selectedWorkIds.length})
                    </Button>
                  )}

                  <Button
                    id="export-excel-header-btn"
                    variant="outline"
                    onClick={handleExportExcel}
                    isLoading={isExporting}
                    icon={<Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
                  >
                    Export Excel
                  </Button>

                  {user?.role !== 'super_admin' && (
                    <Button
                      id="log-work-header-btn"
                      variant="primary"
                      onClick={() => {
                        setEditingWork(null);
                        setIsCreateModalOpen(true);
                      }}
                      icon={<PlusCircle className="w-4 h-4" />}
                    >
                      Log Work Entry
                    </Button>
                  )}
                </div>
              </div>

              {/* Filter Toolbar */}
              <WorkFilterBar
                filters={filters}
                onChange={setFilters}
                onReset={handleResetFilters}
                categories={CATEGORIES}
                onExportExcel={handleExportExcel}
              />

              {/* Bulk Selection Bar if pending items exist */}
              {['super_admin', 'admin', 'manager'].includes(user?.role || '') && (
                <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold">
                  <span className="text-slate-600 dark:text-slate-400">
                    {pendingCount} Pending item(s) on current view
                  </span>
                  {pendingCount > 0 && (
                    <button
                      onClick={handleSelectAllPending}
                      className="text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      {selectedWorkIds.length === pendingCount ? 'Deselect All' : 'Select All Pending'}
                    </button>
                  )}
                </div>
              )}

              {/* Work Updates Grid List */}
              {isLoading ? (
                <div className="grid grid-cols-1 gap-4">
                  <WorkCardSkeleton />
                  <WorkCardSkeleton />
                  <WorkCardSkeleton />
                </div>
              ) : works.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-500 mx-auto flex items-center justify-center">
                    <FileText className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">No work entries found</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    No work logs match your current filter settings. Try adjusting your date range or filter options.
                  </p>
                  <Button variant="outline" size="sm" onClick={handleResetFilters}>
                    Reset Filters
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {works.map((work) => (
                    <WorkCard
                      key={work.id}
                      work={work}
                      onEdit={(w) => {
                        setEditingWork(w);
                        setIsCreateModalOpen(true);
                      }}
                      onReview={(w) => setReviewingWork(w)}
                      onViewTimeline={(w) => setTimelineWork(w)}
                      onViewHistory={(w) => setHistoryWork(w)}
                      isSelected={selectedWorkIds.includes(work.id)}
                      onToggleSelect={handleToggleSelectWork}
                      showCheckbox={['super_admin', 'admin', 'manager'].includes(user?.role || '') && work.status === 'pending'}
                    />
                  ))}

                  {/* Infinite scroll load more button */}
                  {hasMore && (
                    <div className="text-center pt-4">
                      <Button
                        variant="outline"
                        onClick={handleLoadMore}
                        isLoading={isLoadingMore}
                        icon={<RefreshCcw className="w-4 h-4" />}
                      >
                        Load More Entries
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB: Dashboard (EOD Report) */}
          {activeTab === 'home' && <EodReportPage />}

          {/* TAB: Analytics Dashboard */}
          {activeTab === 'dashboard' && <AnalyticsDashboard />}

          {/* TAB: User Management */}
          {activeTab === 'users' && <UserManagementView />}

          {/* TAB: HR Employee List */}
          {activeTab === 'employee-list' && <EmployeeListPage />}

          {activeTab === 'raise-query' && <RaiseQueryPage highlightId={highlightId} />}

          {activeTab === 'employee-queries' && <EmployeeQueriesPage highlightId={highlightId} />}

          {/* Profile Settings (available to every role) */}
          {activeTab === 'profile' && <ProfileSettings />}
        </main>
      </div>

      {/* Modals */}
      <WorkFormModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => fetchWorks(true)}
        editingWork={editingWork}
      />

      <ReviewModal
        isOpen={!!reviewingWork}
        onClose={() => setReviewingWork(null)}
        onSuccess={() => fetchWorks(true)}
        work={reviewingWork}
      />

      <BulkReviewModal
        isOpen={isBulkReviewModalOpen}
        onClose={() => setIsBulkReviewModalOpen(false)}
        onSuccess={() => fetchWorks(true)}
        selectedIds={selectedWorkIds}
      />

      <TimelineModal
        isOpen={!!timelineWork}
        onClose={() => setTimelineWork(null)}
        work={timelineWork}
      />

      <EditHistoryModal
        isOpen={!!historyWork}
        onClose={() => setHistoryWork(null)}
        work={historyWork}
      />
    </div>
  );
};
