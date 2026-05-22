import { createAdminClient } from "./supabase/admin";
import { promises as fs } from "fs";
import path from "path";

export async function triggerNotification(params: {
  userIds: string[];
  type: string;
  title: string;
  body: string;
  link?: string | null;
  metadata?: Record<string, any> | null;
}) {
  const { userIds, type, title, body, link, metadata } = params;
  if (!userIds || userIds.length === 0) return { ok: true, count: 0 };

  const adminClient = createAdminClient();

  // 1. Insert into database
  const notificationsData = userIds.map((uid) => ({
    user_id: uid,
    type,
    title,
    body, // Body corresponds to the message body in our schema
    link: link || null,
    metadata: metadata || null,
    read: false,
  }));

  const { error: dbErr } = await adminClient.from("notifications").insert(notificationsData);
  if (dbErr) {
    console.error("Failed to insert notifications in database:", dbErr);
  }

  // 2. Query target user profiles to get email, full_name, and role
  const { data: profiles, error: profileErr } = await adminClient
    .from("profiles")
    .select("id, email, full_name, role")
    .in("id", userIds);

  if (profileErr || !profiles) {
    console.error("Failed to retrieve user profiles for emails:", profileErr);
    return { ok: !dbErr, error: dbErr?.message };
  }

  // 3. For each profile, send email
  const resendApiKey = process.env.RESEND_API_KEY;
  const emailsSent: any[] = [];
  const sentEmails = new Set<string>();

  // Determine admin notification email from configuration or default fallback
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || "adminsadbhawanapublication@gmail.com";

  for (const profile of profiles) {
    const isAdmin = profile.role === "super_admin" || profile.role === "staff";
    const recipientEmail = isAdmin ? adminEmail : profile.email;

    if (!recipientEmail) continue;

    // Deduplicate recipient emails to avoid duplicate notifications in a single batch trigger
    if (sentEmails.has(recipientEmail)) continue;
    sentEmails.add(recipientEmail);

    const displayName = isAdmin ? "Administrator" : (profile.full_name || "Author");

    // Construct beautiful luxury HTML email content
    const htmlContent = getLuxuryEmailHtml({
      name: displayName,
      title,
      body,
      link: link ? `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}${link}` : undefined,
    });

    const emailPayload = {
      from: "Sadbhawana Publication <onboarding@resend.dev>", // Fallback onboarding address
      to: recipientEmail,
      subject: `[Sadbhawana OS] ${title}`,
      html: htmlContent,
    };

    let sent = false;
    let errorMsg = null;

    if (resendApiKey && resendApiKey !== "placeholder" && !resendApiKey.startsWith("YOUR_")) {
      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(emailPayload),
        });

        if (response.ok) {
          sent = true;
        } else {
          const errData = await response.json();
          errorMsg = JSON.stringify(errData);
          console.error(`Resend API failed for ${recipientEmail}:`, errData);
        }
      } catch (err: any) {
        errorMsg = err?.message || "Network error";
        console.error(`Resend send exception for ${recipientEmail}:`, err);
      }
    }

    // Always log or write to simulated mailbox if Resend failed or is unconfigured
    const mockEmailData = {
      id: Math.random().toString(36).substring(2, 9),
      to: recipientEmail,
      name: displayName,
      subject: emailPayload.subject,
      body,
      html: htmlContent,
      link: link || undefined,
      sentAt: new Date().toISOString(),
      realSent: sent,
      error: errorMsg,
    };

    await appendMockEmail(mockEmailData);
    emailsSent.push(mockEmailData);
  }

  return { ok: true, emails: emailsSent };
}

async function appendMockEmail(email: any) {
  const filePath = path.join(process.cwd(), "public", "mock-emails.json");
  try {
    // Ensure public folder exists
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
    // keep last 50 emails
    if (emails.length > 50) emails = emails.slice(0, 50);

    await fs.writeFile(filePath, JSON.stringify(emails, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write mock email:", err);
  }
}

function getLuxuryEmailHtml(params: { name: string; title: string; body: string; link?: string }) {
  const { name, title, body, link } = params;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
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
      border: 1px solid rgba(139, 92, 246, 0.2);
      border-radius: 28px;
      padding: 48px;
      box-shadow: 0 30px 60px -15px rgba(0, 0, 0, 0.9), 0 0 50px rgba(139, 92, 246, 0.08);
    }
    .header {
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      padding-bottom: 32px;
      margin-bottom: 40px;
      text-align: center;
    }
    .logo {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 26px;
      font-weight: 700;
      letter-spacing: 0.15em;
      color: #ffffff;
      margin: 0;
      background: linear-gradient(to right, #ffffff, #c084fc, #818cf8);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .subtitle {
      font-size: 10px;
      color: #c084fc;
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
      letter-spacing: 0.02em;
    }
    .title {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 24px;
      font-weight: 600;
      color: #ffffff;
      margin-top: 0;
      margin-bottom: 24px;
      line-height: 1.35;
      letter-spacing: -0.01em;
    }
    .message {
      font-size: 15px;
      color: #e4e4e7;
      line-height: 1.8;
      margin-bottom: 36px;
      font-weight: 300;
    }
    .btn-wrapper {
      text-align: center;
      margin: 40px 0;
    }
    .btn {
      display: inline-block;
      background: linear-gradient(135deg, #8b5cf6, #6366f1);
      color: #ffffff !important;
      text-decoration: none;
      padding: 16px 40px;
      border-radius: 18px;
      font-size: 14px;
      font-weight: 600;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      box-shadow: 0 12px 30px -8px rgba(139, 92, 246, 0.5);
      border: 1px solid rgba(255, 255, 255, 0.15);
      transition: all 0.3s ease;
    }
    .footer {
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      padding-top: 32px;
      text-align: center;
      font-size: 11px;
      color: #52525b;
      line-height: 1.6;
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
      <h1 class="logo">SADBHAWANA</h1>
      <p class="subtitle">Luxury Publishing Ecosystem</p>
    </div>
    <div class="content">
      <p class="greeting">Dear ${name},</p>
      <h2 class="title">${title}</h2>
      <p class="message">${body}</p>
      ${
        link
          ? `<div class="btn-wrapper">
               <a href="${link}" class="btn">Access OS Workspace</a>
             </div>`
          : ""
      }
    </div>
    <div class="footer">
      <p class="footer-brand">Sadbhawana Publication</p>
      <p style="margin: 6px 0 0 0; color: #52525b; font-weight: 400; letter-spacing: 0.02em;">Delivered securely via Publishing OS Enterprise Hub.</p>
    </div>
  </div>
</body>
</html>`;
}
