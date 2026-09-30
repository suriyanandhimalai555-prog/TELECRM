import React from 'react';
import { WorkUpdate } from '../../types';
import { StatusBadge, RoleBadge } from '../common/Badge';
import { Button } from '../common/Button';
import {
  Clock,
  User,
  Calendar,
  MessageSquare,
  FileText,
  Paperclip,
  History,
  GitCommit,
  Edit,
  CheckCircle2,
  XCircle,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface WorkCardProps {
  work: WorkUpdate;
  onEdit: (work: WorkUpdate) => void;
  onReview: (work: WorkUpdate) => void;
  onViewTimeline: (work: WorkUpdate) => void;
  onViewHistory: (work: WorkUpdate) => void;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
  showCheckbox?: boolean;
}

export const WorkCard: React.FC<WorkCardProps> = ({
  work,
  onEdit,
  onReview,
  onViewTimeline,
  onViewHistory,
  isSelected = false,
  onToggleSelect,
  showCheckbox = false,
}) => {
  const { user } = useAuth();
  if (!user) return null;

  const isAuthor = user.id === work.userId;
  const canReview = ['super_admin', 'admin', 'manager'].includes(user.role);
  // Edit option is ONLY visible if work entry is rejected
  const canEdit = work.status === 'rejected' && (isAuthor || ['super_admin', 'admin'].includes(user.role));

  const formattedDate = new Date(work.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      id={`work-card-${work.id}`}
      className={`group relative bg-white dark:bg-slate-900 border rounded-2xl p-5 shadow-xs transition-all duration-200 hover:shadow-md ${
        work.status === 'rejected'
          ? 'border-rose-300/80 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/10'
          : work.status === 'approved'
          ? 'border-slate-200 dark:border-slate-800'
          : 'border-amber-300/80 dark:border-amber-900/60 bg-amber-50/20 dark:bg-amber-950/10'
      }`}
    >
      {/* Top Header Row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center space-x-3">
          {showCheckbox && onToggleSelect && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggleSelect(work.id)}
              className="w-4 h-4 text-indigo-600 rounded border-slate-300 dark:border-slate-700 focus:ring-indigo-500 cursor-pointer"
            />
          )}

          <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 font-bold text-xs shrink-0 border border-slate-200 dark:border-slate-700">
            {work.userName.charAt(0)}
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-sm text-slate-900 dark:text-white">{work.userName}</span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{work.department}</span>
            </div>
            <div className="flex items-center space-x-2 mt-0.5">
              <RoleBadge role={work.userRole} />
              <span className="text-[11px] text-slate-400 flex items-center space-x-1">
                <Calendar className="w-3 h-3" />
                <span>{formattedDate}</span>
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
            <Clock className="w-3.5 h-3.5 mr-1 text-indigo-500" />
            {work.hoursSpent} hrs
          </span>
          <StatusBadge status={work.status} />
        </div>
      </div>

      {/* Category Pill & Work Title */}
      <div className="mb-2">
        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 mb-1.5 border border-indigo-200/50 dark:border-indigo-800/50">
          {work.category}
        </span>
        <h4 className="text-base font-bold text-slate-900 dark:text-white leading-snug">{work.title}</h4>
      </div>

      {/* Description Content */}
      <div
        className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4 line-clamp-3 prose dark:prose-invert max-w-none text-xs sm:text-sm"
        dangerouslySetInnerHTML={{ __html: work.description }}
      />

      {/* Attachments Section */}
      {work.attachments && work.attachments.length > 0 && (
        <div className="mb-4 pt-3 border-t border-slate-100 dark:border-slate-800/60">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center space-x-1">
            <Paperclip className="w-3.5 h-3.5" />
            <span>Attachments ({work.attachments.length})</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {work.attachments.map((att) => (
              <a
                key={att.id}
                href={att.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs text-slate-700 dark:text-slate-200 transition-colors truncate max-w-xs"
              >
                <FileText className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                <span className="truncate">{att.fileName}</span>
                <ExternalLink className="w-3 h-3 text-slate-400 shrink-0" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Rejection Reviewer Comment Callout Box */}
      {work.status === 'rejected' && work.reviewComment && (
        <div className="mb-4 p-3.5 rounded-xl bg-rose-100/70 dark:bg-rose-950/60 border border-rose-300/80 dark:border-rose-800/80 text-rose-900 dark:text-rose-200 text-xs space-y-1">
          <div className="flex items-center justify-between font-bold">
            <span className="flex items-center space-x-1">
              <MessageSquare className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              <span>Reviewer Feedback ({work.reviewerName || 'Human Resources'}):</span>
            </span>
            <span className="text-[10px] text-rose-600 dark:text-rose-400">
              {work.reviewedAt ? new Date(work.reviewedAt).toLocaleDateString() : ''}
            </span>
          </div>
          <p className="pl-4 font-mono text-[11px] leading-relaxed italic opacity-90">{work.reviewComment}</p>
        </div>
      )}

      {/* Approved Comment Callout Box */}
      {work.status === 'approved' && work.reviewComment && (
        <div className="mb-4 p-3.5 rounded-xl bg-emerald-100/60 dark:bg-emerald-950/40 border border-emerald-300/60 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200 text-xs space-y-1">
          <div className="flex items-center justify-between font-bold">
            <span className="flex items-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Approved by {work.reviewerName || 'Human Resources'}:</span>
            </span>
          </div>
          <p className="pl-4 font-mono text-[11px] opacity-90">{work.reviewComment}</p>
        </div>
      )}

      {/* Card Actions Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center space-x-2">
          {/* Status Timeline trigger */}
          <button
            onClick={() => onViewTimeline(work)}
            className="text-xs font-semibold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center space-x-1 px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="View status timeline"
          >
            <GitCommit className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Timeline</span>
          </button>

          {/* Edit History log trigger */}
          {work.editHistory && work.editHistory.length > 0 && (
            <button
              onClick={() => onViewHistory(work)}
              className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center space-x-1 px-2 py-1 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
              title="View edit history changes"
            >
              <History className="w-3.5 h-3.5" />
              <span>
                {work.editHistory.length} Edit{work.editHistory.length > 1 ? 's' : ''}
              </span>
            </button>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          {/* Edit Button for Rejected Works or Author Pending */}
          {canEdit && (
            <Button
              id={`edit-work-btn-${work.id}`}
              variant="outline"
              size="sm"
              onClick={() => onEdit(work)}
              icon={<Edit className="w-3.5 h-3.5" />}
            >
              {work.status === 'rejected' ? 'Edit & Resubmit' : 'Edit'}
            </Button>
          )}

          {/* Review Button for Admin/Manager */}
          {canReview && work.status === 'pending' && (
            <Button
              id={`review-work-btn-${work.id}`}
              variant="primary"
              size="sm"
              onClick={() => onReview(work)}
              icon={<CheckCircle2 className="w-3.5 h-3.5" />}
            >
              Review
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
