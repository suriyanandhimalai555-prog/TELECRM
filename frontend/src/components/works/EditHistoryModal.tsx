import React from 'react';
import { WorkUpdate } from '../../types';
import { Modal } from '../common/Modal';
import { History, User, Calendar, ArrowRight } from 'lucide-react';

interface EditHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  work: WorkUpdate | null;
}

export const EditHistoryModal: React.FC<EditHistoryModalProps> = ({
  isOpen,
  onClose,
  work,
}) => {
  if (!work || !work.editHistory || work.editHistory.length === 0) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Audit Trail & Edit History"
      subtitle={`Change logs for "${work.title}"`}
      maxWidth="lg"
    >
      <div className="space-y-4 py-2">
        {work.editHistory.map((edit, idx) => (
          <div
            key={edit.id || idx}
            className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 space-y-3"
          >
            <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-700/60 pb-2">
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                <User className="w-3.5 h-3.5 text-indigo-500" />
                <span>Edited by {edit.editedByName}</span>
              </div>
              <span className="text-[10px] font-medium text-slate-400 flex items-center space-x-1">
                <Calendar className="w-3 h-3" />
                <span>{new Date(edit.editedAt).toLocaleString()}</span>
              </span>
            </div>

            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Changed Fields:</p>
              {edit.changes.map((change, cIdx) => (
                <div
                  key={cIdx}
                  className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-xs space-y-1"
                >
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">{change.field}</span>
                  <div className="flex items-center space-x-2 text-[11px] font-mono">
                    <span className="line-through text-rose-500/80 bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 rounded">
                      {String(change.oldValue)}
                    </span>
                    <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded font-semibold">
                      {String(change.newValue)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
};
