// Tests for Email OTP via Supabase Edge Function + Resend — ALL Executive types use Email OTP
import {
  generateOtp,
  sendEmailOtp,
  verifyEmailOtp,
  resendEmailOtp,
  sendMobileOtp,
  verifyMobileOtp,
  _clearEmailOtpStore,
  _getEmailOtpStoreSize,
  _peekEmailOtpRecord,
} from './otpService.js';
import * as fs from 'fs';
import * as path from 'path';

function assert(cond, msg) { if (!cond) throw new Error(msg); }

let passed = 0, failed = 0;
async function test(name, fn) {
  try { await fn(); console.log(`✓ ${name}`); passed++; } catch (e) { console.error(`✗ ${name}: ${e.message} ${e.stack?.split('\n')[1]||''}`); failed++; }
}

async function run() {
  _clearEmailOtpStore();
  globalThis.__FORCE_DEV__ = true;
  globalThis.__FORCE_PROD__ = false;
  // Force dev fallback for most tests (so devOtp available) — real Edge is deployed and would return via:'resend' without devOtp
  globalThis.__mockSupabaseInvoke = async () => { throw new Error('dev fallback mock'); };

  // 1. Secure OTP generation
  await test('1. Secure OTP generation (crypto.getRandomValues, 6 digits)', async () => {
    const src = fs.readFileSync(path.join(process.cwd(), 'src/services/otpService.js'), 'utf8');
    assert(src.includes('crypto.getRandomValues'), 'must use crypto.getRandomValues');
    assert(!src.includes('Math.random() * 900000'), 'must NOT use Math.random fallback for OTP generation');
    const otps = new Set();
    for (let i = 0; i < 20; i++) otps.add(generateOtp());
    for (const o of otps) assert(/^\d{6}$/.test(o), `otp ${o} not 6-digit`);
    assert(otps.size > 1, 'OTPs should be random');
  });

  await test('2. OTP is 6 digits', async () => {
    _clearEmailOtpStore();
    const r = await sendEmailOtp('six@example.com', 'User');
    assert(/^\d{6}$/.test(r.devOtp), 'devOtp 6-digit');
    assert(_peekEmailOtpRecord('six@example.com').expiresAt > Date.now(), 'expiry in future');
  });

  await test('3. OTP is not fixed at 123456', async () => {
    _clearEmailOtpStore();
    globalThis.__FORCE_PROD__ = true; globalThis.__FORCE_DEV__ = false;
    const res = await sendEmailOtp('notfixed@example.com', 'User');
    assert(!res.success, 'prod without edge should fail');
    assert(!verifyEmailOtp('notfixed@example.com', '123456').valid, '123456 must not be valid');
    globalThis.__FORCE_DEV__ = true; globalThis.__FORCE_PROD__ = false;
    let seenFixed = 0;
    for (let i=0;i<50;i++) if(generateOtp()==='123456') seenFixed++;
    assert(seenFixed < 5, 'generateOtp should not be fixed');
  });

  await test('4. Email normalization', async () => {
    _clearEmailOtpStore();
    const r = await sendEmailOtp('CaseTest@Example.COM', 'User');
    assert(r.success, 'send success');
    assert(verifyEmailOtp('casetest@example.com', r.devOtp).valid, 'normalized verify');
    assert(verifyEmailOtp('CASETEST@EXAMPLE.COM', r.devOtp).valid === false, 'already invalidated after success — no reuse');
  });

  await test('5. OTP hashing (store does not expose hash to peek)', async () => {
    _clearEmailOtpStore();
    await sendEmailOtp('hash@test.com', 'User');
    const peek = _peekEmailOtpRecord('hash@test.com');
    assert(peek && !peek.hash, 'peek should not expose hash');
    assert(peek.expiresAt && peek.cooldownUntil, 'peek has metadata');
  });

  await test('6. Successful verification', async () => {
    _clearEmailOtpStore();
    const s = await sendEmailOtp('success@test.com','User');
    assert(verifyEmailOtp('success@test.com', s.devOtp).valid, 'verify success');
  });

  await test('7. Incorrect OTP', async () => {
    _clearEmailOtpStore();
    await sendEmailOtp('incorrect@test.com','User');
    const r = verifyEmailOtp('incorrect@test.com','000000');
    assert(!r.valid && r.error.toLowerCase().includes('invalid'), `got ${r.error}`);
  });

  await test('8. Expired OTP', async () => {
    _clearEmailOtpStore();
    await sendEmailOtp('expired@test.com','User');
    const orig = Date.now; Date.now = () => orig() + 6*60*1000;
    const r = verifyEmailOtp('expired@test.com','999999');
    assert(!r.valid && r.error.toLowerCase().includes('expired'), `got ${r.error}`);
    Date.now = orig; _clearEmailOtpStore();
    assert(!verifyEmailOtp('123456','123456', Date.now()-1000).valid, 'old sig expired');
  });

  await test('9. Maximum attempts (5)', async () => {
    _clearEmailOtpStore();
    const s = await sendEmailOtp('attempts@test.com','User');
    for(let i=0;i<4;i++) assert(!verifyEmailOtp('attempts@test.com','000000').valid, `attempt ${i}`);
    const r5 = verifyEmailOtp('attempts@test.com','000000');
    assert(!r5.valid && r5.error.toLowerCase().includes('too many'), `5th ${r5.error}`);
    assert(!verifyEmailOtp('attempts@test.com', s.devOtp).valid, 'correct after max fails');
  });

  await test('10. Resend cooldown (30s)', async () => {
    _clearEmailOtpStore();
    assert((await sendEmailOtp('cooldown@test.com','User')).success, 'first');
    const second = await sendEmailOtp('cooldown@test.com','User');
    assert(!second.success && second.error.includes('Please wait'), `cooldown ${JSON.stringify(second)}`);
  });

  await test('11. Resend invalidates previous OTP', async () => {
    _clearEmailOtpStore();
    const s1 = await sendEmailOtp('resend@test.com','User');
    const orig = Date.now; Date.now = () => orig()+35000;
    const s2 = await sendEmailOtp('resend@test.com','User');
    Date.now = orig;
    assert(!verifyEmailOtp('resend@test.com', s1.devOtp).valid, 'old invalid');
    assert(verifyEmailOtp('resend@test.com', s2.devOtp).valid, 'new valid');
  });

  await test('12. Successful verification invalidates OTP (no reuse)', async () => {
    _clearEmailOtpStore();
    const s = await sendEmailOtp('reuse@test.com','User');
    assert(verifyEmailOtp('reuse@test.com', s.devOtp).valid, 'first');
    const second = verifyEmailOtp('reuse@test.com', s.devOtp);
    assert(!second.valid && (second.error.toLowerCase().includes('request a new') || second.error.toLowerCase().includes('no otp') || second.error.toLowerCase().includes('send a new')), `reuse ${second.error}`);
  });

  await test('13. Household Executive Email OTP', async () => {
    _clearEmailOtpStore();
    const r = await sendEmailOtp('household-exec@test.com','Household User');
    assert(r.success && verifyEmailOtp('household-exec@test.com', r.devOtp).valid, 'household otp');
    const m = await sendMobileOtp('9876543210','123456');
    assert(!m.success && m.error.toLowerCase().includes('email otp'), 'no mobile');
  });

  await test('14. Personal Executive Email OTP', async () => {
    _clearEmailOtpStore();
    const r = await sendEmailOtp('personal-exec@test.com','Personal User');
    assert(r.success && verifyEmailOtp('personal-exec@test.com', r.devOtp).valid, 'personal');
  });

  await test('15. Community Executive Email OTP + resend alias', async () => {
    _clearEmailOtpStore();
    const r = await sendEmailOtp('community-exec@test.com','Community User');
    assert(r.success, 'community');
    assert(r.via === 'dev-fallback' || r.via === 'resend', `via ${r.via}`);
    assert(verifyEmailOtp('community-exec@test.com', r.devOtp).valid, 'verify');
    _clearEmailOtpStore(); await sendEmailOtp('community-exec@test.com','User');
    const orig = Date.now; Date.now = () => orig()+35000;
    const rr = await resendEmailOtp('community-exec@test.com');
    Date.now = orig; assert(rr.success, 'resend alias');
  });

  await test('16. Edge Function delivery success handling (via resend in prod mock)', async () => {
    _clearEmailOtpStore();
    // r uses dev fallback mock (set at run start) -> devOtp available
    const r = await sendEmailOtp('edge-success@test.com','User');
    assert(r.success, 'dev fallback success');
    // Mock Edge Function success even in prod via global hook
    _clearEmailOtpStore();
    globalThis.__FORCE_DEV__ = false; globalThis.__FORCE_PROD__ = true;
    globalThis.__mockSupabaseInvoke = async () => ({ success: true });
    const rProd = await sendEmailOtp('edge-prod@test.com','User');
    // restore dev fallback mock for subsequent tests
    globalThis.__mockSupabaseInvoke = async () => { throw new Error('dev fallback mock'); };
    assert(rProd.success && rProd.via === 'resend', `prod edge success via resend got ${JSON.stringify(rProd)}`);
    globalThis.__FORCE_DEV__ = true; globalThis.__FORCE_PROD__ = false;
  });

  await test('17. Edge Function failure handling (controlled error)', async () => {
    _clearEmailOtpStore();
    globalThis.__FORCE_PROD__ = true; globalThis.__FORCE_DEV__ = false;
    globalThis.__mockSupabaseInvoke = async () => ({ success: false, error: 'mock gateway failure' });
    const r = await sendEmailOtp('edge-fail@test.com','User');
    globalThis.__mockSupabaseInvoke = async () => { throw new Error('dev fallback mock'); };
    assert(!r.success && r.error === 'Unable to send verification email. Please try again.', `controlled ${r.error}`);
    assert(_getEmailOtpStoreSize()===0, 'no store on failure in prod');
    globalThis.__FORCE_DEV__ = true; globalThis.__FORCE_PROD__ = false;
  });

  await test('18. Resend/API failure handling (no leak)', async () => {
    _clearEmailOtpStore();
    globalThis.__FORCE_PROD__ = true; globalThis.__FORCE_DEV__ = false;
    globalThis.__mockSupabaseInvoke = async () => ({ success: false, error: 'Resend api key invalid' });
    const r = await sendEmailOtp('resend-fail@test.com','User');
    globalThis.__mockSupabaseInvoke = async () => { throw new Error('dev fallback mock'); };
    assert(!r.success, 'should fail');
    assert(r.error === 'Unable to send verification email. Please try again.', 'no leak');
    assert(!r.error.includes('Resend'), 'no resend leak');
    globalThis.__FORCE_DEV__ = true; globalThis.__FORCE_PROD__ = false;
  });

  await test('19. No SMS provider dependency', async () => {
    const otpSrc = fs.readFileSync(path.join(process.cwd(),'src/services/otpService.js'),'utf8');
    const joinSrc = fs.readFileSync(path.join(process.cwd(),'src/components/executive/JoinExecutivePage.jsx'),'utf8');
    for(const pat of ['MSG91','Fast2SMS','Twilio','TextBee','control.msg91.com']) {
      const lines = otpSrc.split('\n').filter(l=>!l.trim().startsWith('//') && l.includes(pat));
      assert(lines.length===0, `otpService should not contain ${pat}`);
    }
    assert(!joinSrc.includes('sendMobileOtp') && !joinSrc.includes('verifyMobileOtp'), 'Join page no mobile otp');
    assert(!otpSrc.includes('triggerN8nWorkflow') && !otpSrc.includes('n8nClient'), 'otpService must not use n8nClient');
    assert(!otpSrc.includes('VITE_N8N_WEBHOOK_URL'), 'otpService must not contain VITE_N8N_WEBHOOK_URL');
    assert(!otpSrc.includes('VITE_RESEND_API_KEY'), 'frontend must not contain VITE_RESEND_API_KEY');
    const envEx = fs.readFileSync(path.join(process.cwd(),'.env.example'),'utf8');
    const activeEnvLines = envEx.split('\n').filter(l=> l.trim() && !l.trim().startsWith('#'));
    assert(!activeEnvLines.some(l=> l.includes('VITE_MSG91') || l.includes('VITE_TWILIO') || l.includes('VITE_N8N_WEBHOOK_URL')), '.env.example no SMS/n8n active line');
    assert(!activeEnvLines.some(l=> l.includes('VITE_RESEND_API_KEY=')), '.env.example must not expose RESEND_API_KEY as VITE_ var');
    assert(envEx.includes('RESEND_API_KEY') && envEx.includes('RESEND_FROM_EMAIL'), '.env.example documents RESEND secrets as server-side');
    const mRes = await sendMobileOtp('9876543210','123456');
    assert(!mRes.success, 'mobile stub');
  });

  await test('20. No n8n dependency for OTP (otp path uses supabase.functions.invoke)', async () => {
    const otpSrc = fs.readFileSync(path.join(process.cwd(),'src/services/otpService.js'),'utf8');
    assert(otpSrc.includes("functions.invoke('send-email-otp'") || otpSrc.includes('functions.invoke("send-email-otp"'), 'must use functions.invoke send-email-otp');
    assert(!otpSrc.includes('VITE_N8N'), 'no n8n env in otpService');
    // Ensure Edge Function file exists and uses Brevo (migrated from Resend), not n8n/Gmail SMTP
    const edgePath = path.join(process.cwd(),'supabase/functions/send-email-otp/index.ts');
    assert(fs.existsSync(edgePath), 'Edge Function file must exist');
    const edgeSrc = fs.readFileSync(edgePath,'utf8');
    assert(edgeSrc.includes('api.brevo.com/v3/smtp/email'), 'Edge Function must call Brevo HTTPS API');
    assert(!edgeSrc.includes('smtp.gmail') && !edgeSrc.includes('Gmail SMTP'), 'must not use Gmail SMTP');
    assert(edgeSrc.includes('BREVO_API_KEY') && edgeSrc.includes('BREVO_FROM_EMAIL'), 'must use Brevo server secrets');
    assert(!edgeSrc.includes('RESEND_API_KEY') && !edgeSrc.includes('RESEND_FROM_EMAIL'), 'must not depend on Resend secrets');
    assert(edgeSrc.includes('zolve-three.vercel.app'), 'CORS must include deployed origin');
    assert(edgeSrc.includes('Access-Control-Allow-Origin'), 'CORS headers');
    assert(!edgeSrc.includes('VITE_'), 'Edge Function must not use VITE_ vars');
  });

  _clearEmailOtpStore();
  delete globalThis.__FORCE_DEV__; delete globalThis.__FORCE_PROD__; delete globalThis.__mockSupabaseInvoke;
  console.log(`\n=== OTP Service Tests: ${passed} passed, ${failed} failed ===`);
  if (failed>0) process.exitCode=1;
}
run();
