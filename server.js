const express    = require('express');
const nodemailer = require('nodemailer');
const cors       = require('cors');
require('dotenv').config();

const app  = express();
const PORT = process.env.PORT || 3001;

/* ─────────────────────────────────────────────────────────────
   SMTP CONNECTION POOL
   pool:true  → keeps sockets open and reuses them — no TCP/TLS
                handshake on every request (biggest speed win).
   port 465 + secure:true → TLS from the start, faster than
                             STARTTLS on port 587.
   connectionTimeout / socketTimeout → fail fast instead of
                                       hanging the user.
───────────────────────────────────────────────────────────── */
const transporter = nodemailer.createTransport({
  host:   'smtp.gmail.com',
  port:   465,
  secure: true,           // immediate TLS — faster than STARTTLS
  pool:   true,           // reuse connections across requests
  maxConnections: 3,      // keep 3 sockets warm
  maxMessages:    100,
  rateDelta:      1000,
  rateLimit:      5,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
  connectionTimeout: 5000,
  greetingTimeout:   5000,
  socketTimeout:     8000,
});

/* Warm up the connection pool on startup — not on the first request */
transporter.verify((err) => {
  if (err) console.error('[smtp] Connection error:', err.message);
  else     console.log('[smtp] Connection pool ready ✓');
});

/* ── Middleware ─────────────────────────────────────────────── */
app.use(cors({
  origin:  process.env.FRONTEND_ORIGIN || '*',
  methods: ['POST', 'GET', 'OPTIONS'],
}));
app.use(express.json({ limit: '16kb' }));

/* ── Email template helpers ─────────────────────────────────── */
const emailToYou = (name, email, subject, message) => ({
  from:    `"Portfolio Contact" <${process.env.GMAIL_USER}>`,
  to:      process.env.GMAIL_USER,
  replyTo: email,
  subject: subject ? `Portfolio enquiry: ${subject}` : `Portfolio enquiry from ${name}`,
  html: `<div style="font-family:sans-serif;max-width:600px;padding:24px;color:#111;">
    <h2 style="margin:0 0 4px;">New enquiry from your portfolio</h2>
    <hr style="border:none;border-top:1px solid #e8e7e2;margin:16px 0;">
    <table style="width:100%;font-size:14px;border-collapse:collapse;">
      <tr><td style="padding:6px 0;color:#636360;width:80px;">Name</td><td style="padding:6px 0;"><strong>${name}</strong></td></tr>
      <tr><td style="padding:6px 0;color:#636360;">Email</td><td><a href="mailto:${email}">${email}</a></td></tr>
      ${subject ? `<tr><td style="padding:6px 0;color:#636360;">Subject</td><td style="padding:6px 0;">${subject}</td></tr>` : ''}
    </table>
    <hr style="border:none;border-top:1px solid #e8e7e2;margin:16px 0;">
    <p style="font-size:14px;line-height:1.7;white-space:pre-wrap;">${message}</p>
    <hr style="border:none;border-top:1px solid #e8e7e2;margin:16px 0;">
    <p style="font-size:12px;color:#a4a39b;">Sent from portfolio enquiry form</p>
  </div>`,
});

const emailToSender = (name, email) => ({
  from:    `"Abhinav Verma" <${process.env.GMAIL_USER}>`,
  to:      email,
  subject: `Got your message — Abhinav Verma`,
  html: `<div style="font-family:sans-serif;max-width:600px;padding:24px;color:#111;">
    <h2 style="margin:0 0 4px;">Thanks for reaching out, ${name}!</h2>
    <p style="font-size:14px;line-height:1.7;color:#636360;">
      I've received your message and will get back to you within 24–48 hours.
      Feel free to check out my work on
      <a href="https://github.com/AbhinavVerma">GitHub</a> or connect on
      <a href="https://linkedin.com/in/AbhinavVerma">LinkedIn</a>.
    </p>
    <hr style="border:none;border-top:1px solid #e8e7e2;margin:16px 0;">
    <p style="font-size:12px;color:#a4a39b;">
      Abhinav Verma · Software Engineer &amp; Builder<br>
      akv09072002@gmail.com · +91 80907 43945
    </p>
  </div>`,
});

/* ── Health check ───────────────────────────────────────────── */
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

/* ── POST /api/enquiry ──────────────────────────────────────── */
app.post('/api/enquiry', async (req, res) => {
  const { name, email, subject, message } = req.body ?? {};

  /* Validation — fast sync, zero I/O */
  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return res.status(400).json({ success: false, error: 'name, email and message are required.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, error: 'Invalid email address.' });
  }

  /* Sanitise lengths */
  const safeName    = name.trim().slice(0, 120);
  const safeEmail   = email.trim().slice(0, 254);
  const safeSubject = (subject ?? '').trim().slice(0, 200);
  const safeMsg     = message.trim().slice(0, 5000);

  try {
    /* Fire BOTH emails in parallel — cuts wait time roughly in half
       vs. the old sequential await … await pattern              */
    await Promise.all([
      transporter.sendMail(emailToYou(safeName, safeEmail, safeSubject, safeMsg)),
      transporter.sendMail(emailToSender(safeName, safeEmail)),
    ]);

    console.log(`[enquiry] ✓ ${safeName} <${safeEmail}> — ${new Date().toISOString()}`);
    res.json({ success: true });
  } catch (err) {
    console.error('[enquiry] ✗', err.message);
    res.status(500).json({ success: false, error: 'Failed to send. Please email akv09072002@gmail.com directly.' });
  }
});

app.listen(PORT, () => console.log(`Portfolio backend → http://localhost:${PORT}`));
