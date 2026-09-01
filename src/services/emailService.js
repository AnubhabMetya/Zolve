// Deprecated — EmailJS OTP removed. Supabase Auth is the only source of truth.
// This stub is kept for backward compat; any auth OTP should use Supabase Auth.

export const initEmailJS = () => {
  console.warn('[emailService] EmailJS is deprecated — use Supabase Auth');
};

export const sendOtpEmail = async () => {
  console.warn('[emailService] sendOtpEmail is deprecated — use Supabase Auth');
  return {
    success: false,
    fallback: false,
    error: 'EmailJS OTP is deprecated. Please use Supabase Auth (Login/Signup pages).'
  };
};
