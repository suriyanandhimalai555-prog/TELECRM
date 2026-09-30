import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/common/Button';
import { ShieldCheck, Lock, Mail, ArrowRight, Eye, EyeOff } from 'lucide-react';
import appLogo from '../assets/images/icon.png';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(email, password);
    } catch (e) {
      // Handled in context
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = async (quickEmail: string, quickPass: string) => {
    setEmail(quickEmail);
    setPassword(quickPass);
    setIsLoading(true);
    try {
      await login(quickEmail, quickPass);
    } catch (e) {
      // Handled in context
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-10 w-80 h-80 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center">
          <img
            src={appLogo}
            alt="Work Tracker Logo"
            className="w-12 h-12 rounded-2xl object-contain bg-slate-900 border border-slate-700/80 p-0.5 shadow-xl shadow-indigo-500/30"
          />
        </div>
        <h2 className="mt-4 text-center text-2xl font-black text-white tracking-tight">Work Tracker Enterprise</h2>
        <p className="mt-1 text-center text-xs text-slate-400">Sign in to log work entries, review team updates, or view analytics</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-slate-900 border border-slate-800 py-8 px-6 shadow-2xl rounded-3xl sm:px-10">
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="login-email-input"
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="login-password-input"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button id="login-submit-btn" type="submit" variant="primary" size="lg" className="w-full shadow-lg" isLoading={isLoading}>
              Sign In
            </Button>
          </form>

          {/* Seed Super Admin Quick Login Card */}
          <div className="mt-8 pt-6 border-t border-slate-800/80">
            {/* <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5 text-center">
              Seed Super Admin Account
            </p> */}

            {/* <button
              type="button"
              onClick={() => handleQuickLogin('md@company.com', 'md@1230')}
              className="w-full p-3 rounded-xl border border-purple-800/80 bg-purple-950/40 hover:bg-purple-900/50 text-purple-100 text-xs flex items-center justify-between font-medium transition-all shadow-md"
            >
              <div className="flex items-center space-x-2.5">
                <ShieldCheck className="w-4 h-4 text-purple-400 shrink-0" />
                <div className="text-left">
                  <p className="font-bold">Super Admin (`md@company.com`)</p>
                  <p className="text-[10px] text-purple-300/80">Password: `md@1230`</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 opacity-70" />
            </button> */}

            {/* <p className="text-[11px] text-slate-400 mt-3 text-center leading-relaxed">
              Log in with Super Admin to create all additional employees, managers, and roles via User Management.
            </p> */}
          </div>
        </div>
      </div>
    </div>
  );
};
