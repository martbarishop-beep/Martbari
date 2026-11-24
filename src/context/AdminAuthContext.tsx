import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { logActivity } from '../lib/auth';
import { supabase } from '../lib/supabase';
import type { Profile, UserRole } from '../types';

const LAST_ACTIVITY_KEY = 'martbari_admin_last_activity';
const MAX_INACTIVITY_MS = 8 * 60 * 60 * 1000; // 8 hours auto logout

interface AdminAuthContextValue {
  user: User | null;
  profile: Profile | null;
  role: UserRole | null;
  loading: boolean;
  canAccess: (permission: 'staff' | 'settings' | 'catalog' | 'orders' | 'reports') => boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Inactivity tracking
  const updateActivity = useCallback(() => {
    try {
      window.localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
    } catch {
      // Ignore
    }
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    try {
      await logActivity('logout', 'auth', user?.id, { email: user?.email });
      await supabase.auth.signOut();
    } catch {
      // Ignore
    } finally {
      setUser(null);
      setProfile(null);
      try {
        window.localStorage.removeItem(LAST_ACTIVITY_KEY);
      } catch {
        // Ignore
      }
    }
  }, [user]);

  const loadUserProfile = useCallback(async (authUser: User) => {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      if (error || !data) return null;
      const prof = data as Profile;

      // Only allow admin, manager, staff with is_active = true
      if (!prof.is_active || (prof.role !== 'admin' && prof.role !== 'manager' && prof.role !== 'staff')) {
        return null;
      }
      return prof;
    } catch {
      return null;
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const prof = await loadUserProfile(user);
    if (!prof) {
      void signOut();
    } else {
      setProfile(prof);
    }
  }, [user, loadUserProfile, signOut]);

  // Auth state listener and session check
  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    const client = supabase;

    let mounted = true;
    let initialCheckDone = false;

    async function checkCurrentSession() {
      // Check 8-hour inactivity
      try {
        const lastAct = window.localStorage.getItem(LAST_ACTIVITY_KEY);
        if (lastAct && Date.now() - Number(lastAct) > MAX_INACTIVITY_MS) {
          await client.auth.signOut();
          window.localStorage.removeItem(LAST_ACTIVITY_KEY);
          initialCheckDone = true;
          if (mounted) {
            setUser(null);
            setProfile(null);
            setLoading(false);
          }
          return;
        }
      } catch {
        // Ignore
      }

      // First restore/refresh session from storage so an expired access token doesn't cause a false logout on reload
      const { data: sessionData } = await client.auth.getSession();
      if (!sessionData?.session) {
        initialCheckDone = true;
        if (mounted) {
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
        return;
      }

      const { data, error: getUserError } = await client.auth.getUser();
      const authUser = data?.user ?? (getUserError ? sessionData.session.user : null);

      if (!authUser) {
        initialCheckDone = true;
        if (mounted) {
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
        return;
      }

      const userProf = await loadUserProfile(authUser);
      initialCheckDone = true;
      if (!mounted) return;

      if (!userProf) {
        // User exists in auth but has no staff/admin profile or is inactive
        await client.auth.signOut();
        setUser(null);
        setProfile(null);
      } else {
        setUser(authUser);
        setProfile(userProf);
        updateActivity();
      }
      setLoading(false);
    }

    void checkCurrentSession();

    const { data: authListener } = client.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        // Let checkCurrentSession drive the initial loading -> resolved transition cleanly
        if (event === 'INITIAL_SESSION' && !initialCheckDone) {
          return;
        }
        const nextUser = session?.user ?? null;
        if (!nextUser) {
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }

        const userProf = await loadUserProfile(nextUser);
        if (!mounted) return;
        if (!userProf) {
          await client.auth.signOut();
          setUser(null);
          setProfile(null);
        } else {
          setUser(nextUser);
          setProfile(userProf);
          updateActivity();
        }
        setLoading(false);
      },
    );

    // Track user clicks/keypress to renew activity timestamp
    const onUserInteraction = () => updateActivity();
    window.addEventListener('click', onUserInteraction, { passive: true });
    window.addEventListener('keydown', onUserInteraction, { passive: true });

    return () => {
      mounted = false;
      authListener?.subscription.unsubscribe();
      window.removeEventListener('click', onUserInteraction);
      window.removeEventListener('keydown', onUserInteraction);
    };
  }, [loadUserProfile, updateActivity]);

  const role = profile?.role ?? null;

  // Role permissions checker:
  // admin = everything
  // manager = everything except staff & critical settings
  // staff = orders and customers only
  const canAccess = useCallback(
    (permission: 'staff' | 'settings' | 'catalog' | 'orders' | 'reports'): boolean => {
      if (!role) return false;
      if (role === 'admin') return true;

      if (role === 'manager') {
        if (permission === 'staff' || permission === 'settings') return false;
        return true;
      }

      if (role === 'staff') {
        return permission === 'orders';
      }

      return false;
    },
    [role],
  );

  const value = useMemo<AdminAuthContextValue>(
    () => ({
      user,
      profile,
      role,
      loading,
      canAccess,
      signOut,
      refreshProfile,
    }),
    [user, profile, role, loading, canAccess, signOut, refreshProfile],
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
};

export function useAdminAuth(): AdminAuthContextValue {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) {
    throw new Error('useAdminAuth must be used inside AdminAuthProvider');
  }
  return ctx;
}
