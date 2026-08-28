import emailjs from '@emailjs/browser';

const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;

export const initEmailJS = () => {
  if (EMAILJS_PUBLIC_KEY && EMAILJS_PUBLIC_KEY !== 'your_public_key_here') {
    try {
      emailjs.init(EMAILJS_PUBLIC_KEY);
    } catch (err) {
      console.warn('EmailJS initialization warning:', err);
    }
  }
};

export const sendOtpEmail = async (toEmail, otpCode, userName) => {
  const isUnconfigured =
    !EMAILJS_PUBLIC_KEY ||
    EMAILJS_PUBLIC_KEY === 'your_public_key_here' ||
    !EMAILJS_SERVICE_ID ||
    EMAILJS_SERVICE_ID === 'your_service_id_here' ||
    !EMAILJS_TEMPLATE_ID ||
    EMAILJS_TEMPLATE_ID === 'your_template_id_here';

  if (isUnconfigured) {
    console.warn('[DEV FALLBACK] EmailJS not fully configured. Using fallback OTP mode.');
    console.log(`[DEV FALLBACK] OTP for ${toEmail}: ${otpCode}`);
    return {
      success: false,
      fallback: true,
      error: 'EmailJS credentials not configured'
    };
  }

  // Comprehensive template params to match any EmailJS template variable naming strategy
  const formattedMsg = `Your 6-digit verification code for Zolve is: ${otpCode}. Valid for 10 minutes. Do not share this code with anyone.`;

  const templateParams = {
    // Recipient & User Name aliases
    to_email: toEmail,
    email: toEmail,
    user_email: toEmail,
    recipient_email: toEmail,
    to: toEmail,
    to_name: userName || 'User',
    user_name: userName || 'User',
    name: userName || 'User',
    recipient_name: userName || 'User',

    // OTP / Passcode / PIN / Token aliases
    otp_code: otpCode,
    otp: otpCode,
    code: otpCode,
    passcode: otpCode,
    pass_code: otpCode,
    otp_passcode: otpCode,
    pin: otpCode,
    pin_code: otpCode,
    otp_pin: otpCode,
    verification_code: otpCode,
    verify_code: otpCode,
    v_code: otpCode,
    vcode: otpCode,
    security_code: otpCode,
    secret_code: otpCode,
    token: otpCode,
    auth_code: otpCode,
    digits: otpCode,
    number: otpCode,
    otp_number: otpCode,

    // Header & Content aliases
    from_name: 'Zolve Security Platform',
    subject: `Your Zolve Verification Code: ${otpCode}`,
    title: `Your Zolve Verification Code: ${otpCode}`,
    message: formattedMsg,
    body: formattedMsg,
    content: formattedMsg,
    text: formattedMsg,
    details: formattedMsg,
  };

  try {
    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      templateParams,
      EMAILJS_PUBLIC_KEY
    );

    console.log('EmailJS dispatch successful:', response);
    return { success: true, response };
  } catch (err) {
    console.warn('EmailJS API call error:', err);
    return {
      success: false,
      fallback: true,
      error: err?.text || err?.message || 'Email delivery failed'
    };
  }
};

