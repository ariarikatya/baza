import { chromium } from 'playwright';
import assert from 'assert';

async function verifyAll() {
  console.log('🚀 Starting E2E verification of iOS PWA Push Notification Prompt...\n');

  const browser = await chromium.launch({ headless: true });

  const setupContext = async () => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
    });

    const page = await context.newPage();

    await page.addInitScript(() => {
      Object.defineProperty(window.navigator, 'standalone', { get: () => true });
      const origMatchMedia = window.matchMedia;
      window.matchMedia = function(query) {
        if (query.includes('(display-mode: standalone)')) {
          return {
            matches: true,
            media: query,
            onchange: null,
            addListener: () => {},
            removeListener: () => {},
            addEventListener: () => {},
            removeEventListener: () => {},
            dispatchEvent: () => false,
          };
        }
        return origMatchMedia.call(window, query);
      };

      if ('Notification' in window) {
        let currentPerm = 'default';
        Object.defineProperty(Notification, 'permission', {
          get: () => currentPerm,
          set: (v) => { currentPerm = v; },
          configurable: true,
        });

        Notification.requestPermission = async () => {
          currentPerm = 'granted';
          return 'granted';
        };
      }
    });

    return { context, page };
  };

  // ==========================================
  // SCENARIO 1: Standalone + User without «Разрешено» in DB -> Popup is visible on entry
  // ==========================================
  console.log('--- TEST 1: User without "Разрешено" sees popup in standalone PWA ---');
  {
    const { context, page } = await setupContext();

    // Mock GET /api/push/status for this user
    await page.route('**/api/push/status*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          allowed: false,
          flag: '',
          hasVapidKey: true,
        }),
      });
    });

    await page.goto('http://localhost:3000/home', { waitUntil: 'domcontentloaded' });

    // Set logged-in user in session (empty push column)
    await page.evaluate(() => {
      const mockUser = {
        'User ID': 'p_101',
        'Ник': 'TestGamer',
        '🔒 Row ID': 'row_p_101',
        'Email': 'gamer@baza.ru',
        'Бан': false,
        'Веб-уведомления': '',
      };
      localStorage.setItem('baza_user', JSON.stringify(mockUser));
      // Dispatch session update
      window.dispatchEvent(new CustomEvent('baza:session-updated', { detail: mockUser }));
    });

    await page.waitForTimeout(600);
    const popupVisible = await page.locator('text=Чтобы получать уведомления').isVisible();
    assert.strictEqual(popupVisible, true, 'Test 1 Failed: Popup header should be visible');

    const step1Visible = await page.locator('text=1. Нажмите «Продолжить» ниже').isVisible();
    const step2Visible = await page.locator('text=2. Разрешите уведомления во всплывающем окне браузера').isVisible();
    const step3Visible = await page.locator('text=3. Если окна нет: откройте Настройки Safari → Сайт → Уведомления → Разрешить').isVisible();
    assert.strictEqual(step1Visible, true, 'Test 1 Failed: Step 1 text missing');
    assert.strictEqual(step2Visible, true, 'Test 1 Failed: Step 2 text missing');
    assert.strictEqual(step3Visible, true, 'Test 1 Failed: Step 3 text missing');
    console.log('✅ [PASS] 1. Popup with 3-step iOS instructions is visible for logged-in user without "Разрешено"');

    // Take screenshot for PR verification
    await page.screenshot({ path: 'verification_pwa_push_popup.png' });
    console.log('📸 Screenshot saved: verification_pwa_push_popup.png');

    await context.close();
  }

  // ==========================================
  // SCENARIO 2: Click "Напомнить позже" -> Popup closes, nothing written to DB
  // ==========================================
  console.log('\n--- TEST 2: "Напомнить позже" dismisses popup without subscribing ---');
  {
    const { context, page } = await setupContext();
    let patchStatusCalled = false;
    await page.route('**/api/push/status*', (route) => {
      if (route.request().method() === 'PATCH') {
        patchStatusCalled = true;
        route.fulfill({ status: 200, body: JSON.stringify({ success: true }) });
      } else {
        route.fulfill({
          status: 200,
          body: JSON.stringify({ success: true, allowed: false, flag: '', hasVapidKey: true }),
        });
      }
    });

    await page.goto('http://localhost:3000/home', { waitUntil: 'domcontentloaded' });

    await page.evaluate(() => {
      const mockUser = {
        'User ID': 'p_102',
        'Ник': 'TestGamer2',
        '🔒 Row ID': 'row_p_102',
        'Email': 'gamer2@baza.ru',
        'Бан': false,
        'Веб-уведомления': '',
      };
      localStorage.setItem('baza_user', JSON.stringify(mockUser));
      window.dispatchEvent(new CustomEvent('baza:session-updated', { detail: mockUser }));
    });

    await page.waitForTimeout(600);
    await page.click('button:has-text("Напомнить позже")');
    await page.waitForTimeout(400);

    const popupVisible = await page.locator('text=Чтобы получать уведомления').isVisible();
    assert.strictEqual(popupVisible, false, 'Test 2 Failed: Popup should be hidden after dismiss');
    assert.strictEqual(patchStatusCalled, false, 'Test 2 Failed: PATCH /api/push/status must NOT be called on dismiss');

    // Navigating between pages should not reopen prompt in this session
    await page.goto('http://localhost:3000/rating', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const popupVisibleOnRating = await page.locator('text=Чтобы получать уведомления').isVisible();
    assert.strictEqual(popupVisibleOnRating, false, 'Test 2 Failed: Popup should stay dismissed for session');
    console.log('✅ [PASS] 2. "Напомнить позже" closes popup and does not call PATCH /api/push/status');

    await context.close();
  }

  // ==========================================
  // SCENARIO 3: Click "Продолжить" -> Permission granted, PATCH /api/push/status «Разрешено», toast, session updated, popup closed
  // ==========================================
  console.log('\n--- TEST 3: "Продолжить" requests permission, calls PATCH /api/push/status and updates session ---');
  {
    const { context, page } = await setupContext();
    let patchRequestBody = null;
    await page.route('**/api/push/status*', async (route) => {
      if (route.request().method() === 'PATCH') {
        patchRequestBody = JSON.parse(route.request().postData());
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, status: 'Разрешено', allowed: true }),
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, allowed: false, flag: '', hasVapidKey: true }),
        });
      }
    });

    await page.goto('http://localhost:3000/home', { waitUntil: 'domcontentloaded' });

    await page.evaluate(() => {
      const mockUser = {
        'User ID': 'p_103',
        'Ник': 'TestGamer3',
        '🔒 Row ID': 'row_p_103',
        'Email': 'gamer3@baza.ru',
        'Бан': false,
        'Веб-уведомления': '',
      };
      localStorage.setItem('baza_user', JSON.stringify(mockUser));
      window.dispatchEvent(new CustomEvent('baza:session-updated', { detail: mockUser }));
    });

    await page.waitForTimeout(600);
    await page.click('button:has-text("Продолжить")');
    await page.waitForTimeout(1600);

    assert.ok(patchRequestBody !== null, 'Test 3 Failed: PATCH /api/push/status should have been called');
    assert.strictEqual(patchRequestBody.status, 'Разрешено', 'Test 3 Failed: status must be Разрешено');
    assert.strictEqual(patchRequestBody.userId, 'p_103');
    assert.strictEqual(patchRequestBody.nick, 'TestGamer3');

    // Check localStorage session was updated
    const updatedUserInLs = await page.evaluate(() => JSON.parse(localStorage.getItem('baza_user')));
    assert.strictEqual(updatedUserInLs['Веб-уведомления'], 'Разрешено', 'Test 3 Failed: local session should have "Веб-уведомления" = "Разрешено"');

    const popupVisibleAfterContinue = await page.locator('text=Чтобы получать уведомления').isVisible();
    assert.strictEqual(popupVisibleAfterContinue, false, 'Test 3 Failed: Popup should close after "Продолжить"');
    console.log('✅ [PASS] 3. "Продолжить" requested permission, saved to DB via PATCH, updated session, and closed popup');

    await context.close();
  }

  // ==========================================
  // SCENARIO 4: User with «Разрешено» in DB -> Popup NEVER shows
  // ==========================================
  console.log('\n--- TEST 4: User with "Разрешено" in DB never sees popup ---');
  {
    const { context, page } = await setupContext();
    await page.route('**/api/push/status*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          allowed: true,
          flag: 'Разрешено',
          hasVapidKey: true,
        }),
      });
    });

    await page.goto('http://localhost:3000/home', { waitUntil: 'domcontentloaded' });

    await page.evaluate(() => {
      const mockUser = {
        'User ID': 'p_104',
        'Ник': 'TestGamer4',
        '🔒 Row ID': 'row_p_104',
        'Email': 'gamer4@baza.ru',
        'Бан': false,
        'Веб-уведомления': 'Разрешено',
      };
      localStorage.setItem('baza_user', JSON.stringify(mockUser));
      window.dispatchEvent(new CustomEvent('baza:session-updated', { detail: mockUser }));
    });

    await page.waitForTimeout(800);
    const popupVisible = await page.locator('text=Чтобы получать уведомления').isVisible();
    assert.strictEqual(popupVisible, false, 'Test 4 Failed: Popup should NOT be visible when DB status is "Разрешено"');
    console.log('✅ [PASS] 4. User with "Разрешено" never sees the popup');

    await context.close();
  }

  // ==========================================
  // SCENARIO 5: Unauthenticated user on login page -> Popup is NOT shown before login
  // ==========================================
  console.log('\n--- TEST 5: Unauthenticated visitor does not see PWA popup prematurely ---');
  {
    const { context, page } = await setupContext();
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);

    const popupVisible = await page.locator('text=Чтобы получать уведомления').isVisible();
    assert.strictEqual(popupVisible, false, 'Test 5 Failed: Popup should not appear before user logs in');
    console.log('✅ [PASS] 5. Unauthenticated user does not see popup on /login');

    await context.close();
  }

  // ==========================================
  // SCENARIO 6: Debug panel (?debug=1)
  // ==========================================
  console.log('\n--- TEST 6: Debug panel is displayed when ?debug=1 is set ---');
  {
    const { context, page } = await setupContext();
    await page.route('**/api/push/status*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          allowed: false,
          flag: '',
          hasVapidKey: true,
        }),
      });
    });

    await page.goto('http://localhost:3000/home?debug=1', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      const mockUser = {
        'User ID': 'p_106',
        'Ник': 'DebugUser',
        '🔒 Row ID': 'row_p_106',
        'Email': 'debug@baza.ru',
        'Бан': false,
        'Веб-уведомления': '',
      };
      localStorage.setItem('baza_user', JSON.stringify(mockUser));
      window.dispatchEvent(new CustomEvent('baza:session-updated', { detail: mockUser }));
    });

    await page.waitForTimeout(800);
    const debugPanelVisible = await page.locator('text=DEBUG: iOS PWA Push Prompts').isVisible();
    assert.strictEqual(debugPanelVisible, true, 'Test 6 Failed: Debug panel should be visible with ?debug=1');
    console.log('✅ [PASS] 6. Debug panel is displayed when ?debug=1 is provided');

    await context.close();
  }

  await browser.close();
  console.log('\n🎉 ALL E2E VERIFICATION SCENARIOS PASSED SUCCESSFULLY!');
}

verifyAll().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
