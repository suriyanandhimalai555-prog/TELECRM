import React, { useState, useEffect } from 'react';
import { WorkUpdate, EodSubmissionGate } from '../../types';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { useToast } from '../../contexts/ToastContext';
import { api } from '../../services/api';
import { Bold, Italic, List, Code, Paperclip, X, AlertCircle, UploadCloud, Lock } from 'lucide-react';

interface WorkFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingWork?: WorkUpdate | null;
  eodGate?: EodSubmissionGate | null;
}

const CATEGORIES = ['State Head', 'PrimeTech'];

export const WorkFormModal: React.FC<WorkFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editingWork,
  eodGate,
}) => {
  const { addToast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [hoursSpent, setHoursSpent] = useState<number>(8.0);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [attachments, setAttachments] = useState<{ fileName: string; fileUrl: string; fileSize: number; fileType: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [entryMode, setEntryMode] = useState<'work' | 'absent_leave'>('work');
  const [absentDate, setAbsentDate] = useState('');
  const [absentReason, setAbsentReason] = useState('');
  const eodBlocked = Boolean(eodGate && !editingWork && !eodGate.canSubmit);

  useEffect(() => {
    const today = new Date();
    const offset = today.getTimezoneOffset();
    const localDate = new Date(today.getTime() - offset * 60000).toISOString().slice(0, 10);
    const defaultDate = eodGate?.date || localDate;
    if (editingWork) {
      setEntryMode('work');
      setTitle(editingWork.title);
      setDescription(editingWork.description);
      setHoursSpent(editingWork.hoursSpent);
      setCategory(editingWork.category);
      setAttachments(editingWork.attachments.map((a) => ({ fileName: a.fileName, fileUrl: a.fileUrl, fileSize: a.fileSize, fileType: a.fileType })));
    } else {
      setEntryMode('work');
      setTitle('');
      setDescription('');
      setHoursSpent(8.0);
      setCategory(CATEGORIES[0]);
      setAttachments([]);
      setAbsentDate(defaultDate);
      setAbsentReason('');
    }
  }, [editingWork, isOpen, eodGate?.date]);

  const applyFormat = (syntax: string) => {
    if (syntax === 'bold') setDescription((prev) => prev + ' <strong>Bold text</strong> ');
    else if (syntax === 'italic') setDescription((prev) => prev + ' <em>Italic text</em> ');
    else if (syntax === 'list') setDescription((prev) => prev + '\n<ul>\n  <li>Key task item</li>\n</ul>\n');
    else if (syntax === 'code') setDescription((prev) => prev + '\n<code>// Code snippet or reference</code>\n');
  };

  const processFiles = (files: File[]) => {
    if (attachments.length + files.length > 5) {
      addToast('warning', 'Attachment Limit', 'Maximum 5 files allowed per work update.');
      return;
    }
    files.forEach((file) => {
      if (file.size > 10 * 1024 * 1024) {
        addToast('error', 'File Too Large', `"${file.name}" exceeds maximum size limit of 10MB.`);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setAttachments((prev) => [...prev, { fileName: file.name, fileUrl: reader.result as string, fileSize: file.size, fileType: file.type || 'application/octet-stream' }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleAbsentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (eodBlocked) { addToast('error', 'EOD Locked', eodGate?.message || 'EOD submission is locked.'); return; }
    if (!absentDate) { addToast('error', 'Validation Error', 'Date is required'); return; }
    if (!absentReason.trim()) { addToast('error', 'Validation Error', 'Please add a reason/note for absence or leave'); return; }
    setIsSubmitting(true);
    try {
      await api.eod.markAbsentLeave(absentDate, absentReason.trim());
      addToast('success', 'Leave / Absent Marked', 'HR will see this date as Leave/Absent instead of Not Marked.');
      onSuccess();
      onClose();
    } catch (err: any) {
      addToast('error', 'Submission Failed', err.message || 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWork && eodBlocked) { addToast('error', 'EOD Locked', eodGate?.message || 'EOD submission is locked.'); return; }
    if (!title.trim()) { addToast('error', 'Validation Error', 'Title is required'); return; }
    if (!description.trim()) { addToast('error', 'Validation Error', 'Description is required'); return; }
    if (hoursSpent < 0.5 || hoursSpent > 24) { addToast('error', 'Validation Error', 'Hours spent must be between 0.5 and 24.0'); return; }
    setIsSubmitting(true);
    try {
      if (editingWork) {
        await api.works.update(editingWork.id, { title: title.trim(), description, hoursSpent, category, attachments });
        addToast('success', 'Work Updated', 'Your work entry has been updated and resubmitted for review.');
      } else {
        await api.works.create({ title: title.trim(), description, hoursSpent, category, attachments, eodDate: absentDate || eodGate?.date || undefined });
        addToast('success', 'Work Logged', 'Daily work update successfully submitted.');
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      addToast('error', 'Submission Failed', err.message || 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingWork ? 'Edit Work Entry' : entryMode === 'absent_leave' ? 'Not Applicable — Absent / Leave' : 'Log Daily Work Update'}
      subtitle={editingWork ? 'Modifying rejected work entry auto-resubmits to Pending status' : entryMode === 'absent_leave' ? 'HR will see this date as Leave/Absent instead of Not Marked' : 'Enter details of completed tasks today'}
      maxWidth="2xl"
    >
      {eodBlocked && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
          <Lock className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">EOD submission locked</p>
            <p className="mt-0.5 text-xs opacity-90">{eodGate?.message}</p>
          </div>
        </div>
      )}

      {!editingWork && (
        <div className="mb-5 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
          <button type="button" onClick={() => setEntryMode('work')} disabled={eodBlocked} className={`rounded-lg px-3 py-2 text-xs font-bold ${entryMode === 'work' ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Submit EOD</button>
          <button type="button" onClick={() => setEntryMode('absent_leave')} disabled={eodBlocked} className={`rounded-lg px-3 py-2 text-xs font-bold ${entryMode === 'absent_leave' ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Not Applicable — Absent/Leave</button>
        </div>
      )}

      {entryMode === 'absent_leave' && !editingWork ? (
        <form onSubmit={handleAbsentSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">Date <span className="text-rose-500">*</span></label>
            <input type="date" required value={absentDate} onChange={(e) => setAbsentDate(e.target.value)} disabled={Boolean(eodGate) || eodBlocked} className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none disabled:opacity-60" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">Reason / Note <span className="text-rose-500">*</span></label>
            <textarea required rows={4} value={absentReason} onChange={(e) => setAbsentReason(e.target.value)} disabled={eodBlocked} placeholder="e.g. On approved leave / sick leave / unofficial absence" className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none disabled:opacity-60" />
          </div>
          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting} disabled={eodBlocked}>Mark Leave / Absent</Button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">Work Title <span className="text-rose-500">*</span></label>
            <input id="work-title-input" type="text" required placeholder="e.g. Implemented GraphQL API Caching & Optimizations" value={title} onChange={(e) => setTitle(e.target.value)} disabled={eodBlocked} className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all disabled:opacity-60" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">Category / Project <span className="text-rose-500">*</span></label>
              <select id="work-category-select" value={category} onChange={(e) => setCategory(e.target.value)} disabled={eodBlocked} className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all disabled:opacity-60">
                {CATEGORIES.map((cat) => (<option key={cat} value={cat}>{cat}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">Hours Spent (0.5 - 24.0) <span className="text-rose-500">*</span></label>
              <input id="work-hours-input" type="number" step="0.5" min="0.5" max="24.0" required value={hoursSpent} onChange={(e) => setHoursSpent(parseFloat(e.target.value) || 0)} disabled={eodBlocked} className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all disabled:opacity-60" />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Description <span className="text-rose-500">*</span></label>
              <span className="text-[11px] text-slate-400">Rich text & bullet lists supported</span>
            </div>
            <div className="border border-slate-300 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-800 focus-within:ring-2 focus-within:ring-indigo-500">
              <div className="flex items-center space-x-1 p-2 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700/80">
                <button type="button" onClick={() => applyFormat('bold')} className="p-1.5 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold" title="Bold"><Bold className="w-4 h-4" /></button>
                <button type="button" onClick={() => applyFormat('italic')} className="p-1.5 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs italic" title="Italic"><Italic className="w-4 h-4" /></button>
                <button type="button" onClick={() => applyFormat('list')} className="p-1.5 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs" title="Bullet List"><List className="w-4 h-4" /></button>
                <button type="button" onClick={() => applyFormat('code')} className="p-1.5 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs" title="Code block"><Code className="w-4 h-4" /></button>
              </div>
              <textarea id="work-description-textarea" required rows={5} placeholder="Detail your work accomplishments..." value={description} onChange={(e) => setDescription(e.target.value)} disabled={eodBlocked} className="w-full p-3.5 bg-transparent text-slate-900 dark:text-white text-sm outline-none resize-y min-h-[120px] disabled:opacity-60" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Attachments ({attachments.length}/5 max, 10MB limit)</label>
            <div onDragOver={(e) => { e.preventDefault(); setDragActive(true); }} onDragLeave={() => setDragActive(false)} onDrop={(e) => { e.preventDefault(); setDragActive(false); if (!eodBlocked && e.dataTransfer.files) processFiles(Array.from(e.dataTransfer.files)); }} className={`border-2 border-dashed rounded-xl p-4 text-center transition-all ${dragActive ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40' : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400 bg-slate-50/50 dark:bg-slate-800/40'} ${eodBlocked ? 'pointer-events-none opacity-60' : ''}`}>
              <UploadCloud className="w-8 h-8 mx-auto text-slate-400 mb-1.5" />
              <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">Drag & drop files here, or <label className="text-indigo-600 dark:text-indigo-400 font-bold cursor-pointer hover:underline">browse files<input type="file" multiple onChange={(e) => e.target.files && processFiles(Array.from(e.target.files))} className="hidden" accept="image/*,.pdf,.doc,.docx,.txt,.zip" disabled={eodBlocked} /></label></p>
            </div>
            {attachments.length > 0 && (
              <div className="mt-3 space-y-2">
                {attachments.map((att, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800 text-xs">
                    <div className="flex items-center space-x-2.5 truncate">
                      <Paperclip className="w-4 h-4 text-indigo-500 shrink-0" />
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{att.fileName}</span>
                      <span className="text-[10px] text-slate-400 shrink-0">({(att.fileSize / 1024).toFixed(0)} KB)</span>
                    </div>
                    <button type="button" onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))} className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"><X className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="text-[11px] text-slate-500 flex items-center space-x-1"><AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" /><span>Status will automatically be set to 'Pending Review'</span></div>
            <div className="flex space-x-3">
              <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
              <Button id="submit-work-btn" type="submit" variant="primary" isLoading={isSubmitting} disabled={eodBlocked}>{editingWork ? 'Update & Resubmit' : 'Submit Work Log'}</Button>
            </div>
          </div>
        </form>
      )}
    </Modal>
  );
};

