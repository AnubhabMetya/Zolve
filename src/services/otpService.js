// ====================================================================
// ZOLVE OTP SERVICE — EMAIL OTP ONLY (SINGLE SOURCE OF TRUTH)
// Household, Personal & Community: ALL use Email OTP via Supabase Edge Function → Resend
// No SMS / MSG91 / Fast2SMS / Twilio / TextBee / n8n anywhere for OTP
// ====================================================================
import { supabase, isSupabaseConfigured, getSupabase } from '../lib/supabaseClient.js';

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
const RESEND_COOLDOWN_MS = 30 * 1000; // 30 seconds
const MAX_VERIFY_ATTEMPTS = 5;

// ---- helpers kept for profile/phone fields (not OTP) ----
export const isValidIndianMobile = (phone) => {
  const digits = String(phone).replace(/\D/g, '').slice(-10);
  return /^[6-9]\d{9}$/.test(digits);
};

export const normalizePhone = (phone) => {
  const digits = String(phone).replace(/\D/g, '').slice(-10);
  return digits;
};

export const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
};

// Generate cryptographically-secure 6-digit OTP (never 123456 fixed)
// No Math.random fallback — crypto.getRandomValues is required (Task 12)
export const generateOtp = () => {
  const gCrypto =
    (typeof crypto !== 'undefined' && crypto.getRandomValues ? crypto : null) ||
    (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.getRandomValues ? globalThis.crypto : null);
  if (!gCrypto || !gCrypto.getRandomValues) {
    throw new Error('Secure random generator unavailable');
  }
  const arr = new Uint32Array(1);
  gCrypto.getRandomValues(arr);
  return String(100000 + (arr[0] % 900000));
};

// ====================================================================
// EMAIL OTP — HARDENED, PRODUCTION-SAFE
// ====================================================================

// Internal Email OTP store — never exposes plain OTP
// email (lowercase) -> { hash, expiresAt, attempts, verified, createdAt, cooldownUntil }
const emailOtpStore = new Map();
const EMAIL_OTP_SALT = 'zolve-email-otp-salt-v1-prod';

function hashEmailOtp(otp, email) {
  const normalizedEmail = String(email).trim().toLowerCase();
  const str = `${EMAIL_OTP_SALT}|${otp}|${normalizedEmail}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) & 0xffffffff;
  }
  return `${hash.toString(16)}_${normalizedEmail.length}_${otp.length}`;
}

function isDevelopment() {
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
  try {
    if (typeof window !== 'undefined' && window.location) {
      const h = String(window.location.hostname || '').toLowerCase();
      if (h === 'localhost' || h === '127.0.0.1' || h === '' || h.endsWith('.local')) return true;
    }
  } catch {}
  return false;
}

/**
 * Hardened sendEmailOtp
 * Production: require Supabase Edge Function (send-email-otp) → Resend, never fallback, never log OTP
 * Development: Edge Function first, else DEV-only fallback (random OTP, marked, never 123456)
 */
export const sendEmailOtp = async (email, otpOrUserName, maybeUserName) => {
  let userName = 'User';
  if (typeof otpOrUserName === 'string' && maybeUserName !== undefined) {
    userName = maybeUserName;
  } else if (typeof otpOrUserName === 'string' && maybeUserName === undefined) {
    if (/^\d{6}$/.test(otpOrUserName)) {
      userName = 'User';
    } else {
      userName = otpOrUserName;
    }
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  if (!isValidEmail(normalizedEmail)) {
    return { success: false, fallback: false, error: 'Enter valid email address.' };
  }

  const existing = emailOtpStore.get(normalizedEmail);
  if (existing && existing.cooldownUntil && Date.now() < existing.cooldownUntil) {
    const waitSec = Math.ceil((existing.cooldownUntil - Date.now()) / 1000);
    return { success: false, fallback: false, error: `Please wait ${waitSec}s before requesting another OTP.` };
  }

  let otpCode;
  try {
    otpCode = generateOtp();
  } catch {
    return { success: false, fallback: false, error: 'Unable to send verification email. Please try again.' };
  }

  // Try Supabase Edge Function → Resend (required for production)
  let edgeSuccess = false;
  let _edgeError = null;
  // Test hook: allow mocking Edge Function via globalThis.__mockSupabaseInvoke
  const mockInvoke = typeof globalThis !== 'undefined' ? globalThis.__mockSupabaseInvoke : null;
  if (mockInvoke && typeof mockInvoke === 'function') {
    try {
      const mockRes = await mockInvoke({ email: normalizedEmail, otp: otpCode, user_name: userName });
      if (mockRes && mockRes.success) edgeSuccess = true;
      else _edgeError = (mockRes && mockRes.error) || 'Email gateway response invalid';
    } catch (e) { _edgeError = e?.message || 'Email gateway error'; }
  } else if (isSupabaseConfigured()) {
    try {
      const client = getSupabase() || supabase;
      // supabase.functions.invoke is available on the client; guard if missing (older mock)
      if (client && client.functions && typeof client.functions.invoke === 'function') {
        const { data, error } = await client.functions.invoke('send-email-otp', {
          body: { email: normalizedEmail, otp: otpCode, user_name: userName },
        });
        if (error) {
          _edgeError = error.message || 'Edge Function error';
        } else if (data && (data.success === true || data.status === 'success')) {
          edgeSuccess = true;
        } else if (data && data.success === false) {
          _edgeError = data.error || 'Email gateway response invalid';
        } else if (data && typeof data === 'object') {
          // Fallback: treat any 200 with no explicit success:false as success for local mock
          // but strict in production — handled below via isDevelopment
          if (isDevelopment() && data.simulated) edgeSuccess = true;
          else _edgeError = 'Email gateway response invalid';
        } else {
          _edgeError = 'Email gateway response invalid';
        }
      } else {
        _edgeError = 'Supabase functions not available';
      }
    } catch (e) {
      _edgeError = e?.message || 'Email gateway error';
    }
  } else {
    _edgeError = 'Supabase not configured';
  }

  if (edgeSuccess) {
    const hash = hashEmailOtp(otpCode, normalizedEmail);
    emailOtpStore.set(normalizedEmail, {
      hash,
      expiresAt: Date.now() + OTP_TTL_MS,
      attempts: 0,
      verified: false,
      createdAt: Date.now(),
      cooldownUntil: Date.now() + RESEND_COOLDOWN_MS,
    });
    return { success: true, via: 'resend', expiresAt: Date.now() + OTP_TTL_MS };
  }

  if (!isDevelopment()) {
    if (_edgeError) {
      // No OTP or key leaked — minimal warn
      console.warn('[Email OTP] Edge Function error (production)', _edgeError.slice(0, 120));
    }
    return {
      success: false,
      fallback: false,
      error: 'Unable to send verification email. Please try again.',
    };
  }

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
  return {
    success: true,
    fallback: true,
    via: 'dev-fallback',
    expiresAt: Date.now() + OTP_TTL_MS,
    devOtp: otpCode,
  };
};

export const resendEmailOtp = async (email) => {
  return sendEmailOtp(email, 'User');
};

export const verifyEmailOtp = (emailOrInputOtp, expectedOtpOrInput, expiresAtOrUndefined) => {
  const firstIsEmail = typeof emailOrInputOtp === 'string' && String(emailOrInputOtp).includes('@');

  if (firstIsEmail) {
    const email = String(emailOrInputOtp).trim().toLowerCase();
    const inputOtp = String(expectedOtpOrInput || '').trim();

    if (!inputOtp || inputOtp.length !== 6) return { valid: false, error: 'Invalid OTP. Please check your email and try again.' };
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
      return { valid: false, error: 'This OTP has expired. Please request a new one.' };
    }
    if (record.attempts >= MAX_VERIFY_ATTEMPTS) {
      emailOtpStore.delete(email);
      return { valid: false, error: 'Too many attempts. Please request a new code.' };
    }

    const inputHash = hashEmailOtp(inputOtp, email);
    if (inputHash === record.hash) {
      emailOtpStore.delete(email);
      return { valid: true };
    } else {
      record.attempts += 1;
      if (record.attempts >= MAX_VERIFY_ATTEMPTS) {
        emailOtpStore.delete(email);
        return { valid: false, error: 'Too many attempts. Please request a new code.' };
      }
      return { valid: false, error: 'Invalid OTP. Please check your email and try again.' };
    }
  }

  const inputOtp = emailOrInputOtp;
  const expectedOtp = expectedOtpOrInput;
  const expiresAt = expiresAtOrUndefined;
  if (!inputOtp || inputOtp.length !== 6) return { valid: false, error: 'Invalid OTP. Please check your email and try again.' };
  if (expiresAt && Date.now() > expiresAt) return { valid: false, error: 'This OTP has expired. Please request a new one.' };
  if (inputOtp === expectedOtp) return { valid: true };
  return { valid: false, error: 'Invalid OTP. Please check your email and try again.' };
};

// Legacy aliases — mobile OTP no longer supported
export const sendMobileOtp = async () => {
  return { success: false, fallback: false, error: 'Mobile OTP is no longer supported. Please use Email OTP.' };
};
export const verifyMobileOtp = () => {
  return { valid: false, error: 'Mobile OTP is no longer supported. Please use Email OTP.' };
};

export const _clearEmailOtpStore = () => {
  emailOtpStore.clear();
};
export const _getEmailOtpStoreSize = () => emailOtpStore.size;
export const _peekEmailOtpRecord = (email) => {
  const rec = emailOtpStore.get(String(email).trim().toLowerCase());
  if (!rec) return null;
  return { expiresAt: rec.expiresAt, attempts: rec.attempts, verified: rec.verified, cooldownUntil: rec.cooldownUntil };
};

export const createOtpSession = (email) => {
  const normalized = String(email).trim().toLowerCase();
  const otp = generateOtp();
  return {
    email: normalized,
    otp,
    expiresAt: Date.now() + OTP_TTL_MS,
    createdAt: Date.now(),
  };
};
