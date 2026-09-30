import React, { useState } from 'react';
import { WorkUpdate } from '../../types';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { useToast } from '../../contexts/ToastContext';
import { api } from '../../services/api';
import { CheckCircle2, XCircle, AlertCircle, Clock, FileText } from 'lucide-react';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  work: WorkUpdate | null;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  work,
}) => {
  const { addToast } = useToast();
  const [status, setStatus] = useState<'approved' | 'rejected'>('approved');
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!work) return null;

  const isRejecting = status === 'rejected';
  const charCount = comment.trim().length;
  const isValidRejection = isRejecting ? charCount >= 20 : true;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isRejecting && !isValidRejection) {
      addToast('error', 'Validation Error', 'Rejection comment must be at least 20 characters long.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.works.review(work.id, status, comment.trim());
      addToast(
        'success',
        `Work ${status.toUpperCase()}`,
        status === 'approved' ? 'Work update has been approved.' : 'Work update rejected with feedback comment.'
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      addToast('error', 'Review Failed', err.message || 'Action could not be performed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Review Daily Work Entry"
      subtitle={`Submitted by ${work.userName} (${work.department}) • ${work.hoursSpent} Hours`}
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* Summary Card */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              {work.category}
            </span>
            <span className="text-xs text-slate-400">{new Date(work.createdAt).toLocaleDateString()}</span>
          </div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">{work.title}</h4>
          <div
            className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3 prose dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: work.description }}
          />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Decision Status Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">
              Review Decision <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setStatus('approved')}
                className={`p-3.5 rounded-xl border flex items-center justify-center space-x-2 font-bold text-xs transition-all ${
                  status === 'approved'
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Approve Work</span>
              </button>

              <button
                type="button"
                onClick={() => setStatus('rejected')}
                className={`p-3.5 rounded-xl border flex items-center justify-center space-x-2 font-bold text-xs transition-all ${
                  status === 'rejected'
                    ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 ring-2 ring-rose-500/20'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
                }`}
              >
                <XCircle className="w-4 h-4 text-rose-500" />
                <span>Reject Work</span>
              </button>
            </div>
          </div>

          {/* Comment input area */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Reviewer Feedback Comment {isRejecting && <span className="text-rose-500">* (Min 20 chars)</span>}
              </label>
              {isRejecting && (
                <span className={`text-[11px] font-semibold ${charCount >= 20 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {charCount}/20 chars min
                </span>
              )}
            </div>

            <textarea
              id="review-comment-textarea"
              rows={4}
              required={isRejecting}
              placeholder={
                isRejecting
                  ? 'Specify clear reasons for rejection (at least 20 characters) so the employee knows what edits to make...'
                  : 'Optional approval notes or feedback for the employee...'
              }
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          {/* Warning notice if rejecting */}
          {isRejecting && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Rejecting this work entry will automatically enable an <strong>'Edit & Resubmit'</strong> button on the employee's dashboard so they can revise their submission.
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              id="submit-review-btn"
              type="submit"
              variant={isRejecting ? 'danger' : 'success'}
              isLoading={isSubmitting}
              disabled={isRejecting && !isValidRejection}
            >
              {isRejecting ? 'Confirm Rejection' : 'Confirm Approval'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
