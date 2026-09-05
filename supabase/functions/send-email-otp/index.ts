// supabase/functions/send-email-otp/index.ts
// Zolve Email OTP delivery via Supabase Edge Function + Brevo transactional email API
// POST { email, otp, user_name? } -> Brevo

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const ALLOWED_ORIGINS = [
  "https://zolve-three.vercel.app",
  "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:3000",
];

function getCorsHeaders(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-zolve-source",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

function jsonResponse(body: unknown, status: number, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  const cors = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }

  if (req.method !== "POST") {
    return jsonResponse({ success: false, error: "Method not allowed." }, 405, cors);
  }

  let payload: { email?: unknown; otp?: unknown; user_name?: unknown };
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ success: false, error: "Invalid JSON." }, 400, cors);
  }

  const rawEmail = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  const rawOtp = typeof payload.otp === "string" ? payload.otp.trim() : String(payload.otp ?? "").trim();
  const rawName = typeof payload.user_name === "string" ? payload.user_name.trim().slice(0, 100) : "";

  if (!rawEmail || !isValidEmail(rawEmail)) {
    return jsonResponse({ success: false, error: "Invalid email." }, 400, cors);
  }
  if (!/^\d{6}$/.test(rawOtp)) {
    return jsonResponse({ success: false, error: "Invalid OTP format." }, 400, cors);
  }

  const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
  const BREVO_FROM_EMAIL = Deno.env.get("BREVO_FROM_EMAIL");

  if (!BREVO_API_KEY) {
    console.error("[send-email-otp] BREVO_API_KEY not configured");
    return jsonResponse({ success: false, error: "Unable to send verification email." }, 500, cors);
  }

  if (!BREVO_FROM_EMAIL) {
    console.error("[send-email-otp] BREVO_FROM_EMAIL not configured");
    return jsonResponse({ success: false, error: "Unable to send verification email." }, 500, cors);
  }

  const displayName = rawName || "there";
  const subject = "Your Zolve OTP";
  const htmlContent = `
  <div style="font-family:Inter,system-ui,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px">
    <div style="text-align:center;margin-bottom:20px">
      <div style="display:inline-flex;align-items:center;gap:8px">
        <div style="width:40px;height:40px;border-radius:12px;background:#0f172a;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:18px">Z</div>
        <span style="font-weight:800;font-size:20px;color:#0f172a">Zolve</span>
      </div>
      <p style="font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#64748b;margin:6px 0 0">Cooperative Platform</p>
    </div>
    <h2 style="font-size:18px;font-weight:800;color:#0f172a;margin:0 0 8px">Your Zolve OTP</h2>
    <p style="font-size:14px;color:#334155;line-height:1.6;margin:0 0 12px">Hi ${escapeHtml(displayName)},</p>
    <p style="font-size:14px;color:#334155;line-height:1.6;margin:0 0 16px">Your Zolve verification OTP is:</p>
    <div style="text-align:center;margin:20px 0">
      <div style="display:inline-block;padding:14px 28px;border-radius:12px;background:#0f172a;color:#ffffff;letter-spacing:0.28em;font-weight:800;font-size:26px;font-family:ui-monospace,monospace">${escapeHtml(rawOtp)}</div>
    </div>
    <p style="font-size:13px;color:#475569;line-height:1.6;margin:0 0 6px">This OTP is valid for <strong>5 minutes</strong>.</p>
    <p style="font-size:13px;color:#475569;line-height:1.6;margin:0 0 16px">Please do not share this OTP with anyone. Zolve will never ask for it outside verification.</p>
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0" />
    <p style="font-size:11px;color:#94a3b8;margin:0">This email was sent by Zolve. If you didn't request this, you can safely ignore it.</p>
  </div>`.trim();

  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "api-key": BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: {
          email: BREVO_FROM_EMAIL,
          name: "Zolve",
        },
        to: [
          {
            email: rawEmail,
          },
        ],
        subject,
        htmlContent,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      console.error(`[send-email-otp] Brevo failed status=${res.status} body=${errBody.slice(0, 300)}`);
      return jsonResponse({ success: false, error: "Unable to send verification email." }, 502, cors);
    }

    return jsonResponse({ success: true }, 200, cors);
  } catch (_e) {
    console.error("[send-email-otp] Network/Brevo exception");
    return jsonResponse({ success: false, error: "Unable to send verification email." }, 502, cors);
  }
});

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
