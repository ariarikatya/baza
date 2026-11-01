'use client';

import React, { useEffect, useState } from 'react';
import { Bell, MoreHorizontal, MoreVertical, Share2, PlusSquare, X } from 'lucide-react';
import { useClubLogo } from '@/lib/useClubLogo';
import { urlBase64ToUint8Array } from '@/lib/webPushClient';
import { PlayerRow } from '@/types';

export function isStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    window.location.search.includes('pwa=1') ||
    document.referrer.includes('android-app://')
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

export const NotificationPrompts: React.FC<NotificationPromptsProps> = ({ currentUser }) => {
  const clubLogoUrl = useClubLogo();
  const [showMobileModal, setShowMobileModal] = useState<boolean>(false);
  const [showPwaModal, setShowPwaModal] = useState<boolean>(false);
  const [isAndroid, setIsAndroid] = useState<boolean>(false);
  const [isRequesting, setIsRequesting] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const standalone = isStandaloneMode();
    const mobile = isMobileDevice();
    const android = isAndroidDevice();
    setIsAndroid(android);

    // Check if notifications are already granted
    const isGranted =
      'Notification' in window && Notification.permission === 'granted';

    if (isGranted) {
      // Notifications are already connected
      return;
    }

    if (standalone) {
      // 2) PWA popup: only if PWA and notifications are not connected
      const pwaDismissed = sessionStorage.getItem('baza_dismiss_pwa_notify_popup');
      if (!pwaDismissed) {
        setShowPwaModal(true);
      }
    } else if (mobile) {
      // 1) Mobile popup: only on mobile devices (in browser)
      const mobileDismissed = sessionStorage.getItem('baza_dismiss_mobile_notify_popup');
      if (!mobileDismissed) {
        setShowMobileModal(true);
      }
    }
  }, []);

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
    try {
      sessionStorage.setItem('baza_dismiss_mobile_notify_popup', '1');
    } catch (e) {}
  };

  const handleDismissPwa = () => {
    setShowPwaModal(false);
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
        if (currentUser) {
          await fetch('/api/push/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: currentUser['User ID'],
              nick: currentUser['Ник'],
              rowId: currentUser['🔒 Row ID'],
              email: currentUser['Email'],
              subscription: sub,
              action: 'explicit_enable',
            }),
          }).catch((err) => console.error('Failed to persist push subscription:', err));
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
