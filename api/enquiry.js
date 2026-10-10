'use strict';

const DEFAULT_RECIPIENT = 'Info@intelleducare.com';
const RATE_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT = 6;
const recentRequests = new Map();

function sendJson(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.end(JSON.stringify(body));
}

function cleanString(value, maxLength) {
  if (typeof value !== 'string') return '';
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, maxLength);
}

function isValidEmail(value) {
  return !value || (value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));
}

function isValidPhone(value) {
  const digits = value.replace(/\D/g, '');
  return /^[+()\d\s.-]{8,25}$/.test(value) && digits.length >= 10 && digits.length <= 15;
}

function getClientKey(req) {
  // Vercel supplies x-forwarded-for; only the first address is used for a best-effort in-process limit.
  const forwarded = req.headers['x-forwarded-for'];
  const ip = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : '';
  return ip || req.socket?.remoteAddress || 'unknown';
}

function checkRateLimit(key, now = Date.now()) {
  const previous = recentRequests.get(key) || [];
  const active = previous.filter((timestamp) => now - timestamp < RATE_WINDOW_MS);
  if (active.length >= RATE_LIMIT) {
    recentRequests.set(key, active);
    return false;
  }
  active.push(now);
  recentRequests.set(key, active);
  // Opportunistically prune old IP entries to keep warm serverless processes bounded.
  if (recentRequests.size > 500) {
    for (const [entryKey, timestamps] of recentRequests.entries()) {
      if (timestamps.every((timestamp) => now - timestamp >= RATE_WINDOW_MS)) recentRequests.delete(entryKey);
    }
  }
  return true;
}

async function parseBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body || '{}');
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  const raw = Buffer.concat(chunks).toString('utf8');
  return JSON.parse(raw || '{}');
}

module.exports = async function handler(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, { message: 'Method not allowed.' });
  }

  const origin = req.headers.origin;
  const host = req.headers.host;
  if (origin && host) {
    try {
      if (new URL(origin).host !== host) return sendJson(res, 403, { message: 'Request origin could not be verified. Please refresh the page and try again.' });
    } catch {
      return sendJson(res, 403, { message: 'Request origin could not be verified.' });
    }
  }

  if (!checkRateLimit(getClientKey(req))) {
    return sendJson(res, 429, { message: 'Too many requests were received from this connection. Please try again in a little while or email us directly.' });
  }

  let body;
  try {
    body = await parseBody(req);
  } catch {
    return sendJson(res, 400, { message: 'The form data was not readable. Please refresh the page and try again.' });
  }

  // Quietly accept automated honeypot submissions without sending email.
  if (cleanString(body.website, 200)) return sendJson(res, 200, { ok: true });

  const fullName = cleanString(body.fullName, 100);
  const phone = cleanString(body.phone, 25);
  const email = cleanString(body.email, 254);
  const standard = cleanString(body.standard, 60);
  const board = cleanString(body.board, 100);
  const area = cleanString(body.area, 120);
  const message = cleanString(body.message, 2000);
  const consent = body.consent === true || body.consent === 'true' || body.consent === 'on';

  if (fullName.length < 2) return sendJson(res, 400, { message: 'Please enter the student or parent name.' });
  if (!isValidPhone(phone)) return sendJson(res, 400, { message: 'Please enter a valid mobile number, including the country code if needed.' });
  if (!isValidEmail(email)) return sendJson(res, 400, { message: 'Please check the email address and try again.' });
  if (!consent) return sendJson(res, 400, { message: 'Please agree to the Privacy Notice before sending your enquiry.' });

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.CONTACT_FROM_EMAIL;
  const to = cleanString(process.env.CONTACT_TO_EMAIL || DEFAULT_RECIPIENT, 254);
  if (!apiKey || !from) {
    console.error('Enquiry delivery is not configured: set RESEND_API_KEY and CONTACT_FROM_EMAIL.');
    return sendJson(res, 503, { message: 'The online enquiry service is being configured. Please email Info@intelleducare.com directly for now.' });
  }

  const subjectName = fullName.replace(/[\r\n]+/g, ' ').slice(0, 70);
  const text = [
    'New counselling enquiry from the IntellEducare website',
    '',
    `Student / parent name: ${fullName}`,
    `Mobile number: ${phone}`,
    `Email address: ${email || 'Not provided'}`,
    `Student standard: ${standard || 'Not provided'}`,
    `Board / pathway: ${board || 'Not provided'}`,
    `Preferred area: ${area || 'Not provided'}`,
    '',
    'Message:',
    message || 'Not provided',
    '',
    'Consent: The visitor agreed to the Privacy Notice to receive a response to this enquiry.'
  ].join('\n');

  const emailPayload = { from, to: [to], subject: `Website counselling enquiry — ${subjectName}`, text };
  if (email) emailPayload.reply_to = email;

  try {
    const providerResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(emailPayload)
    });
    if (!providerResponse.ok) {
      // Do not log the form payload or provider response, which may contain personal information.
      console.error(`Email delivery provider returned HTTP ${providerResponse.status}.`);
      return sendJson(res, 502, { message: 'We could not deliver the enquiry just now. Please email Info@intelleducare.com directly.' });
    }
    return sendJson(res, 200, { ok: true, message: 'Enquiry received.' });
  } catch {
    console.error('Email delivery provider could not be reached.');
    return sendJson(res, 502, { message: 'We could not deliver the enquiry just now. Please email Info@intelleducare.com directly.' });
  }
};
