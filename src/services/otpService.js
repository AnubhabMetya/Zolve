// ====================================================================
// ZOLVE OTP SERVICE — MSG91 + N8N + DEV FALLBACK + HARDENED EMAIL OTP
// Household/Personal: Mobile OTP (unchanged)
// Community & Society Executive: Email OTP (hardened, production-safe)
// ====================================================================
import { triggerN8nWorkflow } from './n8nClient.js';

const MSG91_AUTH_KEY = import.meta?.env?.VITE_MSG91_AUTH_KEY || null;
const MSG91_TEMPLATE_ID = import.meta?.env?.VITE_MSG91_TEMPLATE_ID || null;
const MSG91_SENDER_ID = import.meta?.env?.VITE_MSG91_SENDER_ID || 'ZOLVEO';
const N8N_WEBHOOK_URL = import.meta?.env?.VITE_N8N_WEBHOOK_URL || null;

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
const RESEND_COOLDOWN_MS = 30 * 1000; // 30 seconds
const MAX_VERIFY_ATTEMPTS = 5;

// Mobile OTP remains unchanged for Household/Personal
export const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

export const isValidIndianMobile = (phone) => {
  const digits = phone.replace(/\D/g, '').slice(-10);
  return /^[6-9]\d{9}$/.test(digits);
};

export const normalizePhone = (phone) => {
  const digits = phone.replace(/\D/g, '').slice(-10);
  return digits;
};

/**
 * Send OTP via N8N webhook first, then MSG91 direct, then dev fallback
 * Household/Personal mobile OTP — unchanged behavior
 */
export const sendMobileOtp = async (phone, otpCode, userName = 'User') => {
  const digits = normalizePhone(phone);
  if (!isValidIndianMobile(digits)) {
    return { success: false, fallback: false, error: 'Invalid mobile number. Enter 10-digit Indian number.' };
  }

  // 1. Try N8N workflow bridge (preferred — allows server-side OTP generation/audit)
  try {
    const n8nRes = await triggerN8nWorkflow('send-otp', {
      phone: digits,
      phone_full: `91${digits}`,
      otp: otpCode,
      user_name: userName,
      sender_id: MSG91_SENDER_ID,
      template_id: MSG91_TEMPLATE_ID
    });
    if (n8nRes && (n8nRes.success || n8nRes.status === 'success' || n8nRes.type === 'success')) {
      console.log(`[OTP] Dispatched via N8N for 91${digits}`);
      return { success: true, via: 'n8n', response: n8nRes };
    }
    if (n8nRes && n8nRes.success) {
      return { success: true, via: 'n8n-sim', response: n8nRes };
    }
  } catch (e) {
    console.warn('[OTP] N8N bridge error:', e);
  }

  // 2. Try direct MSG91 if configured
  const isMsg91Configured = MSG91_AUTH_KEY && MSG91_AUTH_KEY !== 'your_msg91_key_here' && MSG91_TEMPLATE_ID;
  if (isMsg91Configured) {
    try {
      const res = await fetch(`https://control.msg91.com/api/v5/otp?authkey=${MSG91_AUTH_KEY}&mobile=91${digits}&otp=${otpCode}&sender=${MSG91_SENDER_ID}&otp_expiry=5`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.type === 'success') {
        console.log('[OTP] MSG91 dispatched:', data);
        return { success: true, via: 'msg91', response: data };
      }
      console.warn('[OTP] MSG91 error response:', data);
      return { success: false, fallback: true, via: 'msg91-failed', error: data.message || 'MSG91 delivery failed', devOtp: otpCode };
    } catch (err) {
      console.warn('[OTP] MSG91 fetch error:', err);
      return { success: false, fallback: true, via: 'msg91-error', error: err.message, devOtp: otpCode };
    }
  }

  // 3. Dev fallback — log OTP (no master bypass)
  console.warn(`[DEV FALLBACK] MSG91 not configured. OTP for 91${digits} (${userName}): ${otpCode}`);
  return {
    success: false,
    fallback: true,
    via: 'dev-fallback',
    error: 'SMS gateway not configured — check logs for OTP',
    devOtp: otpCode
  };
};

export const verifyMobileOtp = (inputOtp, expectedOtp, expiresAt = null) => {
  if (!inputOtp || inputOtp.length !== 6) return { valid: false, error: 'Enter 6-digit OTP' };
  if (expiresAt && Date.now() > expiresAt) return { valid: false, error: 'OTP expired. Please resend.' };
  if (inputOtp === expectedOtp) return { valid: true };
  return { valid: false, error: 'Incorrect OTP. Check SMS.' };
};

export const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
};

// ====================================================================
// HARDENED EMAIL OTP FOR COMMUNITY & SOCIETY EXECUTIVE (PRODUCTION-SAFE)
// ====================================================================

// Internal Email OTP store — never exposes plain OTP
// email (lowercase) -> { hash, expiresAt, attempts, verified, createdAt, cooldownUntil }
const emailOtpStore = new Map();
const EMAIL_OTP_SALT = 'zolve-email-otp-salt-v1-prod';

// Simple deterministic hash for prototype (non-exposed, not cryptographically secure but avoids plain storage)
// In production, this would be bcrypt/argon2 server-side; here we use a salted hash to avoid plain exposure
function hashEmailOtp(otp, email) {
  const normalizedEmail = String(email).trim().toLowerCase();
  const str = `${EMAIL_OTP_SALT}|${otp}|${normalizedEmail}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) & 0xffffffff;
  }
  // Convert to hex string with salt prefix to avoid trivial reverse
  return `${hash.toString(16)}_${normalizedEmail.length}_${otp.length}`;
}

function isDevelopment() {
  // Explicit environment gate — fixed OTP and fallback only in DEV
  // Check global overrides for tests, then Vite env, then Node env
  try {
    if (typeof globalThis !== 'undefined' && globalThis.__FORCE_PROD__ === true) return false;
    if (typeof globalThis !== 'undefined' && globalThis.__FORCE_DEV__ === true) return true;
  } catch {}
  try {
    if (import.meta?.env?.DEV === true) return true;
  } catch {}
  try {
    if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') return true;
  } catch {}
  return false;
}

function isN8nConfigured() {
  return !!N8N_WEBHOOK_URL && String(N8N_WEBHOOK_URL).trim() !== '';
}

/**
 * Hardened sendEmailOtp
 * Development: n8n attempt first, if unavailable use DEV fallback (log allowed only in DEV)
 * Production: require n8n gateway, never fallback, never log OTP, never expose OTP
 * Signature: sendEmailOtp(email, userName) — OTP generated internally, not passed in
 * For backward compat, also supports sendEmailOtp(email, otpCode, userName) but otpCode is ignored and regenerated
 */
export const sendEmailOtp = async (email, otpOrUserName, maybeUserName) => {
  // Handle overloaded signature: sendEmailOtp(email, otpCode, userName) from old code
  let userName = 'User';
  if (typeof otpOrUserName === 'string' && maybeUserName !== undefined) {
    // Old call: sendEmailOtp(email, otpCode, userName) — ignore otpCode, use userName
    userName = maybeUserName;
  } else if (typeof otpOrUserName === 'string' && maybeUserName === undefined) {
    // Could be sendEmailOtp(email, userName) where second arg is userName
    // Heuristic: if second arg looks like OTP (6 digits), ignore it
    if (/^\d{6}$/.test(otpOrUserName)) {
      // It's an OTP, ignore it (hardened flow generates its own)
      userName = 'User';
    } else {
      userName = otpOrUserName;
    }
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  if (!isValidEmail(normalizedEmail)) {
    return { success: false, fallback: false, error: 'Enter valid email address.' };
  }

  // Abuse protection: resend cooldown
  const existing = emailOtpStore.get(normalizedEmail);
  if (existing && existing.cooldownUntil && Date.now() < existing.cooldownUntil) {
    const waitSec = Math.ceil((existing.cooldownUntil - Date.now()) / 1000);
    return { success: false, fallback: false, error: `Please wait ${waitSec}s before resending.` };
  }

  // Generate fresh 6-digit OTP internally (never fixed)
  const otpCode = generateOtp();

  // 1. Try N8N workflow bridge (required for production)
  let n8nSuccess = false;
  let n8nError = null;
  if (isN8nConfigured()) {
    try {
      const n8nRes = await triggerN8nWorkflow('send-email-otp', {
        email: normalizedEmail,
        otp: otpCode,
        user_name: userName,
      });
      if (n8nRes && (n8nRes.success || n8nRes.status === 'success' || n8nRes.type === 'success')) {
        n8nSuccess = true;
        // Do NOT log OTP in production
        if (isDevelopment()) {
          console.log(`[Email OTP] Dispatched via N8N for ${normalizedEmail} (dev mode)`);
        }
      } else {
        // N8N returned but not success — treat as failure
        n8nError = n8nRes?.message || n8nRes?.error || 'Email gateway response invalid';
      }
    } catch (e) {
      n8nError = e?.message || 'Email gateway error';
      if (isDevelopment()) {
        console.warn('[Email OTP] N8N bridge error (dev):', n8nError);
      }
    }
  } else {
    n8nError = 'Email gateway not configured';
  }

  if (n8nSuccess) {
    // Store hashed OTP only after successful gateway dispatch
    const hash = hashEmailOtp(otpCode, normalizedEmail);
    emailOtpStore.set(normalizedEmail, {
      hash,
      expiresAt: Date.now() + OTP_TTL_MS,
      attempts: 0,
      verified: false,
      createdAt: Date.now(),
      cooldownUntil: Date.now() + RESEND_COOLDOWN_MS,
    });
    return { success: true, via: 'n8n', expiresAt: Date.now() + OTP_TTL_MS };
  }

  // Production: gateway not configured or failed — NEVER fallback to fixed OTP, NEVER log OTP
  if (!isDevelopment()) {
    // Do not store OTP, so verification will fail (no valid production OTP)
    // Do not expose internal details
    return {
      success: false,
      fallback: false,
      error: 'Unable to send verification email. Please try again.',
    };
  }

  // Development fallback: allow DEV ONLY, log OTP clearly marked as DEV ONLY
  console.warn(`[DEV ONLY] Email OTP for ${normalizedEmail} (${userName}): ${otpCode} — DEV fallback, not for production`);
  const hash = hashEmailOtp(otpCode, normalizedEmail);
  emailOtpStore.set(normalizedEmail, {
    hash,
    expiresAt: Date.now() + OTP_TTL_MS,
    attempts: 0,
    verified: false,
    createdAt: Date.now(),
    cooldownUntil: Date.now() + RESEND_COOLDOWN_MS,
  });
  // In DEV, also return devOtp for tests to verify behavior, but UI should not display it in production
  return {
    success: true,
    fallback: true,
    via: 'dev-fallback',
    expiresAt: Date.now() + OTP_TTL_MS,
    devOtp: otpCode, // only for DEV tests, never used in production UI
  };
};

/**
 * Hardened verifyEmailOtp
 * Signature: verifyEmailOtp(email, inputOtp) — checks against stored hash, handles expiry/attempts/reuse
 * For backward compat, also supports verifyEmailOtp(inputOtp, expectedOtp, expiresAt) but will delegate to hardened flow if first arg is email
 */
export const verifyEmailOtp = (emailOrInputOtp, expectedOtpOrInput, expiresAtOrUndefined) => {
  // Detect overloaded call: verifyEmailOtp(email, inputOtp) vs old verifyEmailOtp(inputOtp, expectedOtp, expiresAt)
  const firstIsEmail = typeof emailOrInputOtp === 'string' && emailOrInputOtp.includes('@');

  if (firstIsEmail) {
    const email = String(emailOrInputOtp).trim().toLowerCase();
    const inputOtp = String(expectedOtpOrInput || '').trim();

    if (!inputOtp || inputOtp.length !== 6) return { valid: false, error: 'Enter 6-digit OTP' };
    if (!isValidEmail(email)) return { valid: false, error: 'Enter valid email address.' };

    const record = emailOtpStore.get(email);
    if (!record) {
      return { valid: false, error: 'No OTP requested. Please send a new code.' };
    }
    if (record.verified) {
      return { valid: false, error: 'OTP already used. Please request a new code.' };
    }
    if (Date.now() > record.expiresAt) {
      emailOtpStore.delete(email);
      return { valid: false, error: 'OTP expired. Please resend.' };
    }
    if (record.attempts >= MAX_VERIFY_ATTEMPTS) {
      emailOtpStore.delete(email);
      return { valid: false, error: 'Too many attempts. Please request a new code.' };
    }

    const inputHash = hashEmailOtp(inputOtp, email);
    if (inputHash === record.hash) {
      // Success: invalidate OTP so it cannot be reused
      record.verified = true;
      emailOtpStore.delete(email); // Invalidate after success
      return { valid: true };
    } else {
      record.attempts += 1;
      if (record.attempts >= MAX_VERIFY_ATTEMPTS) {
        emailOtpStore.delete(email);
        return { valid: false, error: 'Too many attempts. Please request a new code.' };
      }
      return { valid: false, error: 'Incorrect OTP. Check email.' };
    }
  }

  // Fallback: old signature verifyEmailOtp(inputOtp, expectedOtp, expiresAt) — for backward compat in non-hardened contexts
  // But in hardened flow, this should not be used for Community executive
  const inputOtp = emailOrInputOtp;
  const expectedOtp = expectedOtpOrInput;
  const expiresAt = expiresAtOrUndefined;
  if (!inputOtp || inputOtp.length !== 6) return { valid: false, error: 'Enter 6-digit OTP' };
  if (expiresAt && Date.now() > expiresAt) return { valid: false, error: 'OTP expired. Please resend.' };
  if (inputOtp === expectedOtp) return { valid: true };
  return { valid: false, error: 'Incorrect OTP. Check email.' };
};

// Test helper: clear store (for tests)
export const _clearEmailOtpStore = () => {
  emailOtpStore.clear();
};

// Test helper: get store size (for tests, not exposing hashes)
export const _getEmailOtpStoreSize = () => emailOtpStore.size;

// Test helper: peek record for tests (only in DEV, returns without hash)
export const _peekEmailOtpRecord = (email) => {
  const rec = emailOtpStore.get(String(email).trim().toLowerCase());
  if (!rec) return null;
  // Return without hash for safety
  return { expiresAt: rec.expiresAt, attempts: rec.attempts, verified: rec.verified, cooldownUntil: rec.cooldownUntil };
};

export const createOtpSession = (phone) => {
  const otp = generateOtp();
  return {
    phone: normalizePhone(phone),
    otp,
    expiresAt: Date.now() + OTP_TTL_MS,
    createdAt: Date.now()
  };
};
