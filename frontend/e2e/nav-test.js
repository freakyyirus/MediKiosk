const { chromium } = require('playwright');
const BASE = 'http://localhost:5179';
const results = [];
function check(name, cond, extra = '') {
  results.push({ name, pass: !!cond, extra });
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  [' + extra + ']' : ''}`);
}
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // MyVisits: sidebar Health Timeline -> correct route
  await page.goto(BASE + '/patient/visits', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await page.locator('aside nav button:has-text("Health Timeline")').click();
  await page.waitForTimeout(700);
  check('MyVisits -> Health Timeline nav lands on /patient/health-timeline', page.url().includes('/patient/health-timeline'), page.url());

  // From timeline, Documents nav
  await page.locator('aside nav button:has-text("Documents")').click();
  await page.waitForTimeout(700);
  check('Timeline -> Documents nav lands on /patient/documents', page.url().includes('/patient/documents'), page.url());

  // Profile nav from documents
  await page.locator('aside nav button:has-text("Profile")').click();
  await page.waitForTimeout(700);
  check('Documents -> Profile nav lands on /patient/profile', page.url().includes('/patient/profile'), page.url());

  // Back goes to previous portal page
  await page.goBack({ waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  check('Back returns to /patient/documents', page.url().includes('/patient/documents'), page.url());

  await browser.close();
  const failed = results.filter((r) => !r.pass).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });