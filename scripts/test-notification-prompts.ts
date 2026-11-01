import assert from 'assert';

/**
 * Pure evaluation function mirroring NotificationPrompts display logic
 */
export function determineNotificationPromptToShow(params: {
  isStandalone: boolean;
  isMobile: boolean;
  notificationPermission: string; // 'default' | 'granted' | 'denied'
  pwaDismissed: boolean;
  mobileDismissed: boolean;
  hasActiveSubscription?: boolean;
  isPushAllowedInDb?: boolean;
}): 'none' | 'mobile_instructions' | 'pwa_prompt' {
  const {
    isStandalone,
    isMobile,
    notificationPermission,
    pwaDismissed,
    mobileDismissed,
    hasActiveSubscription = false,
    isPushAllowedInDb = false,
  } = params;

  // If running in standalone PWA mode:
  // Must be default permission (not granted, not denied)
  // Must NOT have active browser subscription
  // Must NOT be marked as allowed in DB
  // Must NOT be dismissed in session
  if (isStandalone) {
    if (notificationPermission === 'granted' || notificationPermission === 'denied') {
      return 'none';
    }
    if (pwaDismissed) {
      return 'none';
    }
    if (isPushAllowedInDb) {
      return 'none';
    }
    if (hasActiveSubscription) {
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

console.log('🧪 Running Notification Prompts condition tests...\n');

// 1. Mobile browser with default permission -> shows mobile instructions
const test1 = determineNotificationPromptToShow({
  isStandalone: false,
  isMobile: true,
  notificationPermission: 'default',
  pwaDismissed: false,
  mobileDismissed: false,
});
assert.strictEqual(test1, 'mobile_instructions', 'Test 1 Failed: Expected mobile_instructions');
console.log('✅ [PASS] 1. Mobile browser with default permission shows mobile_instructions');

// 2. Mobile browser dismissed in session -> shows none
const test2 = determineNotificationPromptToShow({
  isStandalone: false,
  isMobile: true,
  notificationPermission: 'default',
  pwaDismissed: false,
  mobileDismissed: true,
});
assert.strictEqual(test2, 'none', 'Test 2 Failed: Expected none when mobile popup dismissed');
console.log('✅ [PASS] 2. Mobile browser dismissed in session shows none');

// 3. Mobile browser when permission already granted -> shows none
const test3 = determineNotificationPromptToShow({
  isStandalone: false,
  isMobile: true,
  notificationPermission: 'granted',
  pwaDismissed: false,
  mobileDismissed: false,
});
assert.strictEqual(test3, 'none', 'Test 3 Failed: Expected none when permission already granted');
console.log('✅ [PASS] 3. Mobile browser when permission already granted shows none');

// 4. Standalone PWA when notifications not connected -> shows pwa_prompt
const test4 = determineNotificationPromptToShow({
  isStandalone: true,
  isMobile: true,
  notificationPermission: 'default',
  pwaDismissed: false,
  mobileDismissed: false,
});
assert.strictEqual(test4, 'pwa_prompt', 'Test 4 Failed: Expected pwa_prompt');
console.log('✅ [PASS] 4. Standalone PWA with default permission shows pwa_prompt');

// 5. Standalone PWA dismissed in session -> shows none
const test5 = determineNotificationPromptToShow({
  isStandalone: true,
  isMobile: true,
  notificationPermission: 'default',
  pwaDismissed: true,
  mobileDismissed: false,
});
assert.strictEqual(test5, 'none', 'Test 5 Failed: Expected none when pwa popup dismissed');
console.log('✅ [PASS] 5. Standalone PWA dismissed in session shows none');

// 6. Standalone PWA when permission already granted -> shows none
const test6 = determineNotificationPromptToShow({
  isStandalone: true,
  isMobile: true,
  notificationPermission: 'granted',
  pwaDismissed: false,
  mobileDismissed: false,
});
assert.strictEqual(test6, 'none', 'Test 6 Failed: Expected none when PWA permission already granted');
console.log('✅ [PASS] 6. Standalone PWA when permission already granted shows none');

// 7. Desktop browser (not mobile, not standalone) -> shows none
const test7 = determineNotificationPromptToShow({
  isStandalone: false,
  isMobile: false,
  notificationPermission: 'default',
  pwaDismissed: false,
  mobileDismissed: false,
});
assert.strictEqual(test7, 'none', 'Test 7 Failed: Expected none on desktop');
console.log('✅ [PASS] 7. Desktop browser shows none');

// 8. Standalone PWA when permission denied -> shows none
const test8 = determineNotificationPromptToShow({
  isStandalone: true,
  isMobile: true,
  notificationPermission: 'denied',
  pwaDismissed: false,
  mobileDismissed: false,
  hasActiveSubscription: false,
  isPushAllowedInDb: false,
});
assert.strictEqual(test8, 'none', 'Test 8 Failed: Expected none when permission denied');
console.log('✅ [PASS] 8. Standalone PWA with denied permission shows none');

// 9. Standalone PWA when push is already allowed in DB -> shows none
const test9 = determineNotificationPromptToShow({
  isStandalone: true,
  isMobile: true,
  notificationPermission: 'default',
  pwaDismissed: false,
  mobileDismissed: false,
  hasActiveSubscription: false,
  isPushAllowedInDb: true,
});
assert.strictEqual(test9, 'none', 'Test 9 Failed: Expected none when push allowed in DB');
console.log('✅ [PASS] 9. Standalone PWA when push already allowed in DB shows none');

// 10. Standalone PWA when active browser subscription already exists -> shows none
const test10 = determineNotificationPromptToShow({
  isStandalone: true,
  isMobile: true,
  notificationPermission: 'default',
  pwaDismissed: false,
  mobileDismissed: false,
  hasActiveSubscription: true,
  isPushAllowedInDb: false,
});
assert.strictEqual(test10, 'none', 'Test 10 Failed: Expected none when browser subscription exists');
console.log('✅ [PASS] 10. Standalone PWA when active push subscription exists shows none');

console.log('\n📊 Summary: 10 passed, 0 failed.');
