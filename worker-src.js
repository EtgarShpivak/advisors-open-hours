// Advisors Office Hours — Cloudflare Pages _worker.js
// Pure Web APIs — no Node.js dependencies

const BASE_URL = 'https://advisorsofficehours.com';

function sbHeaders(env) {
  return {
    'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
  };
}

async function sbGet(env, table, params) {
  const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${table}${params || ''}`, { headers: sbHeaders(env) });
  const text = await res.text();
  return text ? JSON.parse(text) : [];
}

async function sbPost(env, table, body) {
  const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST', headers: sbHeaders(env), body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(text);
  return text ? JSON.parse(text) : null;
}

async function sbPatch(env, table, params, body) {
  const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${table}${params}`, {
    method: 'PATCH',
    headers: { ...sbHeaders(env), 'Prefer': 'return=representation' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(text);
  return text ? JSON.parse(text) : null;
}

async function sbStorageUpload(env, bucket, path, file) {
  const arrayBuffer = await file.arrayBuffer();
  const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/${bucket}/${path}`, {
    method: 'PUT',
    headers: {
      'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': file.type || 'image/jpeg',
      'x-upsert': 'true',
    },
    body: arrayBuffer,
  });
  if (!res.ok) { const err = await res.text(); throw new Error(err); }
  return `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}

// ── Raw send (no logging — used internally for the limit alert itself) ─────────
async function sendEmailRaw(env, to, subject, html) {
  const recipients = Array.isArray(to) ? to : [to];
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: env.FROM_EMAIL || 'hello@advisorsofficehours.com', to: recipients, subject, html }),
  });
  if (!res.ok) { const err = await res.text(); throw new Error('Resend: ' + err); }
}

// ── Email with logging + daily limit check ────────────────────────────────────
async function sendEmail(env, to, subject, html, type) {
  const recipients = Array.isArray(to) ? to : [to];

  // 1. Send the email
  await sendEmailRaw(env, recipients, subject, html);

  // 2. Log to email_logs (silently ignore if table doesn't exist yet)
  const logType = type || 'email';
  try {
    await sbPost(env, 'email_logs', {
      recipient: recipients.join(','),
      subject: subject.slice(0, 200),
      type: logType,
    });
  } catch(e) { /* table may not exist yet — see create-tables.sql */ }

  // 3. Check daily total and alert admins if approaching Resend free limit (100/day)
  try {
    const today = new Date().toISOString().split('T')[0];
    const logs = await sbGet(env, 'email_logs', '?sent_at=gte.' + today + 'T00:00:00Z&select=type');
    if (!logs) return;
    const total = logs.length;
    const ALERT_THRESHOLD = 90;
    if (total >= ALERT_THRESHOLD) {
      // Only alert once per day — check if an alert was already sent today
      const alertAlreadySent = logs.some(function(l) { return l.type === 'daily_limit_alert'; });
      if (!alertAlreadySent) {
        const alertHtml = '<html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1a1a1a">'
          + '<div style="background:#FEF3C7;border:1px solid #FCD34D;border-radius:8px;padding:16px 20px;margin-bottom:20px">'
          + '<p style="font-size:16px;font-weight:700;color:#92400E;margin:0 0 6px">⚠️ Email limit warning</p>'
          + '<p style="font-size:14px;color:#78350F;margin:0"><strong>' + total + ' emails</strong> sent today (threshold: ' + ALERT_THRESHOLD + ', limit: 100).</p>'
          + '</div>'
          + '<p style="font-size:14px;color:#555;">This is an automatic alert from Advisors Office Hours. Resend free tier allows 100 emails/day. '
          + 'All request data is safely stored in the database regardless of whether emails go through.</p>'
          + '<p style="font-size:14px;color:#555;">Consider upgrading your Resend plan if daily volume continues to grow.</p>'
          + '<p style="font-size:11px;color:#aaa;margin-top:24px">Advisors Office Hours &middot; advisorsofficehours.com</p>'
          + '</body></html>';
        try {
          await sendEmailRaw(env, ['peerafeldman@gmail.com', 'etgar.shpivak@gmail.com'],
            '⚠️ Advisors Office Hours: Email limit approaching (' + total + '/100 today)', alertHtml);
          // Mark that alert was sent
          await sbPost(env, 'email_logs', { recipient: 'admins', subject: 'Daily limit alert', type: 'daily_limit_alert' });
        } catch(e) { /* silent */ }
      }
    }
  } catch(e) { /* email_logs table may not exist yet */ }
}

function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function isAdminEmail(email, env) {
  if (!email) return false;
  const adminEmails = (env.ADMIN_EMAILS || '').split(',').map(function(e) { return e.trim().toLowerCase(); });
  return adminEmails.includes(email.trim().toLowerCase());
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,x-admin-email',
  };
}

function jsonResponse(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: Object.assign({ 'Content-Type': 'application/json' }, corsHeaders()),
  });
}

async function getAdvisors(env) {
  try {
    const data = await sbGet(env, 'advisors', '?active=eq.true&order=name');
    const arr = Array.isArray(data) ? data : [];
    return new Response(JSON.stringify(arr), {
      headers: Object.assign({
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
      }, corsHeaders()),
    });
  } catch(e) { return jsonResponse({ error: String(e) }, 500); }
}

async function postRequest(req, env) {
  try {
    const body = await req.json();
    const required = ['startup_name','company','description','stage','arr','help_needed','advisor_id','startup_email'];
    const missing = required.filter(function(k) { return !body[k]; });
    if (missing.length) return jsonResponse({ error: 'Missing: ' + missing.join(', ') }, 400);

    const advisors = await sbGet(env, 'advisors', '?id=eq.' + body.advisor_id);
    if (!advisors || !advisors.length) return jsonResponse({ error: 'Advisor not found' }, 404);
    const advisor = advisors[0];

    const token = uuidv4();
    await sbPost(env, 'requests', {
      startup_name: body.startup_name, company: body.company, description: body.description,
      linkedin: body.linkedin || '', stage: body.stage, arr: body.arr,
      verticals: body.verticals || [], help_needed: body.help_needed,
      advisor_id: body.advisor_id, advisor_name: advisor.name,
      startup_email: body.startup_email, status: 'pending', token: token,
    });

    const approveUrl = BASE_URL + '/api/approve?t=' + token;
    const declineUrl = BASE_URL + '/api/decline?t=' + token;
    const emailHtml = '<html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1a1a1a">'
      + '<div style="border-bottom:2px solid #1a1a1a;padding-bottom:14px;margin-bottom:22px"><span style="font-size:12px;font-weight:700;letter-spacing:.09em;text-transform:uppercase">Advisors Office Hours</span></div>'
      + '<p style="font-size:16px;margin:0 0 20px">Hi ' + advisor.name + ', a founder would like to meet with you.</p>'
      + '<div style="background:#f6f6f6;border-radius:8px;padding:18px 22px;margin-bottom:22px">'
      + '<table style="width:100%;border-collapse:collapse;font-size:14px">'
      + '<tr><td style="padding:5px 0;color:#666;width:120px">Company</td><td style="padding:5px 0;font-weight:700">' + body.company + '</td></tr>'
      + '<tr><td style="padding:5px 0;color:#666">Founder</td><td style="padding:5px 0">' + body.startup_name + '</td></tr>'
      + '<tr><td style="padding:5px 0;color:#666">Stage</td><td style="padding:5px 0">' + body.stage + '</td></tr>'
      + '<tr><td style="padding:5px 0;color:#666">ARR</td><td style="padding:5px 0">' + body.arr + '</td></tr>'
      + '</table>'
      + (body.linkedin ? '<div style="margin-top:14px"><a href="' + body.linkedin + '" style="display:inline-flex;align-items:center;gap:7px;background:#0077B5;color:#fff;text-decoration:none;padding:9px 16px;border-radius:8px;font-size:13px;font-weight:600">🔗 View Founder on LinkedIn</a></div>' : '')
      + '</div>'
      + '<div style="margin-bottom:22px">'
      + '<p style="font-size:12px;font-weight:700;color:#666;text-transform:uppercase;letter-spacing:.06em;margin:0 0 6px">About the company</p>'
      + '<p style="font-size:14px;margin:0 0 14px">' + body.description + '</p>'
      + '<p style="font-size:12px;font-weight:700;color:#666;text-transform:uppercase;letter-spacing:.06em;margin:0 0 6px">What they need help with</p>'
      + '<p style="font-size:14px;margin:0">' + body.help_needed + '</p>'
      + '</div>'
      + '<table style="width:100%"><tr>'
      + '<td style="width:50%;padding-right:8px"><a href="' + approveUrl + '" style="display:block;background:#1a1a1a;color:#fff;text-decoration:none;text-align:center;padding:14px;border-radius:8px;font-size:15px;font-weight:700">Accept meeting</a></td>'
      + '<td style="width:50%;padding-left:8px"><a href="' + declineUrl + '" style="display:block;background:#f0f0f0;color:#1a1a1a;text-decoration:none;text-align:center;padding:14px;border-radius:8px;font-size:15px;font-weight:600">Decline</a></td>'
      + '</tr></table>'
      + '<p style="font-size:11px;color:#aaa;margin-top:32px;text-align:center">Advisors Office Hours &middot; advisorsofficehours.com</p>'
      + '</body></html>';

    try {
      await sendEmail(env, advisor.email, 'New meeting request from ' + body.company, emailHtml);
    } catch(e) { console.error('Advisor email failed:', e); }

    // ── Confirmation email to startup ──────────────────────────────────────────
    const startupConfirmHtml = '<html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1a1a1a">'
      + '<div style="border-bottom:2px solid #1a1a1a;padding-bottom:14px;margin-bottom:22px"><span style="font-size:12px;font-weight:700;letter-spacing:.09em;text-transform:uppercase">Advisors Office Hours</span></div>'
      + '<p style="font-size:20px;font-weight:800;margin:0 0 8px">Request sent! ✅</p>'
      + '<p style="font-size:14px;color:#555;margin:0 0 24px">Hi <strong>' + body.startup_name + '</strong>, your request to meet with <strong>' + advisor.name + '</strong> was received. You\'ll get an email as soon as they respond, usually within a few days.</p>'
      + '<div style="background:#f0f7ff;border:1px solid #dbeafe;border-radius:8px;padding:18px 22px;margin-bottom:22px">'
      + '<p style="font-size:11px;font-weight:700;color:#3B82F6;text-transform:uppercase;letter-spacing:.08em;margin:0 0 10px">Advisor you requested</p>'
      + '<p style="font-size:15px;font-weight:700;margin:0 0 4px">' + advisor.name + '</p>'
      + (advisor.bio ? '<p style="font-size:13px;color:#555;margin:0 0 12px">' + advisor.bio + '</p>' : '')
      + (advisor.linkedin ? '<a href="' + advisor.linkedin + '" style="display:inline-flex;align-items:center;gap:6px;background:#0077B5;color:#fff;text-decoration:none;padding:8px 14px;border-radius:6px;font-size:13px;font-weight:600">🔗 ' + advisor.name + ' on LinkedIn</a>' : '')
      + '</div>'
      + '<div style="background:#fff8e1;border:1px solid #ffe082;border-radius:8px;padding:16px 20px;margin-bottom:24px">'
      + '<p style="font-size:13px;font-weight:700;color:#B45309;margin:0 0 4px">⏳ Waiting for a response</p>'
      + '<p style="font-size:13px;color:#666;margin:0">We\'ll notify you by email as soon as ' + advisor.name + ' accepts or declines. Please avoid sending multiple requests to the same advisor.</p>'
      + '</div>'
      + '<div style="background:#f6f6f6;border-radius:8px;padding:16px 20px;margin-bottom:24px">'
      + '<p style="font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.08em;margin:0 0 10px">Your request summary</p>'
      + '<table style="width:100%;border-collapse:collapse;font-size:13px">'
      + '<tr><td style="padding:4px 0;color:#666;width:110px">Company</td><td style="padding:4px 0;font-weight:600">' + body.company + '</td></tr>'
      + '<tr><td style="padding:4px 0;color:#666">Stage</td><td style="padding:4px 0">' + body.stage + '</td></tr>'
      + '<tr><td style="padding:4px 0;color:#666">ARR</td><td style="padding:4px 0">' + body.arr + '</td></tr>'
      + '</table>'
      + '</div>'
      + '<p style="font-size:11px;color:#aaa;margin-top:32px;text-align:center">Advisors Office Hours &middot; <a href="' + BASE_URL + '" style="color:#aaa">advisorsofficehours.com</a></p>'
      + '</body></html>';

    try {
      await sendEmail(env, body.startup_email, 'Your request to ' + advisor.name + ' has been sent ✅', startupConfirmHtml);
    } catch(e) { console.error('Startup confirm email failed:', e); }

    return jsonResponse({ ok: true });
  } catch(e) { return jsonResponse({ error: String(e) }, 500); }
}

async function getApprove(url, env) {
  const token = url.searchParams.get('t');
  if (!token) return Response.redirect(BASE_URL + '/approve?status=invalid', 302);
  try {
    const reqs = await sbGet(env, 'requests', '?token=eq.' + encodeURIComponent(token));
    if (!reqs || !reqs.length) return Response.redirect(BASE_URL + '/approve?status=notfound', 302);
    const r = reqs[0];
    if (r.status !== 'pending') return Response.redirect(BASE_URL + '/approve?status=already', 302);
    const advisors = await sbGet(env, 'advisors', '?id=eq.' + r.advisor_id);
    if (!advisors || !advisors.length) return Response.redirect(BASE_URL + '/approve?status=error', 302);
    const advisor = advisors[0];
    await sbPatch(env, 'requests', '?token=eq.' + encodeURIComponent(token), { status: 'approved', response_date: new Date().toISOString() });
    const recipients = [r.startup_email];
    if (advisor.email) recipients.push(advisor.email);
    const connHtml = '<html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1a1a1a">'
      + '<div style="border-bottom:2px solid #1a1a1a;padding-bottom:14px;margin-bottom:22px"><span style="font-size:12px;font-weight:700;letter-spacing:.09em;text-transform:uppercase">Advisors Office Hours</span></div>'
      + '<p style="font-size:22px;font-weight:800;margin:0 0 8px">You\'re connected! 🎉</p>'
      + '<p style="font-size:14px;color:#555;margin:0 0 28px"><strong>' + advisor.name + '</strong> has accepted the request from <strong>' + r.startup_name + '</strong> (<strong>' + r.company + '</strong>). Both of you are CC\'d on this email. Just hit <em>Reply All</em> to coordinate directly.</p>'

      + '<div style="background:#f0f7ff;border:1px solid #dbeafe;border-radius:8px;padding:18px 22px;margin-bottom:16px">'
      + '<p style="font-size:11px;font-weight:700;color:#3B82F6;text-transform:uppercase;letter-spacing:.08em;margin:0 0 10px">Advisor</p>'
      + '<p style="font-size:16px;font-weight:700;margin:0 0 4px">' + advisor.name + '</p>'
      + (advisor.bio ? '<p style="font-size:13px;color:#555;margin:0 0 12px">' + advisor.bio + '</p>' : '')
      + '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">'
      + (advisor.linkedin ? '<a href="' + advisor.linkedin + '" style="display:inline-flex;align-items:center;gap:6px;background:#0077B5;color:#fff;text-decoration:none;padding:8px 14px;border-radius:6px;font-size:13px;font-weight:600">🔗 LinkedIn</a>' : '')
      + (advisor.email ? '<a href="mailto:' + advisor.email + '" style="display:inline-flex;align-items:center;gap:6px;background:#1a1a1a;color:#fff;text-decoration:none;padding:8px 14px;border-radius:6px;font-size:13px;font-weight:600">✉️ ' + advisor.email + '</a>' : '')
      + '</div>'
      + '</div>'

      + '<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:18px 22px;margin-bottom:24px">'
      + '<p style="font-size:11px;font-weight:700;color:#10B981;text-transform:uppercase;letter-spacing:.08em;margin:0 0 10px">Startup</p>'
      + '<p style="font-size:16px;font-weight:700;margin:0 0 2px">' + r.startup_name + '</p>'
      + '<p style="font-size:13px;color:#555;margin:0 0 12px">' + r.company + ' &middot; ' + r.stage + ' &middot; ' + r.arr + '</p>'
      + '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">'
      + (r.linkedin ? '<a href="' + r.linkedin + '" style="display:inline-flex;align-items:center;gap:6px;background:#0077B5;color:#fff;text-decoration:none;padding:8px 14px;border-radius:6px;font-size:13px;font-weight:600">🔗 LinkedIn</a>' : '')
      + '<a href="mailto:' + r.startup_email + '" style="display:inline-flex;align-items:center;gap:6px;background:#1a1a1a;color:#fff;text-decoration:none;padding:8px 14px;border-radius:6px;font-size:13px;font-weight:600">✉️ ' + r.startup_email + '</a>'
      + '</div>'
      + '</div>'

      + '<div style="background:#f9f9f9;border-radius:8px;padding:16px 20px;margin-bottom:24px">'
      + '<p style="font-size:12px;font-weight:700;color:#666;text-transform:uppercase;letter-spacing:.06em;margin:0 0 6px">Session topic</p>'
      + '<p style="font-size:14px;margin:0;color:#333">' + r.help_needed + '</p>'
      + '</div>'

      + '<p style="font-size:11px;color:#aaa;margin-top:32px;text-align:center">Advisors Office Hours &middot; <a href="' + BASE_URL + '" style="color:#aaa">advisorsofficehours.com</a></p>'
      + '</body></html>';
    try { await sendEmail(env, recipients, '🎉 You\'re connected! ' + r.startup_name + ' & ' + advisor.name, connHtml); } catch(e) {}
    return Response.redirect(BASE_URL + '/approve?status=success&advisor=' + encodeURIComponent(advisor.name), 302);
  } catch(e) { return Response.redirect(BASE_URL + '/approve?status=error', 302); }
}

async function getDecline(url, env) {
  const token = url.searchParams.get('t');
  if (!token) return Response.redirect(BASE_URL + '/decline?status=invalid', 302);
  try {
    const reqs = await sbGet(env, 'requests', '?token=eq.' + encodeURIComponent(token));
    if (!reqs || !reqs.length) return Response.redirect(BASE_URL + '/decline?status=notfound', 302);
    const r = reqs[0];
    if (r.status !== 'pending') return Response.redirect(BASE_URL + '/decline?status=already', 302);
    await sbPatch(env, 'requests', '?token=eq.' + encodeURIComponent(token), { status: 'declined', response_date: new Date().toISOString() });
    const declineHtml = '<html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1a1a1a">'
      + '<div style="border-bottom:2px solid #1a1a1a;padding-bottom:14px;margin-bottom:22px"><span style="font-size:12px;font-weight:700;letter-spacing:.09em;text-transform:uppercase">Advisors Office Hours</span></div>'
      + '<p style="font-size:18px;font-weight:700;margin:0 0 12px">Update on your request</p>'
      + '<p style="font-size:14px;color:#555;margin:0 0 24px">Hi <strong>' + r.startup_name + '</strong>, unfortunately <strong>' + r.advisor_name + '</strong> is not able to take new meetings at this time. No worries - there are plenty of other great advisors who can help.</p>'
      + '<div style="text-align:center;margin:28px 0">'
      + '<a href="' + BASE_URL + '" style="display:inline-block;background:#1a1a1a;color:#fff;padding:14px 32px;text-decoration:none;border-radius:8px;font-size:14px;font-weight:700">Browse other advisors →</a>'
      + '</div>'
      + '<p style="font-size:11px;color:#aaa;margin-top:32px;text-align:center">Advisors Office Hours &middot; <a href="' + BASE_URL + '" style="color:#aaa">advisorsofficehours.com</a></p>'
      + '</body></html>';
    try { await sendEmail(env, r.startup_email, 'Update on your request to ' + r.advisor_name, declineHtml); } catch(e) {}
    return Response.redirect(BASE_URL + '/decline?status=success', 302);
  } catch(e) { return Response.redirect(BASE_URL + '/decline?status=error', 302); }
}

async function postSendOtp(req, env) {
  try {
    const body = await req.json();
    const email = body.email;
    if (!email) return jsonResponse({ error: 'Email required' }, 400);
    const normalEmail = email.trim().toLowerCase();
    // Only allow admins and advisors already added by admin
    const adminEmails = (env.ADMIN_EMAILS || '').split(',').map(function(e) { return e.trim().toLowerCase(); });
    const isAdmin = adminEmails.includes(normalEmail);
    if (!isAdmin) {
      const advisors = await sbGet(env, 'advisors', '?email=ilike.' + encodeURIComponent(normalEmail) + '&select=id&active=eq.true');
      if (!advisors || !advisors.length) {
        return jsonResponse({ error: 'This email is not registered on the platform. Only invited advisors can sign in. To join, contact Pe\'era Feldman at peerafeldman@gmail.com' }, 403);
      }
    }
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expires = new Date(Date.now() + 10 * 60 * 1000);
    await sbPost(env, 'otp_codes', { email: normalEmail, code: code, expires_at: expires.toISOString(), used: false });
    const otpHtml = '<html><body style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">'
      + '<h3>Advisors Office Hours</h3>'
      + '<p>Your sign-in code:</p>'
      + '<div style="background:#f6f6f6;border-radius:10px;padding:28px;text-align:center;margin:24px 0">'
      + '<span style="font-size:40px;font-weight:700;letter-spacing:.15em">' + code + '</span></div>'
      + '<p style="color:#666;font-size:14px">Valid for 10 minutes.</p>'
      + '</body></html>';
    await sendEmail(env, normalEmail, 'Your sign-in code - Advisors Office Hours', otpHtml);
    return jsonResponse({ ok: true });
  } catch(e) { return jsonResponse({ error: 'Failed to send code' }, 500); }
}

async function postVerifyOtp(req, env) {
  try {
    const body = await req.json();
    const email = body.email;
    const code = body.code;
    if (!email || !code) return jsonResponse({ error: 'Email and code required' }, 400);
    const normalEmail = email.trim().toLowerCase();
    const now = new Date().toISOString();
    const otps = await sbGet(env, 'otp_codes',
      '?email=eq.' + encodeURIComponent(normalEmail) + '&code=eq.' + code + '&used=eq.false&expires_at=gte.' + now + '&order=created_at.desc&limit=1'
    );
    if (!otps || !otps.length) return jsonResponse({ error: 'Invalid or expired code' }, 401);
    await sbPatch(env, 'otp_codes', '?id=eq.' + otps[0].id, { used: true });
    const adminEmails = (env.ADMIN_EMAILS || '').split(',').map(function(e) { return e.trim().toLowerCase(); });
    const isAdminUser = adminEmails.includes(normalEmail);
    let advisorId = null;
    const advisors = await sbGet(env, 'advisors', '?email=ilike.' + encodeURIComponent(normalEmail) + '&select=id');
    advisorId = (advisors && advisors.length) ? advisors[0].id : null;
    if (!isAdminUser && !advisorId) {
      return jsonResponse({ error: 'No advisor profile found for this email. Contact Pe\'era Feldman at peerafeldman@gmail.com to be added.' }, 403);
    }
    return jsonResponse({ ok: true, role: isAdminUser ? 'admin' : 'advisor', email: normalEmail, advisorId: advisorId });
  } catch(e) { return jsonResponse({ error: 'Verification failed' }, 500); }
}

async function postAdvisorProfile(req, env) {
  // Self-registration is disabled — advisors are added by admin only
  return jsonResponse({ error: 'Self-registration is not allowed. Contact an admin to be added.' }, 403);
}

async function putAdvisorProfile(req, env) {
  try {
    const body = await req.json();
    const advisorId = body.advisorId;
    const email = body.email;
    const updates = body.updates;
    if (!advisorId || !email) return jsonResponse({ error: 'Unauthorized' }, 401);
    const advisors = await sbGet(env, 'advisors', '?id=eq.' + advisorId + '&email=ilike.' + encodeURIComponent(email.trim().toLowerCase()));
    if (!advisors || !advisors.length) return jsonResponse({ error: 'Unauthorized' }, 401);
    const allowed = {};
    const allowedFields = ['bio', 'expertise', 'stages', 'verticals', 'linkedin', 'available'];
    allowedFields.forEach(function(f) { if (f in updates) allowed[f] = updates[f]; });
    const result = await sbPatch(env, 'advisors', '?id=eq.' + advisorId, allowed);
    return jsonResponse(Array.isArray(result) ? result[0] : result);
  } catch(e) { return jsonResponse({ error: String(e) }, 500); }
}

async function postAdvisorPhoto(req, env) {
  try {
    const form = await req.formData();
    const file = form.get('photo');
    const advisorId = form.get('advisorId');
    const email = form.get('email');
    if (!file || !advisorId || !email) return jsonResponse({ error: 'Missing required fields' }, 400);
    const advisors = await sbGet(env, 'advisors', '?id=eq.' + advisorId + '&email=ilike.' + encodeURIComponent(email.trim().toLowerCase()));
    if (!advisors || !advisors.length) return jsonResponse({ error: 'Unauthorized' }, 401);
    const nameParts = (file.name || 'photo.jpg').split('.');
    const ext = nameParts[nameParts.length - 1].toLowerCase() || 'jpg';
    const path = 'advisors/' + advisorId + '.' + ext;
    const photoUrl = await sbStorageUpload(env, 'photos', path, file);
    // Add cache-buster so browsers don't serve stale images after re-upload
    var finalUrl = photoUrl.split('?')[0] + '?v=' + Date.now();
    const result = await sbPatch(env, 'advisors', '?id=eq.' + advisorId, { photo_url: finalUrl });
    return jsonResponse({ photo_url: finalUrl, advisor: Array.isArray(result) ? result[0] : result });
  } catch(e) { return jsonResponse({ error: String(e) }, 500); }
}

async function handleAdminPhoto(req, env) {
  if (!isAdminEmail(req.headers.get('x-admin-email'), env)) return jsonResponse({ error: 'Unauthorized' }, 401);
  try {
    const form = await req.formData();
    const file = form.get('photo');
    const advisorId = form.get('advisorId');
    if (!file || !advisorId) return jsonResponse({ error: 'Missing required fields' }, 400);
    const nameParts = (file.name || 'photo.jpg').split('.');
    const ext = nameParts[nameParts.length - 1].toLowerCase() || 'jpg';
    const path = 'advisors/' + advisorId + '.' + ext;
    const photoUrl = await sbStorageUpload(env, 'photos', path, file);
    // Add cache-buster so browsers don't serve stale images after re-upload
    var finalUrl = photoUrl.split('?')[0] + '?v=' + Date.now();
    const result = await sbPatch(env, 'advisors', '?id=eq.' + advisorId, { photo_url: finalUrl });
    return jsonResponse({ photo_url: finalUrl, advisor: Array.isArray(result) ? result[0] : result });
  } catch(e) { return jsonResponse({ error: String(e) }, 500); }
}

async function handleAdminAdvisors(req, env) {
  if (!isAdminEmail(req.headers.get('x-admin-email'), env)) return jsonResponse({ error: 'Unauthorized' }, 401);
  const method = req.method;
  try {
    if (method === 'GET') return jsonResponse(await sbGet(env, 'advisors', '?order=name'));
    if (method === 'POST') {
      const body = await req.json();
      delete body.id; // Let Supabase generate UUID via uuid_generate_v4() default
      if (body.active === undefined) body.active = true;
      var created = await sbPost(env, 'advisors', body);
      // sbPost returns an array with Prefer:return=representation — unwrap it
      return jsonResponse(Array.isArray(created) ? created[0] : created, 201);
    }
    if (method === 'PUT') {
      const body = await req.json();
      const id = body.id;
      if (!id) return jsonResponse({ error: 'ID required' }, 400);
      const updates = Object.assign({}, body);
      delete updates.id;
      const result = await sbPatch(env, 'advisors', '?id=eq.' + id, updates);
      return jsonResponse(Array.isArray(result) ? result[0] : result);
    }
    if (method === 'DELETE') {
      const body = await req.json();
      if (!body.id) return jsonResponse({ error: 'ID required' }, 400);
      await sbPatch(env, 'advisors', '?id=eq.' + body.id, { active: false });
      return jsonResponse({ ok: true });
    }
  } catch(e) { return jsonResponse({ error: String(e) }, 500); }
  return jsonResponse({ error: 'Method not allowed' }, 405);
}

async function handleAdminRequests(req, env) {
  if (!isAdminEmail(req.headers.get('x-admin-email'), env)) return jsonResponse({ error: 'Unauthorized' }, 401);
  try { return jsonResponse(await sbGet(env, 'requests', '?order=created_at.desc')); }
  catch(e) { return jsonResponse({ error: String(e) }, 500); }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const p = url.pathname;
    const m = request.method;

    if (m === 'OPTIONS') return new Response(null, { headers: corsHeaders() });

if (p === '/api/advisors' && m === 'GET') return getAdvisors(env);
    if (p === '/api/request' && m === 'POST') return postRequest(request, env);
    if (p === '/api/approve' && m === 'GET') return getApprove(url, env);
    if (p === '/api/decline' && m === 'GET') return getDecline(url, env);
    if (p === '/api/auth/send-otp' && m === 'POST') return postSendOtp(request, env);
    if (p === '/api/auth/verify-otp' && m === 'POST') return postVerifyOtp(request, env);
    if (p === '/api/advisor/profile' && m === 'POST') return postAdvisorProfile(request, env);
    if (p === '/api/advisor/profile' && m === 'PUT') return putAdvisorProfile(request, env);
    if (p === '/api/advisor/photo' && m === 'POST') return postAdvisorPhoto(request, env);
    if (p === '/api/admin/advisors') return handleAdminAdvisors(request, env);
    if (p === '/api/admin/photo' && m === 'POST') return handleAdminPhoto(request, env);
    if (p === '/api/admin/requests' && m === 'GET') return handleAdminRequests(request, env);

    return env.ASSETS.fetch(request);
  },
};
