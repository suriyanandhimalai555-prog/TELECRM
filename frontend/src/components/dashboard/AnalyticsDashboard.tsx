import React, { useEffect, useState } from 'react';
import { WorkStats } from '../../types';
import { api } from '../../services/api';
import { StatsCardSkeleton } from '../common/Skeleton';
import { useToast } from '../../contexts/ToastContext';
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Users,
  TrendingUp,
  PieChart,
  BarChart,
  Download,
  Building,
  Layers,
} from 'lucide-react';

export const AnalyticsDashboard: React.FC = () => {
  const [stats, setStats] = useState<WorkStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { addToast } = useToast();

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const data = await api.works.stats();
      setStats(data);
    } catch (err: any) {
      addToast('error', 'Dashboard Error', err.message || 'Failed to load statistics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleExportReport = () => {
    if (!stats) return;
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(stats, null, 2))}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', `work_tracking_analytics_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    addToast('success', 'Report Exported', 'Analytics data downloaded as JSON file.');
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCardSkeleton />
        <StatsCardSkeleton />
        <StatsCardSkeleton />
        <StatsCardSkeleton />
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* Top Banner & Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 text-white rounded-2xl p-6 shadow-xl">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-indigo-300">Operational Intelligence</span>
          <h2 className="text-2xl font-black mt-1 tracking-tight">Work Tracking Analytics</h2>
          <p className="text-xs text-indigo-200 mt-1 max-w-xl">
            Real-time hours logged, approval velocity, department productivity benchmarks, and category allocations.
          </p>
        </div>

        {/* <button
          onClick={handleExportReport}
          className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-white text-indigo-900 hover:bg-indigo-50 font-bold text-xs shadow-md transition-all shrink-0 self-start sm:self-auto"
        >
          <Download className="w-4 h-4" />
          <span>Export Analytics</span>
        </button> */}
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Hours */}
        <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-start justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
              <Clock className="w-6 h-6" />
            </div>
            <div className="ml-4">
              <span className="inline-flex items-center rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">Total Hours</span>
            </div>
          </div>

          <div className="mt-4">
            <p className="text-3xl font-black text-slate-900 dark:text-white">{stats.totalHoursLogged} hrs</p>
            <p className="text-xs text-slate-500 mt-1">as of today</p>
          </div>
        </div>

        {/* Pending Reviews */}
        <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-start justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="ml-4">
              <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">Pending Reviews</span>
            </div>
          </div>

          <div className="mt-4">
            <p className="text-3xl font-black text-slate-900 dark:text-white">{stats.pendingReviews}</p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 font-medium">Awaiting manager decision</p>
          </div>
        </div>

        {/* Approval Rate */}
        <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-start justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="ml-4">
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Approval Rate</span>
            </div>
          </div>

          <div className="mt-4">
            <p className="text-3xl font-black text-slate-900 dark:text-white">{stats.approvalRate}%</p>
            <p className="text-xs text-slate-500 mt-1">{stats.approvedCount} approved / {stats.rejectionCount} rejected</p>
          </div>
        </div>

        {/* Active Contributors */}
        <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-start justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
              <Users className="w-6 h-6" />
            </div>
            <div className="ml-4">
              <span className="inline-flex items-center rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700">Active Contributors</span>
            </div>
          </div>

          <div className="mt-4">
            <p className="text-3xl font-black text-slate-900 dark:text-white">{stats.activeEmployees}</p>
            <p className="text-xs text-slate-500 mt-1">as of today</p>
          </div>
        </div>
      </div>

      {/* Breakdowns Row: Category & Department */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Distribution */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <Layers className="w-5 h-5 text-indigo-500" />
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Hours by Project Category</h3>
            </div>
          </div>

          <div className="space-y-3">
            {stats.categoryBreakdown.map((cat, idx) => {
              const maxHours = Math.max(...stats.categoryBreakdown.map((c) => c.hours), 1);
              const percentage = Math.round((cat.hours / maxHours) * 100);

              return (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-800 dark:text-slate-200">{cat.category}</span>
                    <span className="text-slate-500">
                      {cat.hours} hrs ({cat.count} logs)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-indigo-600 dark:bg-indigo-500 h-2.5 rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Department Breakdown */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <Building className="w-5 h-5 text-purple-500" />
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Department Productivity</h3>
            </div>
          </div>

          <div className="space-y-3">
            {stats.departmentBreakdown.map((dept, idx) => {
              const maxHours = Math.max(...stats.departmentBreakdown.map((d) => d.hours), 1);
              const percentage = Math.round((dept.hours / maxHours) * 100);

              return (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-800 dark:text-slate-200">{dept.department}</span>
                    <span className="text-slate-500">
                      {dept.hours} hrs ({dept.count} logs)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-purple-600 dark:bg-purple-500 h-2.5 rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
