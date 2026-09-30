import React from 'react';
import { WorkStatus, UserRole, QueryStatus } from '../../types';
import { CheckCircle2, Clock, XCircle, Shield, User, Briefcase, Award } from 'lucide-react';

interface StatusBadgeProps {
  status: WorkStatus;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs font-semibold gap-1',
    md: 'px-2.5 py-1 text-xs font-semibold gap-1.5',
    lg: 'px-3 py-1.5 text-sm font-semibold gap-2',
  };

  if (status === 'approved') {
    return (
      <span
        id={`status-badge-${status}`}
        className={`inline-flex items-center rounded-full border bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800/80 ${sizeClasses[size]}`}
      >
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <span>Approved</span>
      </span>
    );
  }

  if (status === 'rejected') {
    return (
      <span
        id={`status-badge-${status}`}
        className={`inline-flex items-center rounded-full border bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-800/80 ${sizeClasses[size]}`}
      >
        <XCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
        <span>Rejected</span>
      </span>
    );
  }

  return (
    <span
      id={`status-badge-${status}`}
      className={`inline-flex items-center rounded-full border bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800/80 ${sizeClasses[size]}`}
    >
      <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 animate-pulse" />
      <span>Pending Review</span>
    </span>
  );
};

interface RoleBadgeProps {
  role: UserRole;
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({ role }) => {
  const configs: Record<UserRole, { label: string; icon: any; className: string }> = {
    super_admin: {
      label: 'Managing Director',
      icon: Shield,
      className: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/80 dark:text-purple-300 dark:border-purple-800',
    },
    admin: {
      label: 'Admin',
      icon: Award,
      className: 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950/80 dark:text-indigo-300 dark:border-indigo-800',
    },
    manager: {
      label: 'Human Resources',
      icon: Briefcase,
      className: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-800',
    },
    employee: {
      label: 'Employee',
      icon: User,
      className: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    },
  };

  const config = configs[role] || configs.employee;
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium border ${config.className}`}>
      <Icon className="w-3 h-3" />
      <span>{config.label}</span>
    </span>
  );
};

export const QueryStatusBadge: React.FC<{ status: QueryStatus }> = ({ status }) => {
  const configs: Record<QueryStatus, { label: string; className: string }> = {
    pending: { label: 'Pending', className: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800' },
    in_review: { label: 'In Review', className: 'bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950/80 dark:text-sky-300 dark:border-sky-800' },
    in_progress: { label: 'In Progress', className: 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950/80 dark:text-indigo-300 dark:border-indigo-800' },
    resolved: { label: 'Resolved', className: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800' },
    rejected: { label: 'Rejected', className: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-800' },
  };
  const config = configs[status] || configs.pending;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${config.className}`}>
      {config.label}
    </span>
  );
};
