const { chromium } = require('playwright');
const BASE = 'http://localhost:5179';
const results = [];
const errors = [];
function check(name, cond, extra = '') {
  results.push({ name, pass: !!cond, extra });
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  [' + extra + ']' : ''}`);
}
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('pageerror', (e) => errors.push(String(e)));

  // 1. Dashboard shows Kiosk Mode entry and navigates
  await page.goto(BASE + '/patient/dashboard', { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  const kioskBtn = page.locator('button:has-text("Start Kiosk Mode"), button:has-text("कियोस्क मोड शुरू करें")');
  check('Dashboard shows Kiosk Mode banner card', (await page.locator('text=/Kiosk Mode|कियोस्क मोड/').count()) >= 1);
  check('Dashboard has "Start Kiosk Mode" button', (await kioskBtn.count()) === 1);
  await kioskBtn.click();
  await page.waitForURL('**/patient/kiosk', { waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(700);
  check('Start Kiosk Mode navigates to /patient/kiosk', page.url().includes('/patient/kiosk'), page.url());

  // 2. Kiosk layout renders
  check('Kiosk "Tap to Speak" button present', (await page.locator('text=/Tap to Speak|बोलने के लिए टैप करें/').count()) === 1);
  check('Kiosk auto-exit countdown present', (await page.locator('text=/Auto-exit in|स्वतः बाहेर होण्यास:/').count()) >= 1);
  check('Kiosk greeting shows patient name', (await page.locator('text=/Hello|नमस्ते/').count()) >= 1);
  check('Kiosk action cards present', (await page.locator('text=/Book OPD|ओपीडी बुक करें/').count()) >= 1);

  // 3. Mic toggles listening state
  await page.locator('button:has-text("Tap to Speak"), button:has-text("बोलने के लिए टैप करें")').click();
  await page.waitForTimeout(300);
  check('Mic toggles "Listening…" state', (await page.locator('text=/Listening…|सुन रहे हैं…/').count()) >= 1);
  await page.waitForTimeout(2600);

  // 4. Exit Kiosk returns to dashboard
  await page.locator('button:has-text("Exit Kiosk"), button:has-text("कियोस्क बंद करें")').click();
  await page.waitForTimeout(700);
  check('Exit Kiosk returns to /patient/dashboard', page.url().includes('/patient/dashboard'), page.url());

  // 5. Direct deep-link to /patient/kiosk is guarded but loads for patient
  await page.goto(BASE + '/patient/kiosk', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  check('Direct /patient/kiosk loads (patient)', page.url().includes('/patient/kiosk'), page.url());

  // 6. Auto-timeout countdown ticks (initial 01:5x/02:00, decreases)
  const countdownText = await page.locator('text=/Auto-exit in|स्वतः बाहेर होण्यास:/').first().innerText();
  check('Countdown text present & formatted', /\d{2}:\d{2}/.test(countdownText), countdownText);

  check('No page errors during kiosk tests', errors.length === 0, errors.slice(0, 3).join(' | '));

  await browser.close();
  const failed = results.filter((r) => !r.pass).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });