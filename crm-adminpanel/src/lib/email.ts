import 'server-only';
import { env } from '@/lib/env';

// Provider-agnostic email via SMTP (nodemailer). nodemailer is imported lazily
// so it stays optional; if SMTP isn't configured we log instead of sending.
let transporterPromise: Promise<any> | null = null;

async function getTransporter() {
  if (!env.smtp.host || !env.smtp.user) return null;
  if (!transporterPromise) {
    transporterPromise = import('nodemailer').then((nm) =>
      nm.createTransport({
        host: env.smtp.host,
        port: env.smtp.port,
        secure: env.smtp.port === 465,
        auth: { user: env.smtp.user, pass: env.smtp.pass },
      })
    );
  }
  return transporterPromise;
}

export interface SendEmailInput {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}

export async function sendEmail(input: SendEmailInput): Promise<{ delivered: boolean }> {
  const transporter = await getTransporter();
  if (!transporter) {
    console.log(`[email] (no SMTP) would send to ${input.to}: ${input.subject}`);
    return { delivered: false };
  }
  await transporter.sendMail({
    from: env.smtp.from,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  });
  return { delivered: true };
}
