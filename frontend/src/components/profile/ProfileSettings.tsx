import React, { useEffect, useState } from 'react';
import { UserCircle2, Save, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { api } from '../../services/api';
import { Button } from '../common/Button';

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana',
  'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
  'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
];

const inputClass =
  'w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white';

export const ProfileSettings: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const { addToast } = useToast();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [state, setState] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    setFullName(user?.fullName || '');
    setEmail(user?.email || '');
    setEmployeeId(user?.employeeId || '');
    setMobileNumber(user?.mobileNumber || '');
    setState(user?.state || '');
  }, [user]);

  if (!user) return null;

  const canEditEmployeeId = ['employee', 'manager', 'admin', 'super_admin'].includes(user.role);

  const handleProfileSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (mobileNumber && !/^\d{10}$/.test(mobileNumber.trim())) {
      addToast('error', 'Validation Error', 'Mobile number must be a 10-digit number.');
      return;
    }
    setIsSaving(true);
    try {
      await api.auth.updateProfile({
        fullName,
        email,
        state: state || null,
        employeeId: employeeId || null,
        mobileNumber: mobileNumber || null,
      });
      await refreshUser();
      addToast('success', 'Profile Updated', 'Your profile settings have been saved.');
    } catch (error: any) {
      addToast('error', 'Profile Update Failed', error.message || 'Could not save profile settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      addToast('error', 'Validation Error', 'New password and confirm password do not match.');
      return;
    }
    if (newPassword.length < 6) {
      addToast('error', 'Validation Error', 'New password must be at least 6 characters.');
      return;
    }
    setIsSavingPassword(true);
    try {
      await api.auth.changePassword({ currentPassword, newPassword, confirmPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      addToast('success', 'Password Updated', 'Your password has been changed.');
    } catch (error: any) {
      addToast('error', 'Password Update Failed', error.message || 'Could not change password.');
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white">Profile Settings</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Update your personal details and password separately.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      <form onSubmit={handleProfileSubmit} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-5 shadow-xs">
        <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
            <UserCircle2 className="h-6 w-6" />
          </div>
          <div>
            <p className="font-bold text-slate-900 dark:text-white capitalize">{user.role.replace('_', ' ')}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{user.department} Department</p>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold uppercase text-slate-700 dark:text-slate-300">Employee ID</label>
          <input
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            disabled={!canEditEmployeeId}
            placeholder="Optional employee code"
            className={`${inputClass} disabled:opacity-60`}
          />
          {!canEditEmployeeId && (
            <p className="mt-1 text-[11px] text-slate-400">Employee ID can only be changed by an administrator.</p>
          )}
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold uppercase text-slate-700 dark:text-slate-300">Name *</label>
          <input required value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold uppercase text-slate-700 dark:text-slate-300">Mobile Number</label>
          <input
            type="tel"
            inputMode="numeric"
            maxLength={10}
            value={mobileNumber}
            onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
            placeholder="10-digit mobile number"
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold uppercase text-slate-700 dark:text-slate-300">Email *</label>
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold uppercase text-slate-700 dark:text-slate-300">State</label>
          <select value={state} onChange={(e) => setState(e.target.value)} className={inputClass}>
            <option value="">Select State</option>
            {INDIAN_STATES.map((stateName) => (
              <option key={stateName} value={stateName}>
                {stateName}
              </option>
            ))}
          </select>
        </div>
        <div className="flex justify-end border-t border-slate-100 pt-4 dark:border-slate-800">
          <Button type="submit" variant="primary" isLoading={isSaving} icon={<Save className="h-4 w-4" />}>
            Save Profile
          </Button>
        </div>
      </form>

      <form onSubmit={handlePasswordSubmit} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-5 shadow-xs">
        <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-300">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <p className="font-bold text-slate-900 dark:text-white">Change Password</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Current password must match before the new password is saved.</p>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold uppercase text-slate-700 dark:text-slate-300">Current Password *</label>
          <div className="relative">
            <input
              required
              type={showCurrentPassword ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={inputClass}
            />
            <button
              type="button"
              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg transition-colors"
              aria-label={showCurrentPassword ? 'Hide current password' : 'Show current password'}
            >
              {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold uppercase text-slate-700 dark:text-slate-300">New Password *</label>
          <div className="relative">
            <input
              required
              type={showNewPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={inputClass}
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg transition-colors"
              aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
            >
              {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold uppercase text-slate-700 dark:text-slate-300">Confirm New Password *</label>
          <div className="relative">
            <input
              required
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={inputClass}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg transition-colors"
              aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {confirmPassword && newPassword !== confirmPassword && (
            <p className="mt-1 text-[11px] font-medium text-rose-500">Passwords do not match.</p>
          )}
        </div>
        <div className="flex justify-end border-t border-slate-100 pt-4 dark:border-slate-800">
          <Button type="submit" variant="primary" isLoading={isSavingPassword} icon={<Lock className="h-4 w-4" />}>
            Update Password
          </Button>
        </div>
      </form>
      </div>
    </div>
  );
};
