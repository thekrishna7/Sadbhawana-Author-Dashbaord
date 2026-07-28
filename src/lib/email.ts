import nodemailer from 'nodemailer';
import { db } from './db';

const SENDER_EMAIL = process.env.SMTP_USER || 'adminsadbhawana@gmail.com';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');

export async function sendEmail({
  to,
  subject,
  title,
  bodyText,
  buttonText,
  buttonUrl,
}: {
  to: string;
  subject: string;
  title: string;
  bodyText: string;
  buttonText?: string;
  buttonUrl?: string;
}) {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f6f9; margin: 0; padding: 20px; color: #1e293b; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; }
          .header { background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); padding: 30px; text-align: center; color: #ffffff; }
          .logo { font-size: 24px; font-weight: 800; letter-spacing: 1px; color: #38bdf8; text-transform: uppercase; margin: 0; }
          .sublogo { font-size: 13px; color: #94a3b8; margin-top: 4px; letter-spacing: 2px; }
          .content { padding: 35px 30px; }
          .title { font-size: 20px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 16px; }
          .body-text { font-size: 15px; line-height: 1.6; color: #475569; margin-bottom: 25px; white-space: pre-line; }
          .btn { display: inline-block; padding: 14px 28px; background-color: #2563eb; color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; text-align: center; }
          .footer { background-color: #f8fafc; padding: 20px 30px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 class="logo">Sadbhawana Publication</h1>
            <div class="sublogo">AUTHOR PORTAL & MANAGEMENT</div>
          </div>
          <div class="content">
            <h2 class="title">${title}</h2>
            <div class="body-text">${bodyText}</div>
            ${buttonText && buttonUrl ? `<div style="text-align: center; margin: 30px 0;"><a href="${buttonUrl}" class="btn">${buttonText}</a></div>` : ''}
          </div>
          <div class="footer">
            <p>This is an automated notification from Sadbhawana Publication system.<br>If you need assistance, contact admin at adminsadbhawana@gmail.com</p>
            <p>© ${new Date().getFullYear()} Sadbhawana Publication. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  let sentStatus = 'SENT';

  try {
    if (SMTP_PASS) {
      const transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_PORT === 465,
        auth: {
          user: SENDER_EMAIL,
          pass: SMTP_PASS,
        },
      });

      await transporter.sendMail({
        from: `"Sadbhawana Publication" <${SENDER_EMAIL}>`,
        to,
        subject,
        html: htmlContent,
      });
    }
  } catch (err) {
    console.error('SMTP email dispatch error (logged to DB):', err);
    sentStatus = 'FAILED';
  }

  // Record in EmailLog table
  try {
    await db.emailLog.create({
      data: {
        recipientEmail: to,
        subject,
        bodyHtml: htmlContent,
        status: sentStatus,
      },
    });
  } catch (e) {
    console.error('Failed to log email to DB:', e);
  }
}
