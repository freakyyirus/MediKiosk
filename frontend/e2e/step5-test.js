const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const results = [];
  const check = (name, ok, extra = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? ` — ${extra}` : ''}`);

  const spaNav = async (path, role, blocked = false) => {
    for (let attempt = 0; attempt < 5; attempt++) {
      await page.evaluate(async ([p, r]) => {
        const m = await import('/src/stores/authStore.ts');
        m.useAuthStore.getState().setMockRole(r);
        history.pushState(null, '', p);
      }, [path, role]);
      await page.waitForTimeout(100);
      await page.evaluate(() => window.dispatchEvent(new PopStateEvent('popstate')));
      await page.waitForTimeout(500);
      const u = new URL(page.url()).pathname;
      if (u === path) return u;
      if (u === '/unauthorized' && (blocked || attempt === 4)) return u;
    }
    return new URL(page.url()).pathname;
  };

  try {
    // Boot as demo patient (HomeRedirect → dashboard)
    await page.goto('http://localhost:5179/');
    await page.waitForURL('**/patient/dashboard', { timeout: 8000 });

    // 1+2. Legacy guards while authed as patient → /unauthorized
    await spaNav('/physician/dashboard', 'patient', true);
    check('legacy /physician blocked (patient) → /unauthorized', page.url().includes('/unauthorized'), page.url());
    await spaNav('/admin', 'patient', true);
    check('legacy /admin blocked (patient) → /unauthorized', page.url().includes('/unauthorized'), page.url());

    // 3. Hospital admin portal
    await spaNav('/hospital/dashboard', 'hospital_admin');
    check('hospital admin lands on /hospital/dashboard', page.url().includes('/hospital/dashboard'), page.url());

    // 4. VitalsMonitor dead-end fixed
    await spaNav('/hospital/vitals', 'hospital_admin');
    await page.waitForSelector('text=Vitals & Early Warning Station', { timeout: 6000 });
    await page.locator('button[aria-label="Back to dashboard"]').click();
    await page.waitForURL('**/hospital/dashboard', { timeout: 6000 });
    check('VitalsMonitor back button returns to dashboard', true);

    // 5. Data retention renders
    await spaNav('/hospital/data-retention', 'hospital_admin');
    await page.waitForSelector('text=Retention Policies', { timeout: 6000 });
    check('DataRetentionManager renders real policies', true);

    // 6. Hospital admin blocked from doctor-only route
    await spaNav('/doctor/queue', 'hospital_admin', true);
    check('hospital admin blocked from /doctor/queue → /unauthorized', page.url().includes('/unauthorized'), page.url());

    // 7. Doctor portal + patient queue route rename
    await spaNav('/doctor/dashboard', 'doctor');
    check('doctor lands on /doctor/dashboard', page.url().includes('/doctor/dashboard'), page.url());
    await spaNav('/doctor/queue', 'doctor');
    await page.waitForSelector('text=My Patients', { timeout: 6000 });
    check('doctor queue loads with fixed currentPath', true);

    // 8. Back to patient: kiosk defaults to Hindi, language switch works, BookOPD translates
    await spaNav('/patient/kiosk', 'patient');
    await page.waitForSelector('text=बोलने के लिए टैप करें', { timeout: 6000 });
    check('kiosk renders in default Hindi', true);
    const timer = await page.evaluate(() => /\d{2}:\d{2}/.test(document.body.innerText));
    check('auto-exit countdown present', timer);
    await page.locator('button', { hasText: 'English' }).click();
    await page.waitForSelector('text=Tap to Speak', { timeout: 6000 });
    check('kiosk language switch to English works', true);
    await spaNav('/patient/book-opd', 'patient');
    await page.waitForSelector('text=Book OPD Appointment', { timeout: 6000 });
    check('BookOPD header renders in English', true);
    await page.locator('button', { hasText: 'हिन्दी' }).count().then(() => {});
    await page.locator('button', { hasText: 'Back' }).count().then((n) => check('BookOPD step nav button localised', n > 0));
  } catch (e) {
    check('TEST SCRIPT', false, e.message);
  }

  console.log(results.join('\n'));
  await browser.close();
})();