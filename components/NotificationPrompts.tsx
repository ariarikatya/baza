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
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string>('');

  // Debug state for ?debug=1
  const [isDebugMode, setIsDebugMode] = useState<boolean>(false);
  const [debugInfo, setDebugInfo] = useState<{
    isStandalone: boolean;
    dbPushStatus: string;
    isDbAllowed: boolean;
    hasVapidKey: boolean;
    hasSession: boolean;
    userNick: string;
    lastLogReason: string;
  }>({
    isStandalone: false,
    dbPushStatus: 'unknown',
    isDbAllowed: false,
    hasVapidKey: false,
    hasSession: false,
    userNick: '',
    lastLogReason: '',
  });

  const userRef = useRef<PlayerRow | null>(currentUser || null);
  const sessionRetryCountRef = useRef<number>(0);
  const isEvaluatingRef = useRef<boolean>(false);
  const appReadyReceivedRef = useRef<boolean>(false);

  useEffect(() => {
    if (currentUser) {
      userRef.current = currentUser;
      setUser(currentUser);
    }
  }, [currentUser]);

  // Check URL query for ?debug=1
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      setIsDebugMode(searchParams.get('debug') === '1');
    }
  }, [pathname]);

  const updateDebugReason = (reason: string, extra?: Partial<typeof debugInfo>) => {
    setDebugInfo((prev) => ({
      ...prev,
      lastLogReason: reason,
      ...extra,
    }));
  };

  /**
   * Helper to wait for active user session with up to 5 retries (1s each)
   */
  const waitForSession = async (): Promise<PlayerRow | null> => {
    const { getSavedUserSession, restoreUserSessionAsync } = await import('@/lib/session');
    let effective = currentUser || userRef.current || getSavedUserSession();
    if (effective) return effective;

    effective = await restoreUserSessionAsync();
    if (effective) return effective;

    // Retry loop: up to 5 times with 1 second delay
    for (let attempt = 1; attempt <= 5; attempt++) {
      sessionRetryCountRef.current = attempt;
      await new Promise((resolve) => setTimeout(resolve, 1000));
      effective = currentUser || userRef.current || getSavedUserSession();
      if (effective) return effective;
      effective = await restoreUserSessionAsync();
      if (effective) return effective;
    }

    return null;
  };

  const evaluatePrompts = useCallback(async () => {
    if (typeof window === 'undefined') return;
    if (isEvaluatingRef.current) return;
    isEvaluatingRef.current = true;

    try {
      const standalone = isStandaloneMode();
      const mobile = isMobileDevice();
      const android = isAndroidDevice();
      setIsAndroid(android);

      const hasVapid = Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);

      if (standalone) {
        // 1. Standalone check
        // Check session dismissal flag ("Напомнить позже" until app restart)
        let pwaDismissed = inMemoryPwaDismissed;
        if (!pwaDismissed) {
          try {
            pwaDismissed = Boolean(sessionStorage.getItem('baza_dismiss_pwa_notify_popup'));
          } catch (e) {}
        }
        if (pwaDismissed) {
          console.log('[NotificationPrompts] Early return: dismissed in session (Напомнить позже)');
          updateDebugReason('dismissed in session', {
            isStandalone: true,
            hasVapidKey: hasVapid,
          });
          setShowPwaModal(false);
          return;
        }

        // Wait for session resolution (with 5 retries x 1 sec)
        const effectiveUser = await waitForSession();
        if (effectiveUser) {
          userRef.current = effectiveUser;
          setUser(effectiveUser);
        }

        // 2. Session check
        if (!effectiveUser) {
          console.log('[NotificationPrompts] Early return: no session (session is null after retries)');
          updateDebugReason('no session', {
            isStandalone: true,
            hasSession: false,
            hasVapidKey: hasVapid,
          });
          setShowPwaModal(false);
          return;
        }

        // 3. Database push status check
        // First check local session representation, then verify with /api/push/status
        let isAllowedInDb = isPushAllowedClient(effectiveUser);
        let dbFlag = String(effectiveUser['Веб-уведомления'] || '');

        try {
          const statusRes = await fetch(
            `/api/push/status?userId=${encodeURIComponent(
              effectiveUser['User ID'] || ''
            )}&nick=${encodeURIComponent(
              effectiveUser['Ник'] || ''
            )}&rowId=${encodeURIComponent(
              effectiveUser['🔒 Row ID'] || ''
            )}&_t=${Date.now()}`,
            { cache: 'no-store' }
          );
          if (statusRes.ok) {
            const statusJson = await statusRes.json();
            if (statusJson.success) {
              isAllowedInDb = Boolean(statusJson.allowed);
              dbFlag = statusJson.flag || '';
            }
          }
        } catch (statusErr) {
          console.warn('[NotificationPrompts] Could not fetch /api/push/status, falling back to local user flag:', statusErr);
        }

        updateDebugReason(
          isAllowedInDb ? 'push already allowed in DB' : 'prompt eligible',
          {
            isStandalone: true,
            hasSession: true,
            dbPushStatus: dbFlag || '(empty)',
            isDbAllowed: isAllowedInDb,
            hasVapidKey: hasVapid,
            userNick: effectiveUser['Ник'] || '',
          }
        );

        if (isAllowedInDb) {
          console.log('[NotificationPrompts] Early return: push already allowed in DB', {
            nick: effectiveUser['Ник'],
            flag: dbFlag,
          });
          setShowPwaModal(false);
          return;
        }

        // All 3 conditions met:
        // - isStandalone === true
        // - session !== null
        // - DB «Веб-уведомления» !== «Разрешено»
        // Notice: Notification.permission is NOT used to block popup display.
        setShowPwaModal(true);
      } else {
        // Not standalone
        console.log('[NotificationPrompts] Early return: not standalone');
        updateDebugReason('not standalone', {
          isStandalone: false,
          hasVapidKey: hasVapid,
        });
        setShowPwaModal(false);

        // Mobile browser fallback installation prompt
        if (mobile) {
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
      }
    } finally {
      isEvaluatingRef.current = false;
    }
  }, [currentUser]);

  // Reactive evaluation on mount, navigation, session events, and app:ready
  useEffect(() => {
    // If app:ready was already fired or window loaded
    evaluatePrompts();

    const handleSessionEvent = (e?: any) => {
      if (e?.detail) {
        userRef.current = e.detail;
        setUser(e.detail);
      }
      evaluatePrompts();
    };

    const handleAppReady = () => {
      appReadyReceivedRef.current = true;
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

  /**
   * Primary action for iOS PWA: subscribeToPush()
   * Requests permission, subscribes SW PushManager, and on success sends PATCH to DB.
   * On error: displays error message and does NOT write to DB.
   */
  const subscribeToPush = async () => {
    setIsRequesting(true);
    setErrorMessage('');

    try {
      if (!('Notification' in window)) {
        throw new Error('Ваш браузер не поддерживает Web Notifications');
      }

      // 1. Request permission
      let permission: NotificationPermission = Notification.permission;
      if (typeof Notification.requestPermission === 'function') {
        try {
          permission = await Notification.requestPermission();
        } catch (permErr: any) {
          throw new Error('Не удалось запросить разрешение: ' + (permErr?.message || permErr));
        }
      }

      if (permission !== 'granted') {
        throw new Error('Разрешение не предоставлено. Откройте Настройки Safari → Сайт → Уведомления → Разрешить');
      }

      // 2. Register Service Worker and subscribe PushManager
      let subscription: PushSubscription | null = null;
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        try {
          await navigator.serviceWorker.register('/sw.js').catch(() => {});
          const reg = await navigator.serviceWorker.ready;
          const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
          if (vapidPublicKey) {
            try {
              subscription = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as unknown as BufferSource,
              });
            } catch (subErr: any) {
              console.warn('pushManager.subscribe warning (continuing with permission):', subErr);
            }
          }
        } catch (swErr) {
          console.warn('Service worker registration warning:', swErr);
        }
      }

      // 3. Persist "Разрешено" to DB via PATCH /api/push/status
      const { getSavedUserSession, restoreUserSessionAsync, saveUserSession } = await import('@/lib/session');
      const activeUser =
        currentUser || userRef.current || user || getSavedUserSession() || (await restoreUserSessionAsync());

      if (!activeUser) {
        throw new Error('Сессия пользователя не найдена. Попробуйте войти снова.');
      }

      const patchRes = await fetch('/api/push/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: activeUser['User ID'],
          nick: activeUser['Ник'],
          rowId: activeUser['🔒 Row ID'],
          email: activeUser['Email'],
          status: 'Разрешено',
          subscription,
        }),
      });

      const patchJson = await patchRes.json().catch(() => ({}));
      if (!patchRes.ok || !patchJson.success) {
        throw new Error(patchJson.error || 'Не удалось обновить статус в базе данных');
      }

      // Update local session
      const updatedUser = {
        ...activeUser,
        'Веб-уведомления': patchJson.status || 'Разрешено',
      };
      saveUserSession(updatedUser);
      userRef.current = updatedUser;
      setUser(updatedUser);

      // Show success toast and close popup
      setToastMessage('Уведомления успешно включены!');
      setTimeout(() => {
        setToastMessage('');
        handleDismissPwa();
      }, 1500);
    } catch (err: any) {
      console.error('subscribeToPush error:', err);
      setErrorMessage(err?.message || 'Не удалось включить уведомления');
      // Do NOT write to DB on error
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <>
      {/* Diagnostics / Debug Panel (?debug=1) */}
      {isDebugMode && (
        <div className="fixed top-2 left-2 right-2 z-[10002] bg-black/90 text-white border border-amber-500/50 rounded-xl p-3 text-xs font-mono shadow-2xl space-y-1">
          <div className="flex justify-between items-center text-amber-400 font-bold border-b border-white/10 pb-1">
            <span>DEBUG: iOS PWA Push Prompts</span>
            <button
              onClick={() => setIsDebugMode(false)}
              className="text-slate-400 hover:text-white px-1"
            >
              ✕
            </button>
          </div>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 pt-1">
            <div>
              <span className="text-slate-400">isStandalone: </span>
              <span className={debugInfo.isStandalone ? 'text-green-400' : 'text-red-400'}>
                {String(debugInfo.isStandalone)}
              </span>
            </div>
            <div>
              <span className="text-slate-400">hasVapidKey: </span>
              <span className={debugInfo.hasVapidKey ? 'text-green-400' : 'text-red-400'}>
                {String(debugInfo.hasVapidKey)}
              </span>
            </div>
            <div>
              <span className="text-slate-400">DB Push Status: </span>
              <span className={debugInfo.isDbAllowed ? 'text-green-400' : 'text-amber-400'}>
                {debugInfo.dbPushStatus || 'none'}
              </span>
            </div>
            <div>
              <span className="text-slate-400">Session User: </span>
              <span className="text-sky-300">{debugInfo.userNick || '(none)'}</span>
            </div>
            <div className="col-span-2">
              <span className="text-slate-400">Last Reason: </span>
              <span className="text-yellow-300">{debugInfo.lastLogReason || 'none'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {toastMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[10003] bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-2xl font-medium text-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-200">
          <Bell className="w-4 h-4 text-white" />
          <span>{toastMessage}</span>
        </div>
      )}

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

      {/* 2) PWA Instruction Popup (iOS PWA: higher z-index than splash screen z-[9999]) */}
      {showPwaModal && (
        <div className="fixed inset-0 z-[10001] bg-black/80 flex items-center justify-center p-4 pt-safe pb-safe pl-safe pr-safe backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 w-full max-w-sm shadow-2xl relative flex flex-col items-center space-y-5">
            {/* Bell Icon */}
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-[#014373] to-sky-600 flex items-center justify-center text-white shadow-xl shadow-[#014373]/30 border border-white/10">
              <Bell className="w-8 h-8 animate-pulse" />
            </div>

            {/* Header */}
            <h3 className="text-lg font-bold text-white text-center">
              Чтобы получать уведомления
            </h3>

            {/* 3-Step Centered Instruction for iOS PWA */}
            <div className="w-full space-y-2 text-center text-xs text-slate-300 px-2">
              <p className="leading-relaxed">
                1. Нажмите «Продолжить» ниже
              </p>
              <p className="leading-relaxed">
                2. Разрешите уведомления во всплывающем окне браузера
              </p>
              <p className="leading-relaxed text-slate-400">
                3. Если окна нет: откройте Настройки Safari → Сайт → Уведомления → Разрешить
              </p>
            </div>

            {/* Error Message if subscription or permission failed */}
            {errorMessage && (
              <div className="w-full p-3 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-300 text-xs text-center leading-snug">
                {errorMessage}
              </div>
            )}

            {/* Buttons: «Продолжить» + «Напомнить позже» */}
            <div className="w-full space-y-2.5 pt-1">
              <button
                onClick={subscribeToPush}
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
