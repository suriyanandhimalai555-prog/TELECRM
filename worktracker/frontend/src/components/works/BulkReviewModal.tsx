import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { useToast } from '../../contexts/ToastContext';
import { api } from '../../services/api';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

interface BulkReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  selectedIds: string[];
}

export const BulkReviewModal: React.FC<BulkReviewModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  selectedIds,
}) => {
  const { addToast } = useToast();
  const [status, setStatus] = useState<'approved' | 'rejected'>('approved');
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isRejecting = status === 'rejected';
  const charCount = comment.trim().length;
  const isValid = isRejecting ? charCount >= 20 : true;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isRejecting && !isValid) {
      addToast('error', 'Validation Error', 'Bulk rejection requires a comment of at least 20 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.works.bulkReview(selectedIds, status, comment.trim());
      addToast('success', 'Bulk Review Completed', res.message);
      onSuccess();
      onClose();
    } catch (err: any) {
      addToast('error', 'Bulk Review Failed', err.message || 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Bulk Review (${selectedIds.length} Items Selected)`}
      subtitle="Approve or reject multiple work updates in a single action"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">
            Bulk Action Status
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setStatus('approved')}
              className={`p-3 rounded-xl border flex items-center justify-center space-x-2 font-bold text-xs transition-all ${
                status === 'approved'
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Bulk Approve</span>
            </button>

            <button
              type="button"
              onClick={() => setStatus('rejected')}
              className={`p-3 rounded-xl border flex items-center justify-center space-x-2 font-bold text-xs transition-all ${
                status === 'rejected'
                  ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 ring-2 ring-rose-500/20'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
              }`}
            >
              <XCircle className="w-4 h-4 text-rose-500" />
              <span>Bulk Reject</span>
            </button>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Bulk Reviewer Comment {isRejecting && <span className="text-rose-500">* (Min 20 chars)</span>}
            </label>
            {isRejecting && (
              <span className={`text-[11px] font-semibold ${charCount >= 20 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {charCount}/20 chars min
              </span>
            )}
          </div>

          <textarea
            id="bulk-review-comment-textarea"
            rows={3}
            required={isRejecting}
            placeholder={
              isRejecting
                ? 'Provide mandatory rejection comment applied across all selected work items...'
                : 'Optional bulk approval notes...'
            }
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>

        <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            id="confirm-bulk-review-btn"
            type="submit"
            variant={isRejecting ? 'danger' : 'success'}
            isLoading={isSubmitting}
            disabled={isRejecting && !isValid}
          >
            Apply to {selectedIds.length} Items
          </Button>
        </div>
      </form>
    </Modal>
  );
};
