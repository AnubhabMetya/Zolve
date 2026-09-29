// Temporary verification for NaN + professional-card fixes. Deleted after the run.
import { spawn } from 'node:child_process';
import path from 'node:path';
import { chromium } from 'playwright';

const PORT = 4174;
// Shell-free launch (no DEP0190): run vite directly with the current node binary.
const viteBin = path.resolve(process.cwd(), 'node_modules', 'vite', 'bin', 'vite.js');
const server = spawn(process.execPath, [viteBin, 'preview', '--port', String(PORT), '--strictPort'], {
  cwd: process.cwd(), stdio: 'ignore',
});
const base = `http://localhost:${PORT}`;

async function waitForServer(tries = 40) {
  for (let i = 0; i < tries; i++) {
    try { const r = await fetch(base); if (r.ok) return; } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('preview server did not start');
}

function stopServer(proc) {
  if (!proc || proc.exitCode !== null || proc.signalCode !== null) return Promise.resolve();
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(), 5000);
    proc.once('exit', () => { clearTimeout(timer); resolve(); });
    try { proc.kill('SIGTERM'); } catch { clearTimeout(timer); resolve(); }
  });
}

let pass = 0, fail = 0;
const check = (cond, msg) => { if (cond) { pass++; console.log('  ok:', msg); } else { fail++; console.log('  FAIL:', msg); } };

let browser = null;
try {
  await waitForServer();
  browser = await chromium.launch();
  const page = await browser.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e?.message || e)));

  // --- PART 1: screenshot case 18999 + ZOLVE30 ---
  await page.goto(`${base}/services/painting`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Add Full Home Painting' }).waitFor({ timeout: 20000 });
  await page.getByRole('button', { name: 'Add Full Home Painting' }).click();
  await page.goto(`${base}/cart`, { waitUntil: 'domcontentloaded' });
  await page.getByPlaceholder('Enter coupon code').fill('ZOLVE30');
  await page.getByRole('button', { name: 'Apply', exact: true }).click();
  await page.waitForTimeout(500);
  check((await page.getByText('You saved ₹250').first().count()) > 0, 'cart: ZOLVE30 capped discount shown');
  await page.getByRole('button', { name: /Continue to Slot Booking/ }).first().click();
  await page.waitForTimeout(800);
  check((await page.getByText('Service Location').count()) > 0, 'checkout step 1 renders');
  await page.getByText('+ Add Different Address for this Booking').click();
  await page.getByPlaceholder('Type any location in India').fill('Flat 402, Salt Lake, Kolkata 700091');
  await page.waitForTimeout(600);
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.waitForTimeout(600);
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.waitForTimeout(600);
  check((await page.getByText('Order Summary').count()) > 0, 'order summary renders');
  // NOTE (provenance): the checkout assertion below intentionally reads <main>
  // instead of <body>. DOM inspection showed the only /NaN|undefined/i hits on
  // this page are footer-chrome substrings ("goverNaNce", "GoverNaNce & Digital
  // Voting") — unrelated to checkout values. Same regex, scoped to checkout.
  const checkoutText = await page.locator('main').innerText();
  for (const [label, val] of [['subtotal 18,999', '₹18,999'], ['discount 250', '−₹250'], ['fee 49', '₹49'], ['gst 9', '₹9'], ['total 18,807', '₹18,807']]) {
    check(checkoutText.includes(val), `summary shows ${label}`);
  }
  check(!/NaN|undefined/i.test(checkoutText), 'no NaN/undefined anywhere in checkout');

  // --- PART 2: professional panels ---
  await page.goto(`${base}/__verify`, { waitUntil: 'domcontentloaded' });
  await page.getByTestId('panel-assigned').waitFor({ timeout: 20000 });
  const finding = await page.getByTestId('panel-finding').innerText();
  check(finding.includes('Finding a Professional...'), 'pre-assignment: finding message');
  check(!finding.includes('Rajesh'), 'pre-assignment: identity hidden');
  const repl = await page.getByTestId('panel-replacement').innerText();
  check(repl.includes('Finding a replacement professional...'), 'reassignment: replacement message');
  check(!repl.includes('Rajesh'), 'reassignment: old partner hidden');
  const assigned = await page.getByTestId('panel-assigned').innerText();
  for (const [label, val] of [['name', 'Rajesh Kumar'], ['trade', 'Master Electrician'], ['rating', '4.9'], ['jobs', '326 jobs'], ['experience', '8+ years experience'], ['qualification', 'MCB'], ['badge', 'Identity Verified']]) {
    check(assigned.includes(val), `assigned card shows ${label}`);
  }
  const bookingOnly = await page.getByTestId('panel-bookingonly').innerText();
  check(bookingOnly.includes('Rajesh Kumar'), 'booking fallback: name from booking');
  check(bookingOnly.includes('New Partner'), 'booking fallback: New Partner instead of rating');
  const ghost = await page.getByTestId('panel-ghost').innerText();
  check(ghost.includes('temporarily unavailable'), 'unresolvable: graceful message, no crash');
  check(!/undefined|NaN/i.test(assigned + bookingOnly + ghost), 'no undefined/NaN in professional panels');

  const mapCrashes = pageErrors.filter((m) => /reading 'map'/.test(m));
  check(mapCrashes.length === 0, 'zero .map runtime errors');
  check(pageErrors.length === 0, `zero page errors (${pageErrors.length})`);
  if (pageErrors.length) console.log('  info pageerrors:', pageErrors.slice(0, 5));
} catch (e) {
  fail++;
  console.log('  FAIL: harness error', e.message);
} finally {
  if (browser) {
    try { await browser.close(); } catch {}
    browser = null;
  }
  await stopServer(server);
}

console.log(`verify-fix: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
