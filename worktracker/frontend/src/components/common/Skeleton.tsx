import React from 'react';

export const WorkCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800" />
          <div className="space-y-1.5">
            <div className="w-32 h-4 bg-slate-200 dark:bg-slate-800 rounded-md" />
            <div className="w-20 h-3 bg-slate-100 dark:bg-slate-800/60 rounded-md" />
          </div>
        </div>
        <div className="w-24 h-6 bg-slate-200 dark:bg-slate-800 rounded-full" />
      </div>

      <div className="space-y-2 pt-2">
        <div className="w-3/4 h-5 bg-slate-200 dark:bg-slate-800 rounded-md" />
        <div className="w-full h-4 bg-slate-100 dark:bg-slate-800/60 rounded-md" />
        <div className="w-5/6 h-4 bg-slate-100 dark:bg-slate-800/60 rounded-md" />
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800/60">
        <div className="w-20 h-4 bg-slate-200 dark:bg-slate-800 rounded-md" />
        <div className="w-16 h-4 bg-slate-200 dark:bg-slate-800 rounded-md" />
      </div>
    </div>
  );
};

export const StatsCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs animate-pulse space-y-3">
      <div className="flex items-center justify-between">
        <div className="w-24 h-4 bg-slate-200 dark:bg-slate-800 rounded-md" />
        <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-800" />
      </div>
      <div className="w-20 h-8 bg-slate-200 dark:bg-slate-800 rounded-md" />
      <div className="w-32 h-3 bg-slate-100 dark:bg-slate-800/60 rounded-md" />
    </div>
  );
};
