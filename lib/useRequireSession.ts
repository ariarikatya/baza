'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PlayerRow } from '@/types';
import { getSavedUserSession, restoreUserSessionAsync, saveUserSession } from '@/lib/session';
import { isClubAdmin } from '@/lib/permissions';

interface UseRequireSessionOptions {
  redirectTo?: string;
  adminOnly?: boolean;
  requireRole?: boolean;
}

export function useRequireSession(options: UseRequireSessionOptions = {}) {
  const { redirectTo = '/login', adminOnly = false, requireRole = false } = options;
  const router = useRouter();
  const [user, setUser] = useState<PlayerRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function checkSession() {
      try {
        let current = getSavedUserSession();
        if (!current) {
          current = await restoreUserSessionAsync();
        }

        if (!isMounted) return;

        if (!current) {
          setLoading(false);
          router.push(redirectTo);
          return;
        }

        // Ban check
        const isBanned =
          current['Бан'] === true ||
          String(current['Бан'] || '').toLowerCase() === 'true' ||
          String(current['Бан'] || '') === '1';

        if (isBanned) {
          setLoading(false);
          router.push(redirectTo);
          return;
        }

        // Admin permissions check
        if (adminOnly) {
          if (!isClubAdmin(current)) {
            setLoading(false);
            router.push('/home');
            return;
          }
        }

        // Non-empty role check if required
        if (requireRole) {
          const roleStr = String(current['Роль'] || '').trim();
          if (!roleStr) {
            setLoading(false);
            router.push('/home');
            return;
          }
        }

        setUser(current);
        saveUserSession(current); // Slide session
        setLoading(false);
      } catch (err) {
        console.error('Session check error:', err);
        if (isMounted) {
          setLoading(false);
          router.push(redirectTo);
        }
      }
    }

    checkSession();

    return () => {
      isMounted = false;
    };
  }, [router, redirectTo, adminOnly, requireRole]);

  return { user, setUser, loading };
}
