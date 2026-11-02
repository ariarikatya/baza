'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { Bell, MoreHorizontal, MoreVertical, Share2, PlusSquare, X } from 'lucide-react';
import { useClubLogo } from '@/lib/useClubLogo';
import { urlBase64ToUint8Array, isPushAllowedClient } from '@/lib/webPushClient';
import { PlayerRow } from '@/types';

export function isStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
}

export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent || navigator.vendor || (window as any).opera || '';
  const isTouch = navigator.maxTouchPoints > 0;
  const isMobileUa = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/i.test(ua);
  return isMobileUa || (isTouch && window.innerWidth <= 768);
}

export function isAndroidDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return /android/i.test(navigator.userAgent);
}

interface NotificationPromptsProps {
  currentUser?: PlayerRow | null;
}

// In-memory dismissal flags fallback for environments where sessionStorage is partitioned or unstable (iOS Standalone WebKit)
let inMemoryPwaDismissed = false;
let inMemoryMobileDismissed = false;

export const NotificationPrompts: React.FC<NotificationPromptsProps> = ({ currentUser }) => {
  const clubLogoUrl = useClubLogo();
  const pathname = usePathname();
  const [user, setUser] = useState<PlayerRow | null>(currentUser || null);
  const [showMobileModal, setShowMobileModal] = useState<boolean>(false);
  const [showPwaModal, setShowPwaModal] = useState<boolean>(false);
  const [isAndroid, setIsAndroid] = useState<boolean>(false);
  const [isRequesting, setIsRequesting] = useState<boolean>(false);

  const userRef = useRef<PlayerRow | null>(currentUser || null);

  useEffect(() => {
    if (currentUser) {
      userRef.current = currentUser;
      setUser(currentUser);
    }
  }, [currentUser]);

  const evaluatePrompts = useCallback(async () => {
    if (typeof window === 'undefined') return;

    const { getSavedUserSession, restoreUserSessionAsync } = await import('@/lib/session');
    let effectiveUser = currentUser || userRef.current || getSavedUserSession();
    if (!effectiveUser) {
      effectiveUser = await restoreUserSessionAsync();
    }
    if (effectiveUser) {
      userRef.current = effectiveUser;
      setUser(effectiveUser);
    }

    const standalone = isStandaloneMode();
    const mobile = isMobileDevice();
    const android = isAndroidDevice();
    setIsAndroid(android);

    if (standalone) {
      // PWA popup criteria:
      // a) Application runs in standalone mode (display-mode: standalone or navigator.standalone)
      // b) Push notifications NOT allowed: column «Веб-уведомления» is empty/not «Разрешено»
      //    (isPushAllowedClient returns false) AND Notification.permission !== 'granted'
      const hasNotificationApi = 'Notification' in window;
      if (!hasNotificationApi) return;

      const permission = Notification.permission;
      if (permission === 'granted' || permission === 'denied') {
        setShowPwaModal(false);
        return;
      }

      // Check in-memory and sessionStorage dismissal ("Напомнить позже" until app restart)
      let pwaDismissed = inMemoryPwaDismissed;
      if (!pwaDismissed) {
        try {
          pwaDismissed = Boolean(sessionStorage.getItem('baza_dismiss_pwa_notify_popup'));
        } catch (e) {}
      }
      if (pwaDismissed) {
        setShowPwaModal(false);
        return;
      }

      // Requirement: Only show for authenticated user whose DB push status is not allowed.
      // If user is not yet logged in (e.g. on /login or splash), do not show PWA push popup
      // to avoid premature unauthenticated dismissals or failing to bind to a player.
      if (!effectiveUser) {
        setShowPwaModal(false);
        return;
      }

      // If already marked as allowed in Google Sheets, never show popup
      if (isPushAllowedClient(effectiveUser)) {
        setShowPwaModal(false);
        return;
      }

      // All criteria met: show PWA popup
      setShowPwaModal(true);
    } else if (mobile) {
      // Mobile popup: only on mobile devices (in browser) if not granted
      const isGranted = 'Notification' in window && Notification.permission === 'granted';
      if (isGranted) {
        setShowMobileModal(false);
        return;
      }

      let mobileDismissed = inMemoryMobileDismissed;
      if (!mobileDismissed) {
        try {
          mobileDismissed = Boolean(sessionStorage.getItem('baza_dismiss_mobile_notify_popup'));
        } catch (e) {}
      }
      if (!mobileDismissed) {
        setShowMobileModal(true);
      }
    }
  }, [currentUser]);

  // Reactive evaluation on mount, navigation, user changes, and session events
  useEffect(() => {
    evaluatePrompts();

    const handleSessionEvent = (e?: any) => {
      if (e?.detail) {
        userRef.current = e.detail;
        setUser(e.detail);
      }
      evaluatePrompts();
    };

    const handleAppReady = () => {
      evaluatePrompts();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        evaluatePrompts();
      }
    };

    window.addEventListener('baza:session-updated', handleSessionEvent);
    window.addEventListener('user-session-restored', handleSessionEvent);
    window.addEventListener('login-success', handleSessionEvent);
    window.addEventListener('app:ready', handleAppReady);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('baza:session-updated', handleSessionEvent);
      window.removeEventListener('user-session-restored', handleSessionEvent);
      window.removeEventListener('login-success', handleSessionEvent);
      window.removeEventListener('app:ready', handleAppReady);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [evaluatePrompts, pathname]);

  // Lock body scroll when any modal is open
  useEffect(() => {
    if (showMobileModal || showPwaModal) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [showMobileModal, showPwaModal]);

  const handleDismissMobile = () => {
    setShowMobileModal(false);
    inMemoryMobileDismissed = true;
    try {
      sessionStorage.setItem('baza_dismiss_mobile_notify_popup', '1');
    } catch (e) {}
  };

  const handleDismissPwa = () => {
    setShowPwaModal(false);
    inMemoryPwaDismissed = true;
    try {
      sessionStorage.setItem('baza_dismiss_pwa_notify_popup', '1');
    } catch (e) {}
  };

  const handlePwaContinue = async () => {
    setIsRequesting(true);
    try {
      if (!('Notification' in window)) {
        handleDismissPwa();
        return;
      }

      // 1. Show system permission request
      const permission = await Notification.requestPermission();

      if (permission === 'granted') {
        let sub: PushSubscription | null = null;

        // Try to register service worker and get push subscription
        if ('serviceWorker' in navigator && 'PushManager' in window) {
          try {
            await navigator.serviceWorker.register('/sw.js').catch(() => {});
            const reg = await navigator.serviceWorker.ready;
            const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
            if (vapidPublicKey) {
              sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as unknown as BufferSource,
              });
            }
          } catch (pushErr) {
            console.warn('Push registration error in PWA prompt:', pushErr);
          }
        }

        // 2. Persist to database that permission is granted
        const { getSavedUserSession, restoreUserSessionAsync, saveUserSession } = await import('@/lib/session');
        const activeUser = currentUser || userRef.current || user || getSavedUserSession() || (await restoreUserSessionAsync());
        if (activeUser) {
          try {
            await fetch('/api/push/subscribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: activeUser['User ID'],
                nick: activeUser['Ник'],
                rowId: activeUser['🔒 Row ID'],
                email: activeUser['Email'],
                subscription: sub,
                action: 'explicit_enable',
              }),
            });
          } catch (err) {
            console.error('Failed to persist push subscription:', err);
          }

          const updated = {
            ...activeUser,
            'Веб-уведомления': 'Разрешено',
          };
          saveUserSession(updated);
          userRef.current = updated;
          setUser(updated);
        }
      }

      // Close popup after request
      handleDismissPwa();
    } catch (err) {
      console.error('handlePwaContinue error:', err);
      handleDismissPwa();
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <>
      {/* 1) Mobile Instruction Popup (browser on mobile) */}
      {showMobileModal && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4 pt-safe pb-safe pl-safe pr-safe backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 w-full max-w-md shadow-2xl relative max-h-[85dvh] overflow-y-auto overscroll-y-contain flex flex-col space-y-5">
            <button
              onClick={handleDismissMobile}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition p-1"
              aria-label="Закрыть"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header: Notification icon + Title */}
            <div className="flex items-center gap-3.5 pr-6">
              <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-sky-400 flex items-center justify-center shrink-0 shadow-lg shadow-sky-500/10">
                <Bell className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white leading-tight">
                  Как включить уведомления
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Инструкция по настройке
                </p>
              </div>
            </div>

            {/* Steps Container */}
            <div className="space-y-2.5 text-xs text-slate-300">
              {isAndroid ? (
                /* Android specific instructions */
                <>
                  <div className="flex items-start gap-3 p-3 bg-slate-800/60 rounded-2xl border border-white/5">
                    <div className="w-8 h-8 rounded-xl bg-slate-700/60 flex items-center justify-center shrink-0 text-sky-400 mt-0.5">
                      <MoreVertical className="w-4 h-4" />
                    </div>
                    <p className="leading-snug self-center">
                      Нажмите на три точки в правом верхнем углу экрана
                    </p>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-slate-800/60 rounded-2xl border border-white/5">
                    <div className="w-8 h-8 rounded-xl bg-slate-700/60 flex items-center justify-center shrink-0 text-sky-400 mt-0.5">
                      <PlusSquare className="w-4 h-4" />
                    </div>
                    <p className="leading-snug self-center">
                      Выберите «Установить приложение» или «Добавить на главный экран»
                    </p>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-slate-800/60 rounded-2xl border border-white/5">
                    <img
                      src={clubLogoUrl || '/icons/logo.png'}
                      alt="Иконка приложения"
                      className="w-8 h-8 rounded-xl object-cover border border-white/10 shrink-0 mt-0.5"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/icons/logo.png';
                      }}
                    />
                    <p className="leading-snug self-center">
                      На главном экране появится иконка. Нажмите на нее.
                    </p>
                  </div>
                </>
              ) : (
                /* iOS / standard mobile instructions */
                <>
                  <div className="flex items-start gap-3 p-3 bg-slate-800/60 rounded-2xl border border-white/5">
                    <div className="w-8 h-8 rounded-xl bg-slate-700/60 flex items-center justify-center shrink-0 text-sky-400 mt-0.5">
                      <MoreHorizontal className="w-4 h-4" />
                    </div>
                    <p className="leading-snug self-center">
                      Нажмите на три точки внизу экрана. Если их нет сразу на следующий шаг
                    </p>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-slate-800/60 rounded-2xl border border-white/5">
                    <div className="w-8 h-8 rounded-xl bg-slate-700/60 flex items-center justify-center shrink-0 text-sky-400 mt-0.5">
                      <Share2 className="w-4 h-4" />
                    </div>
                    <p className="leading-snug self-center">
                      Выберите Поделиться
                    </p>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-slate-800/60 rounded-2xl border border-white/5">
                    <div className="w-8 h-8 rounded-xl bg-slate-700/60 flex items-center justify-center shrink-0 text-sky-400 mt-0.5">
                      <PlusSquare className="w-4 h-4" />
                    </div>
                    <p className="leading-snug self-center">
                      Добавьте на экран «Домой»
                    </p>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-slate-800/60 rounded-2xl border border-white/5">
                    <img
                      src={clubLogoUrl || '/icons/logo.png'}
                      alt="Иконка приложения"
                      className="w-8 h-8 rounded-xl object-cover border border-white/10 shrink-0 mt-0.5"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/icons/logo.png';
                      }}
                    />
                    <p className="leading-snug self-center">
                      На главном экране появится иконка. Нажмите на нее.
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Action button: Remind later */}
            <div className="pt-2">
              <button
                onClick={handleDismissMobile}
                className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700/80 active:bg-slate-700 text-slate-300 font-semibold rounded-2xl border border-white/10 transition-colors text-sm min-h-[44px]"
              >
                Напомнить позже
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2) PWA Instruction Popup (only PWA and notifications not connected) */}
      {showPwaModal && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4 pt-safe pb-safe pl-safe pr-safe backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 w-full max-w-sm shadow-2xl relative flex flex-col items-center text-center space-y-6">
            {/* Bell Icon */}
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-[#014373] to-sky-600 flex items-center justify-center text-white shadow-xl shadow-[#014373]/30 border border-white/10">
              <Bell className="w-8 h-8 animate-pulse" />
            </div>

            {/* Centered instruction text */}
            <p className="text-center text-base font-medium text-white leading-relaxed px-2">
              Чтобы получать уведомления, нажмите «Разрешить» в следующем окне
            </p>

            {/* Buttons: Продолжить + Напомнить позже */}
            <div className="w-full space-y-2.5 pt-2">
              <button
                onClick={handlePwaContinue}
                disabled={isRequesting}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-[#014373] to-sky-600 hover:from-[#013357] hover:to-sky-700 active:scale-[0.98] text-white font-bold rounded-2xl shadow-lg shadow-[#014373]/30 border border-white/10 transition text-sm min-h-[48px] flex items-center justify-center"
              >
                {isRequesting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Продолжить'
                )}
              </button>

              <button
                onClick={handleDismissPwa}
                disabled={isRequesting}
                className="w-full py-3 px-4 bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-semibold rounded-2xl border border-white/10 transition-colors text-sm min-h-[44px]"
              >
                Напомнить позже
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
