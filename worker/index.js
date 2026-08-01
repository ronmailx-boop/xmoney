// xmoney - שרת אימות זעיר (Cloudflare Worker) לשמירת Refresh Token של Google בבטחון,
// כדי שהאפליקציה הסטטית (GitHub Pages) תוכל להישאר "מחוברת" עד התנתקות מפורשת,
// בלי לחשוף אף פעם סוד (Client Secret / Refresh Token) לדפדפן.
//
// דורש: KV namespace בשם SESSIONS, ו-2 secrets: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET.

const APP_ORIGIN = 'https://ronmailx-boop.github.io';
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': APP_ORIGIN,
    'Access-Control-Allow-Headers': 'X-Device-Token, Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };
}

function jsonResponse(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: Object.assign({ 'Content-Type': 'application/json' }, corsHeaders())
  });
}

function randomToken() {
  return crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
}

async function handleCallback(url, env) {
  const code = url.searchParams.get('code');
  const errorParam = url.searchParams.get('error');
  const returnTo = decodeURIComponent(url.searchParams.get('state') || APP_ORIGIN + '/');

  if (errorParam || !code) {
    return Response.redirect(returnTo + (returnTo.indexOf('?') === -1 ? '?' : '&') + 'auth_error=1', 302);
  }

  const redirectUri = url.origin + '/auth/callback';
  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code: code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    })
  });
  const tokens = await tokenRes.json();

  if (!tokens.refresh_token) {
    return Response.redirect(returnTo + (returnTo.indexOf('?') === -1 ? '?' : '&') + 'auth_error=1', 302);
  }

  const deviceToken = randomToken();
  await env.SESSIONS.put('session:' + deviceToken, JSON.stringify({ refresh_token: tokens.refresh_token }));

  const redirectBack = new URL(returnTo);
  redirectBack.searchParams.set('auth_token', deviceToken);
  return Response.redirect(redirectBack.toString(), 302);
}

async function handleToken(request, env) {
  const deviceToken = request.headers.get('X-Device-Token');
  if (!deviceToken) return jsonResponse({ error: 'missing_device_token' }, 401);

  const raw = await env.SESSIONS.get('session:' + deviceToken);
  if (!raw) return jsonResponse({ error: 'invalid_session' }, 401);

  let session;
  try {
    session = JSON.parse(raw);
  } catch (e) {
    return jsonResponse({ error: 'corrupt_session' }, 401);
  }

  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: session.refresh_token,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      grant_type: 'refresh_token'
    })
  });
  const tokens = await tokenRes.json();

  if (!tokens.access_token) {
    // ה-refresh token כנראה בוטל (למשל המשתמש שלל הרשאות ידנית ב-Google) - מנקים את ה-session
    await env.SESSIONS.delete('session:' + deviceToken);
    return jsonResponse({ error: 'refresh_failed' }, 401);
  }

  return jsonResponse({ access_token: tokens.access_token, expires_in: tokens.expires_in });
}

async function handleLogout(request, env) {
  const deviceToken = request.headers.get('X-Device-Token');
  if (deviceToken) {
    await env.SESSIONS.delete('session:' + deviceToken);
  }
  return jsonResponse({ ok: true });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }

    if (url.pathname === '/auth/start') {
      const returnTo = url.searchParams.get('returnTo') || APP_ORIGIN + '/';
      const redirectUri = url.origin + '/auth/callback';
      const params = new URLSearchParams({
        client_id: env.GOOGLE_CLIENT_ID,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: DRIVE_SCOPE,
        access_type: 'offline',
        prompt: 'consent',
        state: encodeURIComponent(returnTo)
      });
      return Response.redirect(GOOGLE_AUTH_URL + '?' + params.toString(), 302);
    }

    if (url.pathname === '/auth/callback') {
      return handleCallback(url, env);
    }

    if (url.pathname === '/auth/token') {
      return handleToken(request, env);
    }

    if (url.pathname === '/auth/logout') {
      return handleLogout(request, env);
    }

    return new Response('Not found', { status: 404 });
  }
};
