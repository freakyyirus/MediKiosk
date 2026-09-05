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
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));

  // 1. Authenticated "/" -> patient dashboard (HomeRedirect; landing NOT shown)
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  check('GET / (authed demo) redirects to /patient/dashboard', page.url().includes('/patient/dashboard'), page.url());
  check('Landing Preloader NOT mounted at / for authed user', (await page.locator('text=Initializing compassion').count()) === 0);

  // 2. Role guard: patient hitting hospital route -> /unauthorized
  await page.goto(BASE + '/hospital/dashboard', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  check('Patient hitting /hospital/dashboard redirected to /unauthorized', page.url().includes('/unauthorized'), page.url());

  // Doctor route for patient -> /unauthorized
  await page.goto(BASE + '/doctor/queue', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  check('Patient hitting /doctor/queue redirected to /unauthorized', page.url().includes('/unauthorized'), page.url());

  // 3. Patient pages load
  await page.goto(BASE + '/patient/dashboard', { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  check('/patient/dashboard loads for patient', page.url().includes('/patient/dashboard'));

  // 4. Back button returns to previous portal page, not "/" landing
  await page.goto(BASE + '/patient/visits', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await page.goto(BASE + '/patient/health-timeline', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await page.goBack({ waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  check('Browser Back from sub-page returns to /patient/visits', page.url().includes('/patient/visits'), page.url());

  // 5. /login while already authed -> dashboard (replace semantics)
  await page.goto(BASE + '/login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  check('/login while authed redirects to dashboard', page.url().includes('/patient/dashboard'), page.url());

  // 6. BookOPD loads; internal Back button steps back (step indicator present)
  await page.goto(BASE + '/patient/book-opd', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  check('/patient/book-opd loads (7-step wizard)', (await page.locator('h1:has-text("क"), h1:has-text("B")').count()) > 0);
  const backBtns = await page.locator('button:has-text("वापस"), button:has-text("Back")').count();
  check('BookOPD internal Back button exists', backBtns >= 1, String(backBtns));

  const jsErrors = errors.filter(e => !/favicon|401|404/.test(e));
  check('No page JS errors in route tests', jsErrors.length === 0, jsErrors.slice(0, 3).join(' | '));

  await browser.close();

  const failed = results.filter((r) => !r.pass).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });