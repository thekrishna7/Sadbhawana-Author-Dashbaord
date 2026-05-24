import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import nodemailer from "nodemailer";
import { promises as fs } from "fs";
import path from "path";

// Simple in-memory storage for OTPs and verification tokens
// Persists within the running Node process instance
const otpStore = new Map<string, { otp: string; expiresAt: number }>();
const resetTokenStore = new Map<string, { email: string; expiresAt: number }>();

const smtpEmail = process.env.SMTP_EMAIL || "krishnasharmaambah961u@gmail.com";
const smtpPassword = process.env.SMTP_PASSWORD || "syoz crim pzlb dqmf";

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: smtpEmail,
    pass: smtpPassword,
  },
});

async function appendMockEmail(email: any) {
  const filePath = path.join(process.cwd(), "public", "mock-emails.json");
  try {
    const publicDir = path.join(process.cwd(), "public");
    await fs.mkdir(publicDir, { recursive: true });

    let emails = [];
    try {
      const content = await fs.readFile(filePath, "utf-8");
      emails = JSON.parse(content);
    } catch {
      // file doesn't exist
    }

    emails.unshift(email);
    if (emails.length > 50) emails = emails.slice(0, 50);

    await fs.writeFile(filePath, JSON.stringify(emails, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write mock email:", err);
  }
}

function getOtpEmailHtml(name: string, otp: string) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Security Verification Code</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&display=swap');
    
    body {
      background-color: #030303;
      color: #f4f4f5;
      font-family: 'Outfit', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      margin: 0;
      padding: 40px 10px;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      max-width: 580px;
      margin: 0 auto;
      background: linear-gradient(145deg, #09090b, #121218);
      border: 1px solid rgba(212, 175, 55, 0.2);
      border-radius: 28px;
      padding: 48px;
      box-shadow: 0 30px 60px -15px rgba(0, 0, 0, 0.9), 0 0 50px rgba(212, 175, 55, 0.05);
    }
    .header {
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      padding-bottom: 32px;
      margin-bottom: 40px;
      text-align: center;
    }
    .logo {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 24px;
      font-weight: 700;
      letter-spacing: 0.15em;
      color: #ffffff;
      margin: 0;
      background: linear-gradient(to right, #ffffff, #f59e0b, #d4af37);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .subtitle {
      font-size: 10px;
      color: #d4af37;
      letter-spacing: 0.25em;
      text-transform: uppercase;
      margin: 8px 0 0 0;
      font-weight: 600;
    }
    .greeting {
      font-size: 15px;
      color: #a1a1aa;
      margin-bottom: 16px;
      font-weight: 400;
    }
    .title {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 22px;
      font-weight: 600;
      color: #ffffff;
      margin-top: 0;
      margin-bottom: 24px;
      line-height: 1.35;
    }
    .otp-container {
      text-align: center;
      margin: 32px 0;
      padding: 24px;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 20px;
    }
    .otp-code {
      font-family: monospace;
      font-size: 36px;
      font-weight: 800;
      letter-spacing: 0.2em;
      color: #f59e0b;
      margin: 0;
      text-shadow: 0 0 12px rgba(245, 158, 11, 0.2);
    }
    .message {
      font-size: 14px;
      color: #e4e4e7;
      line-height: 1.8;
      margin-bottom: 30px;
      font-weight: 300;
    }
    .footer {
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      padding-top: 32px;
      text-align: center;
      font-size: 11px;
      color: #52525b;
    }
    .footer-brand {
      color: #a1a1aa;
      font-weight: 600;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      font-size: 10px;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1 class="logo">SADBHAWANA PUBLICATION</h1>
      <p class="subtitle">Private Secure Portal</p>
    </div>
    <div class="content">
      <p class="greeting">Hello ${name},</p>
      <h2 class="title">Verification Code for Password Reset</h2>
      <p class="message">We received a request to reset your password. Use the verification code below to verify your identity. This code is valid for 5 minutes.</p>
      <div class="otp-container">
        <p class="otp-code">${otp}</p>
      </div>
      <p class="message" style="font-size: 12px; color: #71717a;">If you did not initiate this request, you can safely ignore this email. Your password will remain unchanged.</p>
    </div>
    <div class="footer">
      <p class="footer-brand">Sadbhawana Publication</p>
      <p style="margin: 6px 0 0 0; color: #52525b;">This is an automated security transmission.</p>
    </div>
  </div>
</body>
</html>`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    const adminClient = createAdminClient();

    // Clean up expired tokens/otps to avoid memory growth
    const now = Date.now();
    for (const [key, val] of otpStore.entries()) {
      if (val.expiresAt < now) otpStore.delete(key);
    }
    for (const [key, val] of resetTokenStore.entries()) {
      if (val.expiresAt < now) resetTokenStore.delete(key);
    }

    // 1. SEND OTP ACTION
    if (action === "send-otp") {
      const { identifier } = body; // email or phone number
      if (!identifier) {
        return NextResponse.json({ error: "Email or phone number is required" }, { status: 400 });
      }

      // Query profile
      const { data: profile, error: pErr } = await adminClient
        .from("profiles")
        .select("id, email, full_name, phone")
        .or(`email.eq.${identifier},phone.eq.${identifier}`)
        .maybeSingle();

      if (pErr) {
        console.error("Database query error:", pErr);
        return NextResponse.json({ error: "Database error querying profile" }, { status: 500 });
      }

      if (!profile) {
        return NextResponse.json({ error: "No profile found with that email or phone" }, { status: 404 });
      }

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
      
      otpStore.set(profile.email, { otp, expiresAt });

      // Send Email
      const emailHtml = getOtpEmailHtml(profile.full_name || "Author", otp);
      const emailPayload = {
        from: `"Sadbhawana Publication" <${smtpEmail}>`,
        to: profile.email,
        subject: "[Sadbhawana Publication] Password Reset Verification Code",
        html: emailHtml,
      };

      let sent = false;
      let errorMsg = null;

      try {
        await transporter.sendMail(emailPayload);
        sent = true;
      } catch (err: any) {
        errorMsg = err?.message || "SMTP error";
        console.error(`SMTP send error for ${profile.email}:`, err);
      }

      // Record in mock emails for local dashboard test visibility
      const mockEmailData = {
        id: Math.random().toString(36).substring(2, 9),
        to: profile.email,
        name: profile.full_name || "Author",
        subject: emailPayload.subject,
        body: `Your password reset verification code is ${otp}.`,
        html: emailHtml,
        sentAt: new Date().toISOString(),
        realSent: sent,
        error: errorMsg,
      };
      await appendMockEmail(mockEmailData);

      return NextResponse.json({ success: true, email: profile.email });
    }

    // 2. VERIFY OTP ACTION
    if (action === "verify-otp") {
      const { email, otp } = body;
      if (!email || !otp) {
        return NextResponse.json({ error: "Email and OTP are required" }, { status: 400 });
      }

      const cached = otpStore.get(email);
      if (!cached) {
        return NextResponse.json({ error: "Verification code expired or not found. Please request a new one." }, { status: 400 });
      }

      if (cached.expiresAt < Date.now()) {
        otpStore.delete(email);
        return NextResponse.json({ error: "Verification code expired. Please request a new one." }, { status: 400 });
      }

      if (cached.otp !== otp) {
        return NextResponse.json({ error: "Invalid verification code. Please check and try again." }, { status: 400 });
      }

      // Success, remove OTP and generate a temporary reset token
      otpStore.delete(email);
      const tempToken = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
      const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes to reset password

      resetTokenStore.set(tempToken, { email, expiresAt });

      return NextResponse.json({ success: true, resetToken: tempToken });
    }

    // 3. RESET PASSWORD ACTION
    if (action === "reset-password") {
      const { email, token, password } = body;
      if (!email || !token || !password) {
        return NextResponse.json({ error: "Email, token, and new password are required" }, { status: 400 });
      }

      const cached = resetTokenStore.get(token);
      if (!cached || cached.email !== email) {
        return NextResponse.json({ error: "Invalid or expired session. Please request a new OTP." }, { status: 400 });
      }

      if (cached.expiresAt < Date.now()) {
        resetTokenStore.delete(token);
        return NextResponse.json({ error: "Session expired. Please request a new OTP." }, { status: 400 });
      }

      // Get profile ID
      const { data: profile, error: pErr } = await adminClient
        .from("profiles")
        .select("id")
        .eq("email", email)
        .single();

      if (pErr || !profile) {
        return NextResponse.json({ error: "Author profile not found" }, { status: 400 });
      }

      // Update password in Supabase Auth using admin client
      const { error: resetErr } = await adminClient.auth.admin.updateUserById(profile.id, {
        password: password,
      });

      if (resetErr) {
        console.error("Supabase Admin password update error:", resetErr);
        return NextResponse.json({ error: resetErr.message }, { status: 400 });
      }

      // Success, clean up reset token
      resetTokenStore.delete(token);

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    console.error("Forgot password API handler error:", err);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
