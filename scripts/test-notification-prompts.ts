import assert from 'assert';

/**
 * Pure evaluation function mirroring updated iOS PWA NotificationPrompts display logic
 */
export function determineNotificationPromptToShow(params: {
  isStandalone: boolean;
  isMobile: boolean;
  hasSession: boolean;
  isPushAllowedInDb: boolean;
  pwaDismissed: boolean;
  mobileDismissed: boolean;
  notificationPermission?: string; // Informative only, not used for standalone prompt decision!
}): 'none' | 'mobile_instructions' | 'pwa_prompt' {
  const {
    isStandalone,
    isMobile,
    hasSession,
    isPushAllowedInDb,
    pwaDismissed,
    mobileDismissed,
    notificationPermission = 'default',
  } = params;

  // iOS PWA Popup Criteria:
  // 1. isStandalone === true
  // 2. Session restored (hasSession === true)
  // 3. Database field «Веб-уведомления» is NOT «Разрешено» (isPushAllowedInDb === false)
  // 4. Not dismissed in session (pwaDismissed === false)
  // NOTE: Notification.permission is NOT used to decide whether to show!
  if (isStandalone) {
    if (pwaDismissed) {
      return 'none';
    }
    if (!hasSession) {
      return 'none';
    }
    if (isPushAllowedInDb) {
      return 'none';
    }
    return 'pwa_prompt';
  }

  // If running in standard mobile browser
  if (isMobile) {
    if (notificationPermission === 'granted') {
      return 'none';
    }
    if (!mobileDismissed) {
      return 'mobile_instructions';
    }
    return 'none';
  }

  return 'none';
}

console.log('🧪 Running Notification Prompts condition tests (iOS PWA updated logic)...\n');

// 1. Mobile browser with default permission -> shows mobile instructions
const test1 = determineNotificationPromptToShow({
  isStandalone: false,
  isMobile: true,
  hasSession: true,
  isPushAllowedInDb: false,
  pwaDismissed: false,
  mobileDismissed: false,
  notificationPermission: 'default',
});
assert.strictEqual(test1, 'mobile_instructions', 'Test 1 Failed: Expected mobile_instructions');
console.log('✅ [PASS] 1. Mobile browser with default permission shows mobile_instructions');

// 2. Mobile browser dismissed in session -> shows none
const test2 = determineNotificationPromptToShow({
  isStandalone: false,
  isMobile: true,
  hasSession: true,
  isPushAllowedInDb: false,
  pwaDismissed: false,
  mobileDismissed: true,
  notificationPermission: 'default',
});
assert.strictEqual(test2, 'none', 'Test 2 Failed: Expected none when mobile popup dismissed');
console.log('✅ [PASS] 2. Mobile browser dismissed in session shows none');

// 3. Mobile browser when permission already granted -> shows none
const test3 = determineNotificationPromptToShow({
  isStandalone: false,
  isMobile: true,
  hasSession: true,
  isPushAllowedInDb: false,
  pwaDismissed: false,
  mobileDismissed: false,
  notificationPermission: 'granted',
});
assert.strictEqual(test3, 'none', 'Test 3 Failed: Expected none when permission already granted');
console.log('✅ [PASS] 3. Mobile browser when permission already granted shows none');

// 4. Standalone PWA when session restored & push not allowed in DB -> shows pwa_prompt
const test4 = determineNotificationPromptToShow({
  isStandalone: true,
  isMobile: true,
  hasSession: true,
  isPushAllowedInDb: false,
  pwaDismissed: false,
  mobileDismissed: false,
  notificationPermission: 'default',
});
assert.strictEqual(test4, 'pwa_prompt', 'Test 4 Failed: Expected pwa_prompt');
console.log('✅ [PASS] 4. Standalone PWA with restored session and not allowed in DB shows pwa_prompt');

// 5. Standalone PWA dismissed in session -> shows none
const test5 = determineNotificationPromptToShow({
  isStandalone: true,
  isMobile: true,
  hasSession: true,
  isPushAllowedInDb: false,
  pwaDismissed: true,
  mobileDismissed: false,
  notificationPermission: 'default',
});
assert.strictEqual(test5, 'none', 'Test 5 Failed: Expected none when pwa popup dismissed');
console.log('✅ [PASS] 5. Standalone PWA dismissed in session shows none');

// 6. Standalone PWA when browser permission is denied but DB is NOT allowed -> STILL shows pwa_prompt!
// (Key requirement: Notification.permission is NOT used to decide display, status in DB is paramount)
const test6 = determineNotificationPromptToShow({
  isStandalone: true,
  isMobile: true,
  hasSession: true,
  isPushAllowedInDb: false,
  pwaDismissed: false,
  mobileDismissed: false,
  notificationPermission: 'denied',
});
assert.strictEqual(test6, 'pwa_prompt', 'Test 6 Failed: Expected pwa_prompt even if Notification.permission is denied/default');
console.log('✅ [PASS] 6. Standalone PWA does NOT gate on Notification.permission (shows prompt when DB is not allowed)');

// 7. Standalone PWA when no session restored yet -> shows none
const test7 = determineNotificationPromptToShow({
  isStandalone: true,
  isMobile: true,
  hasSession: false,
  isPushAllowedInDb: false,
  pwaDismissed: false,
  mobileDismissed: false,
  notificationPermission: 'default',
});
assert.strictEqual(test7, 'none', 'Test 7 Failed: Expected none when session is null');
console.log('✅ [PASS] 7. Standalone PWA without session shows none');

// 8. Desktop browser (not mobile, not standalone) -> shows none
const test8 = determineNotificationPromptToShow({
  isStandalone: false,
  isMobile: false,
  hasSession: true,
  isPushAllowedInDb: false,
  pwaDismissed: false,
  mobileDismissed: false,
});
assert.strictEqual(test8, 'none', 'Test 8 Failed: Expected none on desktop');
console.log('✅ [PASS] 8. Desktop browser shows none');

// 9. Standalone PWA when push is already allowed in DB -> shows none
const test9 = determineNotificationPromptToShow({
  isStandalone: true,
  isMobile: true,
  hasSession: true,
  isPushAllowedInDb: true,
  pwaDismissed: false,
  mobileDismissed: false,
});
assert.strictEqual(test9, 'none', 'Test 9 Failed: Expected none when push already allowed in DB');
console.log('✅ [PASS] 9. Standalone PWA when push already allowed in DB shows none');

console.log('\n📊 Summary: 9 passed, 0 failed.');
