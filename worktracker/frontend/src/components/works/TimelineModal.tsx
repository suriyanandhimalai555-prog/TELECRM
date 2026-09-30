import React from 'react';
import { WorkUpdate } from '../../types';
import { Modal } from '../common/Modal';
import { StatusBadge } from '../common/Badge';
import { Clock, CheckCircle2, XCircle, Edit, User, Calendar } from 'lucide-react';

interface TimelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  work: WorkUpdate | null;
}

export const TimelineModal: React.FC<TimelineModalProps> = ({ isOpen, onClose, work }) => {
  if (!work) return null;

  const timelineSteps = [
    {
      title: 'Work Entry Submitted',
      actor: work.userName,
      role: 'Author',
      timestamp: work.createdAt,
      icon: Clock,
      status: 'completed',
      detail: `Logged ${work.hoursSpent} hours under ${work.category}`,
    },
  ];

  // If there are edits
  if (work.editHistory && work.editHistory.length > 0) {
    work.editHistory.forEach((edit) => {
      timelineSteps.push({
        title: 'Work Entry Revised & Resubmitted',
        actor: edit.editedByName,
        role: 'Editor',
        timestamp: edit.editedAt,
        icon: Edit,
        status: 'edited',
        detail: `Updated ${edit.changes.map((c) => c.field).join(', ')}`,
      });
    });
  }

  // If reviewed
  if (work.status === 'approved') {
    timelineSteps.push({
      title: 'Approved by Human Resources',
      actor: work.reviewerName || 'Human Resources',
      role: 'Reviewer',
      timestamp: work.reviewedAt || work.updatedAt,
      icon: CheckCircle2,
      status: 'approved',
      detail: work.reviewComment || 'Approved without additional comment',
    });
  } else if (work.status === 'rejected') {
    timelineSteps.push({
      title: 'Rejected by Reviewer',
      actor: work.reviewerName || 'Human Resources',
      role: 'Reviewer',
      timestamp: work.reviewedAt || work.updatedAt,
      icon: XCircle,
      status: 'rejected',
      detail: work.reviewComment || 'No comment provided',
    });
  } else {
    timelineSteps.push({
      title: 'Awaiting Human Resources Review',
      actor: 'Assigned Reviewer',
      role: 'Pending Action',
      timestamp: null,
      icon: Clock,
      status: 'pending',
      detail: 'Submitted and currently pending approval from Human Resources/admin',
    });
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Status Timeline Visualization"
      subtitle={`Tracking history for "${work.title}"`}
      maxWidth="lg"
    >
      <div className="py-2 space-y-6">
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Current Status</span>
            <div className="mt-0.5">
              <StatusBadge status={work.status} size="lg" />
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Hours</span>
            <p className="text-base font-bold text-slate-900 dark:text-white">{work.hoursSpent} hrs</p>
          </div>
        </div>

        {/* Vertical Timeline */}
        <div className="relative pl-6 border-l-2 border-indigo-200 dark:border-indigo-900/60 space-y-8 my-4">
          {timelineSteps.map((step, idx) => {
            const Icon = step.icon;

            const iconColors = {
              completed: 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20',
              edited: 'bg-amber-500 text-white shadow-md shadow-amber-500/20',
              approved: 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20',
              rejected: 'bg-rose-600 text-white shadow-md shadow-rose-500/20',
              pending: 'bg-slate-300 dark:bg-slate-700 text-slate-600 dark:text-slate-300',
            };

            return (
              <div key={idx} className="relative group">
                {/* Node icon circle */}
                <div
                  className={`absolute -left-[35px] top-0.5 w-8 h-8 rounded-full flex items-center justify-center ${
                    iconColors[step.status as keyof typeof iconColors]
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>

                {/* Content Box */}
                <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl p-4 shadow-xs">
                  <div className="flex items-start justify-between gap-2">
                    <h5 className="font-bold text-sm text-slate-900 dark:text-white">{step.title}</h5>
                    {step.timestamp && (
                      <span className="text-[10px] font-medium text-slate-400 shrink-0 flex items-center space-x-1">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(step.timestamp).toLocaleString()}</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 mt-1 text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                    <User className="w-3.5 h-3.5" />
                    <span>
                      {step.actor} ({step.role})
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                    {step.detail}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
};
