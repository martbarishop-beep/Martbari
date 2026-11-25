import React, { useEffect, useState } from 'react';
import { AlertCircle, ArrowRight, CheckCircle2, Lock, Mail, ShieldAlert } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button, Input } from '../../components/ui';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useAdminLanguage } from '../../context/AdminLanguageContext';
import { getLoginLockout, logActivity, recordFailedLogin, resetFailedLogins } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';

export const AdminLoginPage: React.FC = () => {
  const { user, profile, loading: authLoading } = useAdminAuth();
  const { adminLang, setAdminLang, at } = useAdminLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Forgot password flow
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  // Lockout countdown state
  const [lockoutSecs, setLockoutSecs] = useState<number>(0);

  useEffect(() => {
    const { isLocked, remainingSeconds } = getLoginLockout();
    if (isLocked) {
      setLockoutSecs(remainingSeconds);
    }
  }, []);

  useEffect(() => {
    if (lockoutSecs <= 0) return;
    const timer = setInterval(() => {
      setLockoutSecs((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutSecs]);

  // If already logged in with authorized role, redirect immediately to intended admin route
  useEffect(() => {
    if (!authLoading && user && profile && profile.is_active) {
      const from = (location.state as { from?: string })?.from || '/admin';
      navigate(from, { replace: true });
    }
  }, [authLoading, user, profile, navigate, location.state]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (lockoutSecs > 0) {
      setErrorMessage(
        adminLang === 'bn'
          ? `অনেকবার ভুল চেষ্টার কারণে ${lockoutSecs} সেকেন্ডের জন্য লক করা হয়েছে।`
          : `Too many failed attempts. Locked for ${lockoutSecs} more seconds.`,
      );
      return;
    }

    if (!supabase) {
      setErrorMessage('Supabase client is not configured.');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error || !data.user) {
        const lockout = recordFailedLogin();
        if (lockout.isLocked) {
          setLockoutSecs(lockout.remainingSeconds);
          setErrorMessage(
            adminLang === 'bn'
              ? 'পরপর ৫ বার ভুল পাসওয়ার্ড দেওয়ায় অ্যাকাউন্টটি ৫ মিনিটের জন্য লক করা হয়েছে।'
              : 'Account temporarily locked for 5 minutes due to 5 consecutive failed login attempts.',
          );
        } else {
          setErrorMessage(error?.message || 'Invalid email or password.');
        }
        setLoading(false);
        return;
      }

      // Check profile permissions
      const { data: profData, error: profErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .maybeSingle();

      if (profErr || !profData) {
        await supabase.auth.signOut();
        setErrorMessage('Profile record not found for this account.');
        setLoading(false);
        return;
      }

      const prof = profData as { role: string; is_active: boolean };

      if (!prof.is_active) {
        await supabase.auth.signOut();
        setErrorMessage(
          adminLang === 'bn'
            ? 'এই স্টাফ অ্যাকাউন্টটি নিষ্ক্রিয় করা হয়েছে।'
            : 'This staff account has been deactivated. Contact an administrator.',
        );
        setLoading(false);
        return;
      }

      if (prof.role !== 'admin' && prof.role !== 'manager' && prof.role !== 'staff') {
        await supabase.auth.signOut();
        setErrorMessage(
          adminLang === 'bn'
            ? 'অ্যাক্সেস অনুমোদিত নয়। এটি শুধুমাত্র মার্টবাড়ি স্টাফদের জন্য।'
            : 'Access denied. This portal is restricted to MartBari staff members.',
        );
        setLoading(false);
        return;
      }

      // Successful authorized login
      resetFailedLogins();
      await logActivity('login', 'auth', data.user.id, { email: data.user.email, role: prof.role });

      const from = (location.state as { from?: string })?.from || '/admin';
      navigate(from, { replace: true });
    } catch {
      setErrorMessage('Network error while signing in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !supabase) return;

    setLoading(true);
    setErrorMessage(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/admin/login`,
      });
      if (error) {
        setErrorMessage(error.message);
      } else {
        setResetEmailSent(true);
      }
    } catch {
      setErrorMessage('Failed to send reset link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <html lang={adminLang} />
        <title>
          {at('login.title')} — MartBari
        </title>
      </Helmet>

      <div
        className={`flex min-h-screen items-center justify-center bg-[#17263E] p-4 text-[#0F1A2C] ${
          adminLang === 'bn' ? 'font-bangla' : 'font-english'
        }`}
      >
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white p-6 sm:p-8 shadow-card">
          {/* Brand lockup + EN / বাংলা Switcher */}
          <div className="flex items-center justify-between gap-3 border-b border-[#17263E]/10 pb-5">
            <div className="flex items-center gap-3 min-w-0">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F47125] text-xl font-bold text-white shadow-sm">
                M
              </span>
              <div className="min-w-0">
                <h1 className="truncate text-lg font-bold text-[#0F1A2C]">{at('login.title')}</h1>
                <p className="truncate text-xs text-[#5B6577]">{at('login.subtitle')}</p>
              </div>
            </div>

            <div
              role="group"
              aria-label={at('lang.switch')}
              className="inline-flex shrink-0 items-center rounded-xl border border-[#17263E]/12 bg-[#F5F7FA] p-0.5"
            >
              <button
                type="button"
                onClick={() => setAdminLang('en')}
                className={cn(
                  'rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer',
                  adminLang === 'en' ? 'bg-[#17263E] text-white' : 'text-[#5B6577] hover:text-[#0F1A2C]',
                )}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setAdminLang('bn')}
                className={cn(
                  'rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer',
                  adminLang === 'bn' ? 'bg-[#F47125] text-white' : 'text-[#5B6577] hover:text-[#0F1A2C]',
                )}
              >
                বাংলা
              </button>
            </div>
          </div>

          {errorMessage && (
            <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-[#DC2626]/20 bg-[#DC2626]/5 p-3 text-xs text-[#DC2626]">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {resetEmailSent ? (
            <div className="mt-6 text-center space-y-3">
              <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#16A34A]/10 text-[#16A34A]">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h2 className="text-base font-bold text-[#0F1A2C]">{at('login.resetSentTitle')}</h2>
              <p className="text-xs text-[#5B6577] leading-relaxed">
                {at('login.resetSentDesc', { email })}
              </p>
              <button
                type="button"
                onClick={() => {
                  setResetEmailSent(false);
                  setIsForgotPassword(false);
                }}
                className="mt-3 text-xs font-semibold text-[#F47125] hover:underline cursor-pointer"
              >
                {at('login.backToSignIn')}
              </button>
            </div>
          ) : isForgotPassword ? (
            <form onSubmit={handleResetPassword} className="mt-6 space-y-4">
              <div>
                <h2 className="text-base font-bold text-[#0F1A2C]">{at('login.resetTitle')}</h2>
                <p className="mt-1 text-xs text-[#5B6577]">{at('login.resetDesc')}</p>
              </div>

              <Input
                label={at('login.staffEmail')}
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="staff@martbari.pages.dev"
                leftIcon={<Mail className="h-4 w-4" />}
              />

              <Button type="submit" fullWidth loading={loading}>
                {at('login.sendReset')}
              </Button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setIsForgotPassword(false)}
                  className="text-xs font-semibold text-[#5B6577] hover:text-[#0F1A2C] cursor-pointer"
                >
                  {at('login.cancelReturn')}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="mt-6 space-y-4">
              <Input
                label={at('login.emailLabel')}
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@martbari.pages.dev"
                leftIcon={<Mail className="h-4 w-4" />}
              />

              <div>
                <Input
                  label={at('login.passwordLabel')}
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  leftIcon={<Lock className="h-4 w-4" />}
                />
                <div className="mt-1.5 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setIsForgotPassword(true)}
                    className="text-[11px] font-semibold text-[#F47125] hover:underline cursor-pointer"
                  >
                    {at('login.forgotPassword')}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                fullWidth
                disabled={lockoutSecs > 0 || loading}
                loading={loading}
                rightIcon={<ArrowRight className="h-4 w-4" />}
              >
                {lockoutSecs > 0 ? at('login.locked', { secs: lockoutSecs }) : at('login.signIn')}
              </Button>

              <div className="rounded-xl bg-[#F5F7FA] p-3 text-[11px] text-[#5B6577] flex items-start gap-2">
                <ShieldAlert className="h-4 w-4 text-[#17263E] shrink-0 mt-0.5" />
                <span>{at('login.staffNotice')}</span>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
};
