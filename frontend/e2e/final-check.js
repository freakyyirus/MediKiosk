const { execSync } = require('child_process');
const { chromium } = require('playwright');

const BASE = 'http://localhost:5179';
const results = [];
function check(name, ok, extra = '') {
  results.push(ok);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  [' + extra + ']' : ''}`);
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));

  // ============ MODULE 1: Routing & auth guards ============
  await page.goto(BASE + '/');
  await page.waitForURL('**/patient/dashboard', { timeout: 8000 });
  check('landing redirects authed user to dashboard', page.url().includes('/patient/dashboard'));

  await page.goto(BASE + '/login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  check('/login while authed redirects to dashboard', page.url().includes('/patient/dashboard'));

  // ============ MODULE 2: Kiosk (patient) ============
  await page.goto(BASE + '/patient/kiosk', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  check('kiosk loads for patient', page.url().includes('/patient/kiosk'));
  check('kiosk "Tap to Speak" present (Hindi default)', (await page.locator('text=/तऍप|बोलने के लिए टैप करें|Tap to Speak/').count()) >= 1);
  const cdt = await page.evaluate(() => /\d{2}:\d{2}/.test(document.body.innerText));
  check('kiosk auto-exit countdown', cdt);

  // Language switch to English
  await page.locator('button', { hasText: 'English' }).click();
  await page.waitForSelector('text=Tap to Speak', { timeout: 5000 });
  check('kiosk language switch to English', true);

  // ============ MODULE 3: Patient modules ============
  for (const route of ['/patient/visits', '/patient/health-timeline', '/patient/documents', '/patient/profile']) {
    await page.goto(BASE + route, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    check(route + ' loads (200)', page.url().includes(route));
  }
  const jsModuleErr = errors.filter(e => !/favicon|401|404/.test(e));
  check('no page JS errors across patient modules', jsModuleErr.length === 0, jsModuleErr.slice(0,2).join(' | '));

  await browser.close();

  // ============ MODULE 4: Role-based guards (SPA role switches) ============
  const b2 = await chromium.launch();
  const p2 = await b2.newPage();
  const spaNav = async (path, role, blocked = false) => {
    for (let attempt = 0; attempt < 5; attempt++) {
      await p2.evaluate(async ([pp, r]) => {
        const m = await import('/src/stores/authStore.ts');
        m.useAuthStore.getState().setMockRole(r);
        history.pushState(null, '', pp);
      }, [path, role]);
      await p2.waitForTimeout(100);
      await p2.evaluate(() => window.dispatchEvent(new PopStateEvent('popstate')));
      await p2.waitForTimeout(500);
      const u = new URL(p2.url()).pathname;
      if (u === path) return u;
      if (u === '/unauthorized' && (blocked || attempt === 4)) return u;
    }
    return new URL(p2.url()).pathname;
  };
  await p2.goto(BASE + '/');
  await p2.waitForURL('**/patient/dashboard', { timeout: 8000 });

  const g1 = await spaNav('/physician/dashboard', 'patient', true);
  check('legacy /physician blocked → /unauthorized', g1 === '/unauthorized', g1);
  const g2 = await spaNav('/admin', 'patient', true);
  check('legacy /admin blocked → /unauthorized', g2 === '/unauthorized', g2);
  const g3 = await spaNav('/hospital/dashboard', 'hospital_admin');
  check('hospital admin portal renders', g3 === '/hospital/dashboard', g3);
  await spaNav('/hospital/vitals', 'hospital_admin');
  await p2.waitForSelector('text=Vitals & Early Warning Station', { timeout: 6000 }).catch(() => {});
  check('VitalsMonitor renders', (await p2.locator('text=Vitals & Early Warning Station').count()) > 0);
  await spaNav('/hospital/data-retention', 'hospital_admin');
  await p2.waitForSelector('text=Retention Policies', { timeout: 6000 }).catch(() => {});
  check('DataRetentionManager (real API) renders', (await p2.locator('text=Retention Policies').count()) > 0);
  const g6 = await spaNav('/doctor/queue', 'hospital_admin', true);
  check('hospital admin blocked from /doctor/queue', g6 === '/unauthorized', g6);
  const g7 = await spaNav('/doctor/dashboard', 'doctor');
  check('doctor portal renders', g7 === '/doctor/dashboard', g7);
  await spaNav('/doctor/queue', 'doctor');
  await p2.waitForSelector('text=My Patients', { timeout: 6000 }).catch(() => {});
  check('doctor queue loads (renamed route)', (await p2.locator('text=My Patients').count()) > 0);

  // ============ MODULE 5: BookOPD draft + full booking ============
  await p2.goto(BASE + '/patient/book-opd', { waitUntil: 'networkidle' });
  await p2.waitForTimeout(600);
  check('no restore toast on fresh visit', !(await p2.evaluate(() => document.body.innerText.includes('Restored your in-progress booking'))));
  const next = p2.locator('button:has-text(\"आगे\"), button:has-text(\"Next\")').first();
  await p2.locator('button', { hasText: 'City General Hospital' }).first().click();
  await next.click(); await p2.waitForTimeout(800);
  await p2.locator('button', { hasText: 'General Medicine' }).first().click();
  await next.click(); await p2.waitForTimeout(800);
  await p2.locator('button', { hasText: /Dr\./ }).first().click();
  await next.click(); await p2.waitForTimeout(800);
  await p2.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button')).find(x => /^[A-Za-z]{3,9}\n\d{1,2}$/.test(x.innerText.trim()));
    if (b) b.click();
  });
  await p2.waitForTimeout(1000);
  await p2.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button')).find(x => /^(\d{1,2}):(\d{2})( AM| PM)?$/.test(x.innerText.trim().split('\n')[0].trim()));
    if (b) b.click();
  });
  await next.click(); await p2.waitForTimeout(400);
  await p2.locator('input[class*=rounded]').first().fill('Fever and headache for 2 days');
  await next.click(); await p2.waitForTimeout(400);
  const review = await p2.evaluate(() => document.body.innerText.includes('बुकिंग की पुष्टि करें'));
  check('BookOPD reaches review step', review);
  await p2.reload({ waitUntil: 'networkidle' });
  await p2.waitForTimeout(900);
  const restored = await p2.evaluate(() => document.body.innerText.includes('Restored your in-progress booking'));
  check('BookOPD draft restored after reload', restored);

  const jsFinal = errors.filter(e => !/favicon|401|404/.test(e));
  check('no page JS errors in final run', jsFinal.length === 0, jsFinal.slice(0,2).join(' | '));

  await b2.close();
  const failed = results.filter((r) => !r).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed (final regression)`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });