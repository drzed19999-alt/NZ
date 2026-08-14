'use strict';

const config = require('../config');

// nodemailer is optional. If it isn't installed or SMTP isn't configured, we
// log the message instead of failing — useful in dev and keeps email an
// optional dependency of the platform.
let transporter = null;
try {
  if (config.smtp.host && config.smtp.user) {
    // eslint-disable-next-line global-require
    const nodemailer = require('nodemailer');
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: { user: config.smtp.user, pass: config.smtp.pass },
    });
  }
} catch {
  transporter = null;
}

async function sendMail({ to, subject, html, text }) {
  if (!transporter) {
    console.log(`[mailer] (no SMTP configured) would email ${to}: ${subject}`);
    if (text) console.log(`[mailer] body: ${text}`);
    return { delivered: false, logged: true };
  }
  await transporter.sendMail({ from: config.smtp.from, to, subject, html, text });
  return { delivered: true };
}

function activationEmail(user, activationUrl) {
  return {
    to: user.email,
    subject: 'Activate your VT Markets account',
    text: `Welcome to VT Markets.\n\nActivate your account and set your password:\n${activationUrl}\n\nIf you did not request this, ignore this email.`,
    html: `
      <div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:auto">
        <h2>Welcome to VT Markets</h2>
        <p>Your account has been created. Set your password to activate it:</p>
        <p><a href="${activationUrl}"
             style="background:#1434CB;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block">
             Activate account</a></p>
        <p style="color:#64748b;font-size:12px">If you did not request this, you can ignore this email.</p>
      </div>`,
  };
}

module.exports = { sendMail, activationEmail };
