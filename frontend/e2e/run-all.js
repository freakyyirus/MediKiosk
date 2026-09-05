const { spawn, spawnSync } = require('child_process');
const http = require('http');
const path = require('path');

const PORT = 5179;
const BASE = `http://localhost:${PORT}`;
const SUITES = ['route-test.js', 'kiosk-test.js', 'nav-test.js', 'step5-test.js', 'final-check.js'];
const totals = { pass: 0, total: 0 };

try {
  spawnSync('pkill', ['-f', `vite.*${PORT}`]);
} catch { /* nothing to kill */ }

function waitForServer(timeoutMs) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const poll = () => {
      if (Date.now() - start > timeoutMs) return reject(new Error('dev server did not come up in time'));
      const req = http.get(BASE + '/', (res) => {
        if (res.statusCode) return resolve();
        poll();
      });
      req.on('error', () => poll());
      req.setTimeout(2000, () => { req.destroy(); poll(); });
    };
    poll();
  });
}

const server = spawn('npm', ['run', 'dev', '--', '--port', String(PORT), '--strictPort'], {
  cwd: path.resolve(__dirname, '..'),
  env: { ...process.env, VITE_SUPABASE_URL: '', VITE_SUPABASE_ANON_KEY: '', VITE_CLERK_PUBLISHABLE_KEY: '' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
server.stdout.on('data', (d) => process.stdout.write(`[vite] ${d}`));
server.stderr.on('data', (d) => process.stdout.write(`[vite] ${d}`));

const failedSuites = [];

(async () => {
  try {
    await waitForServer(60000);
  } catch (e) {
    console.error(e.message);
    server.kill('SIGTERM');
    process.exit(1);
  }

  for (const suite of SUITES) {
    console.log(`\n===== ${suite} =====`);
    const r = spawnSync('node', [path.join(__dirname, suite)], {
      cwd: __dirname,
      encoding: 'utf8',
      timeout: 300000,
    });
    if (r.stdout) process.stdout.write(r.stdout);
    if (r.stderr) process.stdout.write(r.stderr);
    const m = (r.stdout || '').match(/(\d+)\/(\d+) checks? passed/);
    if (m) {
      totals.pass += Number(m[1]);
      totals.total += Number(m[2]);
    }
    if (r.status !== 0) failedSuites.push(suite);
  }

  server.kill('SIGTERM');
  setTimeout(() => {
    try {
      spawnSync('pkill', ['-f', `vite.*${PORT}`]);
    } catch { /* already gone */ }
  }, 1500);

  console.log(`\n\n=== E2E SUMMARY: ${totals.pass}/${totals.total} checks passed ${failedSuites.length ? `| FAILED suites: ${failedSuites.join(', ')}` : '| ALL SUITES GREEN'} ===`);
  process.exit(failedSuites.length ? 1 : 0);
})().catch((e) => { console.error(e); server.kill('SIGTERM'); process.exit(1); });