import { supabase } from './supabase';
import type { ActivityLog } from '../types';

export async function logActivity(
  action: string,
  entity: string,
  entityId?: string | null,
  details?: Record<string, unknown> | null,
): Promise<void> {
  if (!supabase) return;
  try {
    const { data: authData } = await supabase.auth.getUser();
    await supabase.from('activity_logs').insert({
      user_id: authData?.user?.id ?? null,
      action,
      entity,
      entity_id: entityId ?? null,
      details: details ?? null,
    });
  } catch {
    // Activity logging should never crash the caller
  }
}

const FAILED_LOGIN_KEY = 'martbari_failed_logins';
const LOCKOUT_MINUTES = 5;
const MAX_ATTEMPTS = 5;

interface LockoutState {
  attempts: number;
  lockedUntil: number | null;
}

export function getLoginLockout(): { isLocked: boolean; remainingSeconds: number } {
  try {
    const raw = window.localStorage.getItem(FAILED_LOGIN_KEY);
    if (!raw) return { isLocked: false, remainingSeconds: 0 };
    const state: LockoutState = JSON.parse(raw);
    if (state.lockedUntil && state.lockedUntil > Date.now()) {
      return {
        isLocked: true,
        remainingSeconds: Math.ceil((state.lockedUntil - Date.now()) / 1000),
      };
    }
  } catch {
    // Ignore
  }
  return { isLocked: false, remainingSeconds: 0 };
}

export function recordFailedLogin(): { isLocked: boolean; remainingSeconds: number } {
  try {
    const raw = window.localStorage.getItem(FAILED_LOGIN_KEY);
    let state: LockoutState = raw ? JSON.parse(raw) : { attempts: 0, lockedUntil: null };

    // Reset if previous lock expired
    if (state.lockedUntil && state.lockedUntil < Date.now()) {
      state = { attempts: 0, lockedUntil: null };
    }

    state.attempts += 1;
    if (state.attempts >= MAX_ATTEMPTS) {
      state.lockedUntil = Date.now() + LOCKOUT_MINUTES * 60 * 1000;
      window.localStorage.setItem(FAILED_LOGIN_KEY, JSON.stringify(state));
      return { isLocked: true, remainingSeconds: LOCKOUT_MINUTES * 60 };
    }

    window.localStorage.setItem(FAILED_LOGIN_KEY, JSON.stringify(state));
  } catch {
    // Ignore
  }
  return { isLocked: false, remainingSeconds: 0 };
}

export function resetFailedLogins(): void {
  try {
    window.localStorage.removeItem(FAILED_LOGIN_KEY);
  } catch {
    // Ignore
  }
}
