const http = require('http');
const https = require('https');
const fs = require('fs');
const { URL } = require('url');
const { randomUUID } = require('crypto');
const {
  createJwt,
  verifyJwt,
  verifyPassword,
  DEFAULT_ACCESS_TTL_SECONDS,
  DEFAULT_REFRESH_TTL_SECONDS
} = require('./security');
const {
  users,
  paths,
  courses,
  lessons,
  assignments,
  quizzes,
  progress,
  submissions,
  threads,
  comments,
  pseudocodeDrafts,
  cheatsheets,
  anatomyEntries,
  microVideos,
  createSubmission,
  updateSubmissionResult,
  upsertProgress,
  createThread,
  addComment,
  savePseudocodeDraft,
  searchCheatsheets,
  findCheatsheetBySlug,
  findAnatomyEntry,
  listAnatomyEntries,
  listMicroVideos,
  listCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  listInvoices,
  listCertificates,
  toggleFeatureFlag,
  listFeatureFlags,
  listReviewQueue,
  claimReview,
  completeReview,
  listSupportTickets,
  listPromotions,
  getDashboardForUser,
  getUserByEmail,
  getUserById,
  markUserLogin,
  getGamificationState,
  awardAchievement,
  incrementStreak,
  resetStreak,
  changeUserSubscription,
  createUserAccount,
  subscriptionPlans,
  recordEvent,
  listEvents,
  appendAuditEvent,
  listAuditEvents,
  registerPrivacyRequest,
  listPrivacyRequests,
  updatePrivacyRequestStatus,
  getCalendarFeedToken,
  rotateCalendarFeedToken,
  findUserIdByCalendarToken,
  resetRuntimeData,
  registerLtiRegistration,
  listLtiRegistrations,
  recordLtiLaunch,
  listLtiLaunches,
  storeScormPackage,
  listScormPackages,
  registerSsoProvider,
  listSsoProviders,
  upsertScimUser,
  listScimDirectory,
  deactivateScimUser,
  deleteScimUser,
  registerAffiliatePartner,
  recordAffiliateClick,
  recordAffiliateConversion,
  settleAffiliatePayout,
  listAffiliatePartners,
  listAffiliatePayouts,
  storeAiHintSession,
  listAiHintSessions,
  apiCatalog,
  storeRefreshTokenRecord,
  getRefreshTokenRecord,
  deleteRefreshTokenRecord,
  markRefreshTokenRevoked,
  isRefreshTokenRevoked,
  pruneExpiredRefreshTokenRecords,
  clearRefreshTokenState,
  createPromotion,
  updatePromotion,
  transitionPromotionStatus
} = require('./data');
const {
  trackHttpRequest,
  recordError,
  renderPrometheusMetrics,
  getHealthSnapshot
} = require('./observability');

const PORT = parseInt(process.env.PORT || '4000', 10);
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:4173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'development-access-secret';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'development-refresh-secret';
const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10);
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX || '120', 10);
const MAX_BODY_BYTES = parseInt(process.env.MAX_BODY_BYTES || `${1024 * 512}`, 10);
const TLS_KEY_PATH = process.env.SSL_KEY_PATH || null;
const TLS_CERT_PATH = process.env.SSL_CERT_PATH || null;
const TLS_CA_PATH = process.env.SSL_CA_PATH || null;
const DEVICE_ID_REQUIRED = process.env.DEVICE_ID_REQUIRED !== 'false';
const DEVICE_ID_HEADER = (process.env.DEVICE_ID_HEADER || 'x-device-id').toLowerCase();
const ICS_PROD_ID = '//learnzo.io//planner//NL';
const SUBSCRIPTION_STATUS_OPTIONS = new Set(['active', 'paused', 'canceled']);
const SUBSCRIPTION_PLAN_KEYS = Object.keys(subscriptionPlans);

const rateLimiter = new Map();

function resolveOrigin(res) {
  const req = res.locals?.req;
  const originHeader = req?.headers?.origin;
  if (!originHeader) {
    return null;
  }
  if (ALLOWED_ORIGINS.includes('*')) {
    return originHeader;
  }
  return ALLOWED_ORIGINS.includes(originHeader) ? originHeader : null;
}

function buildSecurityHeaders(origin) {
  const headers = {
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
    'X-DNS-Prefetch-Control': 'off',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-site',
    'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self';",
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Max-Age': '600'
  };
  if (origin) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Credentials'] = 'true';
    headers['Vary'] = 'Origin';
  }
  return headers;
}

function sendJSON(res, statusCode, payload, options = {}) {
  const body = JSON.stringify(payload);
  const origin = resolveOrigin(res);
  const headers = {
    ...buildSecurityHeaders(origin),
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body)
  };
  if (res.locals?.requestId) {
    headers['X-Request-ID'] = res.locals.requestId;
  }
  if (options.cookies && options.cookies.length > 0) {
    headers['Set-Cookie'] = options.cookies;
  }
  if (options.headers) {
    Object.entries(options.headers).forEach(([key, value]) => {
      headers[key] = value;
    });
  }
  res.writeHead(statusCode, headers);
  res.end(body);
}

function sendText(res, statusCode, body, contentType = 'text/plain; charset=utf-8', options = {}) {
  const origin = resolveOrigin(res);
  const headers = {
    ...buildSecurityHeaders(origin),
    'Content-Type': contentType,
    'Content-Length': Buffer.byteLength(body)
  };
  if (res.locals?.requestId) {
    headers['X-Request-ID'] = res.locals.requestId;
  }
  if (options.headers) {
    Object.entries(options.headers).forEach(([key, value]) => {
      headers[key] = value;
    });
  }
  res.writeHead(statusCode, headers);
  res.end(body);
}

function sendNoContent(res, options = {}) {
  const origin = resolveOrigin(res);
  const headers = buildSecurityHeaders(origin);
  if (res.locals?.requestId) {
    headers['X-Request-ID'] = res.locals.requestId;
  }
  if (options.cookies && options.cookies.length > 0) {
    headers['Set-Cookie'] = options.cookies;
  }
  if (options.headers) {
    Object.entries(options.headers).forEach(([key, value]) => {
      headers[key] = value;
    });
  }
  res.writeHead(204, headers);
  res.end();
}

function notFound(res, message = 'Not found') {
  sendJSON(res, 404, { error: message });
}

function methodNotAllowed(res) {
  sendJSON(res, 405, { error: 'Method not allowed' });
}

function unauthorized(res, message = 'Authentication required') {
  sendJSON(
    res,
    401,
    { error: message },
    {
      headers: {
        'WWW-Authenticate': 'Bearer realm="LearnZo API", error="invalid_token"'
      }
    }
  );
}

function badRequest(res, message) {
  sendJSON(res, 400, { error: message || 'Bad request' });
}

function forbidden(res) {
  sendJSON(
    res,
    403,
    { error: 'Forbidden' },
    {
      headers: {
        'WWW-Authenticate': 'Bearer realm="LearnZo API", error="insufficient_scope"'
      }
    }
  );
}

function paymentRequired(res) {
  sendJSON(
    res,
    402,
    { error: 'Actieve abonnementsstatus vereist' },
    {
      headers: {
        'WWW-Authenticate': 'Bearer realm="LearnZo API", error="subscription_required"'
      }
    }
  );
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let totalLength = 0;
    req.on('data', (chunk) => {
      totalLength += chunk.length;
      if (totalLength > MAX_BODY_BYTES) {
        reject(new Error('PAYLOAD_TOO_LARGE'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (chunks.length === 0) {
        resolve(null);
        return;
      }
      const buffer = Buffer.concat(chunks).toString('utf8');
      try {
        const parsed = JSON.parse(buffer || '{}');
        resolve(parsed);
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

async function readJsonBody(req, res) {
  try {
    const parsed = await parseBody(req);
    return { ok: true, value: parsed };
  } catch (error) {
    if (error && error.message === 'PAYLOAD_TOO_LARGE') {
      sendJSON(res, 413, { error: 'Payload te groot' });
    } else {
      sendJSON(res, 400, { error: 'Ongeldige JSON payload' });
    }
    return { ok: false };
  }
}

function isValidEmail(email) {
  if (!email || typeof email !== 'string') {
    return false;
  }
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim().toLowerCase());
}

function validatePasswordStrength(password) {
  if (!password || typeof password !== 'string') {
    return false;
  }
  const hasLength = password.length >= 8;
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  return hasLength && hasLower && hasUpper && hasNumber;
}

function getLessonBySlug(slug) {
  return Object.values(lessons).find((lesson) => lesson.slug === slug) || null;
}

function applyAuth(req) {
  const header = req.headers['authorization'] || '';
  if (!header.toLowerCase().startsWith('bearer ')) {
    return null;
  }
  const token = header.slice(7).trim();
  const payload = verifyJwt(token, ACCESS_TOKEN_SECRET);
  if (!payload || (payload.type && payload.type !== 'access')) {
    return null;
  }
  const user = getUserById(payload.sub);
  if (!user) {
    return null;
  }
  return { token, payload, user };
}

function ensureAuth(req, res, options = {}) {
  const context = applyAuth(req);
  if (!context) {
    unauthorized(res);
    return null;
  }
  const userRecord = context.user;
  const role = context.payload.role || userRecord.role;
  if (options.roles && !options.roles.includes(role)) {
    forbidden(res);
    return null;
  }
  if (options.requireActiveSubscription) {
    const status = userRecord.subscription?.status || 'inactive';
    if (status !== 'active') {
      paymentRequired(res);
      return null;
    }
  }
  if (options.plans && options.plans.length > 0) {
    const plan = userRecord.subscription?.plan || null;
    if (!plan || !options.plans.includes(plan)) {
      forbidden(res);
      return null;
    }
  }
  req.auth = context;
  return toPublicUser(userRecord);
}

function formatThread(thread) {
  const author = toPublicUser(users.find((user) => user.id === thread.authorId) || null);
  const threadComments = thread.commentIds
    .map((commentId) => comments.find((item) => item.id === commentId))
    .filter(Boolean)
    .map((comment) => ({
      ...comment,
      author: toPublicUser(users.find((user) => user.id === comment.authorId) || null)
    }));
  return {
    ...thread,
    author,
    comments: threadComments
  };
}

function generatePseudocode(code) {
  if (!code || typeof code !== 'string') {
    return ['Geen code gevonden — beschrijf in 5 stappen wat je probeert te doen.'];
  }
  const cleaned = code
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('//'));
  if (cleaned.length === 0) {
    return ['Geen betekenisvolle code gevonden — beschrijf de belangrijkste stappen.'];
  }
  const steps = [];
  let stepCounter = 1;
  for (const line of cleaned) {
    if (/function\s+([a-zA-Z0-9_]+)/.test(line)) {
      const [, name] = line.match(/function\s+([a-zA-Z0-9_]+)/) || [];
      steps.push(`${stepCounter++}. Definieer functie ${name || ''}`.trim());
      continue;
    }
    if (/const\s|let\s|var\s/.test(line)) {
      const [, variable] = line.match(/(?:const|let|var)\s+([a-zA-Z0-9_]+)/) || [];
      steps.push(`${stepCounter++}. Maak variabele ${variable || ''}`.trim());
      continue;
    }
    if (/return\s+/.test(line)) {
      steps.push(`${stepCounter++}. Geef resultaat terug (${line.replace('return', '').trim()})`);
      continue;
    }
    if (/if\s*\(/.test(line)) {
      steps.push(`${stepCounter++}. Controleer conditie ${line.match(/if\s*\((.*)\)/)?.[1] || ''}`.trim());
      continue;
    }
    if (/for\s*\(/.test(line)) {
      steps.push(`${stepCounter++}. Herhaal met lus ${line.match(/for\s*\((.*)\)/)?.[1] || ''}`.trim());
      continue;
    }
    if (/while\s*\(/.test(line)) {
      steps.push(`${stepCounter++}. Herhaal zolang ${line.match(/while\s*\((.*)\)/)?.[1] || ''}`.trim());
      continue;
    }
    steps.push(`${stepCounter++}. Voer stap uit: ${line}`);
  }
  return steps.slice(0, 12);
}

function toPublicUser(user) {
  if (!user) return null;
  const { auth, ...rest } = user;
  return { ...rest };
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || 'unknown';
}

function checkRateLimit(req, res) {
  const identifier = `${getClientIp(req)}:${req.headers['authorization'] ? 'auth' : 'anon'}`;
  const now = Date.now();
  const entry = rateLimiter.get(identifier) || { count: 0, windowStart: now };
  if (now - entry.windowStart >= RATE_LIMIT_WINDOW_MS) {
    entry.count = 0;
    entry.windowStart = now;
  }
  entry.count += 1;
  rateLimiter.set(identifier, entry);
  if (entry.count > RATE_LIMIT_MAX) {
    sendJSON(res, 429, { error: 'Te veel verzoeken. Probeer het later opnieuw.' });
    return true;
  }
  return false;
}

function logAudit(event, req, meta = {}) {
  appendAuditEvent({
    event,
    actor: req.auth?.payload?.sub || null,
    ip: getClientIp(req),
    userAgent: req.headers['user-agent'] || 'unknown',
    details: meta
  });
}

function parseCookies(req) {
  const header = req.headers['cookie'];
  if (!header) return {};
  return header.split(';').reduce((acc, part) => {
    const [key, ...rest] = part.trim().split('=');
    if (!key) return acc;
    acc[key] = decodeURIComponent(rest.join('='));
    return acc;
  }, {});
}

function extractDeviceId(req, provided) {
  if (typeof provided === 'string' && provided.trim().length > 0) {
    return provided.trim();
  }
  const headerValue = req.headers[DEVICE_ID_HEADER];
  if (typeof headerValue === 'string') {
    return headerValue.trim();
  }
  if (Array.isArray(headerValue) && headerValue.length > 0) {
    return String(headerValue[0]).trim();
  }
  return null;
}

function createCookie(name, value, options = {}) {
  const encodedValue = value === undefined || value === null ? '' : encodeURIComponent(value);
  const parts = [`${name}=${encodedValue}`];
  if (options.maxAge !== undefined) {
    parts.push(`Max-Age=${options.maxAge}`);
  }
  if (options.path) {
    parts.push(`Path=${options.path}`);
  }
  if (options.domain) {
    parts.push(`Domain=${options.domain}`);
  }
  if (options.secure !== false) {
    parts.push('Secure');
  }
  if (options.httpOnly !== false) {
    parts.push('HttpOnly');
  }
  parts.push(`SameSite=${options.sameSite || 'Strict'}`);
  return parts.join('; ');
}

function formatIcsDate(input) {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  const pad = (value, length = 2) => String(value).padStart(length, '0');
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;
}

function buildCalendarFeed(userId) {
  const user = getUserById(userId);
  if (!user) {
    return 'BEGIN:VCALENDAR\r\nEND:VCALENDAR';
  }
  const events = listCalendarEvents(userId);
  const lines = [
    'BEGIN:VCALENDAR',
    'PRODID:' + ICS_PROD_ID,
    'VERSION:2.0',
    'CALSCALE:GREGORIAN',
    `X-WR-CALNAME:LearnZo planning (${user.name})`,
    'METHOD:PUBLISH'
  ];
  events.forEach((event) => {
    const start = formatIcsDate(event.start);
    const end = formatIcsDate(event.end || event.start);
    if (!start || !end) {
      return;
    }
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${event.id}@learnzo.io`);
    lines.push(`DTSTAMP:${formatIcsDate(new Date().toISOString())}`);
    lines.push(`DTSTART:${start}`);
    lines.push(`DTEND:${end}`);
    lines.push(`SUMMARY:${event.title}`);
    lines.push(`CATEGORIES:${event.type}`);
    lines.push('END:VEVENT');
  });
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

function issueTokens(req, user, deviceId) {
  const sessionId = randomUUID();
  const accessToken = createJwt(
    {
      sub: user.id,
      role: user.role,
      plan: user.subscription?.plan || null,
      type: 'access'
    },
    ACCESS_TOKEN_SECRET,
    { expiresInSeconds: DEFAULT_ACCESS_TTL_SECONDS }
  );
  const refreshToken = createJwt(
    {
      sub: user.id,
      sid: sessionId,
      type: 'refresh',
      device: deviceId || null
    },
    REFRESH_TOKEN_SECRET,
    { expiresInSeconds: DEFAULT_REFRESH_TTL_SECONDS }
  );
  const now = Date.now();
  storeRefreshTokenRecord(refreshToken, {
    userId: user.id,
    sessionId,
    deviceId: deviceId || null,
    createdAt: now,
    expiresAt: now + DEFAULT_REFRESH_TTL_SECONDS * 1000,
    userAgent: req.headers['user-agent'] || 'unknown',
    ip: getClientIp(req)
  });
  return { accessToken, refreshToken };
}

function revokeRefreshToken(token) {
  if (!token) return;
  deleteRefreshTokenRecord(token);
  markRefreshTokenRevoked(token);
}

function pruneExpiredRefreshTokens() {
  pruneExpiredRefreshTokenRecords(Date.now());
}

const requestHandler = async (req, res) => {
  const method = (req.method || 'GET').toUpperCase();
  res.locals = { req };
  res.locals.requestId = req.headers['x-request-id'] || randomUUID();
  res.locals.metricsRoute = 'unmatched';
  req.auth = null;
  pruneExpiredRefreshTokens();
  if (checkRateLimit(req, res)) {
    return;
  }

  let pathname = req.url || '/';
  const startedAt = process.hrtime.bigint();
  res.on('finish', () => {
    try {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
      const role = req.auth?.user?.role || req.auth?.payload?.role || 'anonymous';
      trackHttpRequest({
        method,
        route: res.locals.metricsRoute || pathname || '/unknown',
        status: res.statusCode || 200,
        durationMs,
        role
      });
    } catch (error) {
      recordError(error, { stage: 'metrics.finish', route: res.locals.metricsRoute || pathname });
    }
  });
  res.on('error', (error) => {
    recordError(error, { stage: 'response.error', url: req.url });
  });

  if (req.method === 'OPTIONS') {
    sendNoContent(res);
    return;
  }

  const host = req.headers.host || 'localhost';
  const url = new URL(req.url, `http://${host}`);
  pathname = url.pathname;
  res.locals.metricsRoute = pathname;

  if (pathname === '/healthz' && method === 'GET') {
    const snapshot = getHealthSnapshot();
    sendJSON(res, 200, snapshot);
    return;
  }

  if (pathname === '/readyz' && method === 'GET') {
    const snapshot = getHealthSnapshot();
    sendJSON(res, 200, { status: 'ready', uptimeSeconds: snapshot.uptimeSeconds });
    return;
  }

  if (pathname === '/metrics' && method === 'GET') {
    const metrics = renderPrometheusMetrics();
    sendText(res, 200, metrics, 'text/plain; version=0.0.4');
    return;
  }

  try {
      if (pathname === '/meta/endpoints' && method === 'GET') {
        res.locals.metricsRoute = '/meta/endpoints';
        sendJSON(res, 200, {
          updatedAt: new Date().toISOString(),
          endpoints: apiCatalog
        });
        return;
      }

      if (pathname === '/calendar/feed.ics') {
        if (method !== 'GET') return methodNotAllowed(res);
        const token = url.searchParams.get('token');
        if (!token) {
          return unauthorized(res, 'Token vereist');
        }
        const userId = findUserIdByCalendarToken(token);
        if (!userId) {
          return unauthorized(res);
        }
        const icsBody = buildCalendarFeed(userId);
        sendText(res, 200, icsBody, 'text/calendar; charset=utf-8', {
          headers: {
            'Content-Disposition': 'attachment; filename="learnzo-planning.ics"'
          }
        });
        return;
      }

      if (pathname === '/calendar/feed-token') {
        if (method === 'GET') {
          const user = ensureAuth(req, res);
          if (!user) return;
          const token = getCalendarFeedToken(user.id);
          sendJSON(res, 200, { token: token.token, rotatedAt: token.rotatedAt });
          return;
        }
        if (method === 'POST') {
          const user = ensureAuth(req, res);
          if (!user) return;
          const rotated = rotateCalendarFeedToken(user.id);
          logAudit('calendar.feed.rotate', req, { userId: user.id, tokenRotatedAt: rotated.rotatedAt });
          recordEvent({
            userId: user.id,
            type: 'calendar.token.rotate',
            metadata: { rotatedAt: rotated.rotatedAt }
          });
          sendJSON(res, 200, { token: rotated.token, rotatedAt: rotated.rotatedAt });
          return;
        }
        return methodNotAllowed(res);
      }

      if (pathname === '/auth/register') {
        if (method !== 'POST') return methodNotAllowed(res);
        const bodyResult = await readJsonBody(req, res);
        if (!bodyResult.ok) return;
        const body = bodyResult.value || {};
        const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
        const password = typeof body.password === 'string' ? body.password : '';
        const name = typeof body.name === 'string' ? body.name.trim() : '';
        const locale = typeof body.locale === 'string' && body.locale ? body.locale : 'nl-NL';
        const plan = typeof body.plan === 'string' && body.plan ? body.plan : 'free';
        const deviceId = extractDeviceId(req, body.deviceId);
        if (DEVICE_ID_REQUIRED && !deviceId) {
          return badRequest(
            res,
            `Device-ID verplicht. Voeg header ${DEVICE_ID_HEADER} toe of stuur deviceId in de payload.`
          );
        }
        if (!email || !isValidEmail(email)) {
          return badRequest(res, 'Voer een geldig e-mailadres in');
        }
        if (!validatePasswordStrength(password)) {
          return badRequest(
            res,
            'Wachtwoord moet minimaal 8 tekens bevatten en zowel hoofdletter, kleine letter als cijfer hebben'
          );
        }
        if (!SUBSCRIPTION_PLAN_KEYS.includes(plan)) {
          return badRequest(res, 'Onbekend abonnement');
        }
        if (getUserByEmail(email)) {
          return sendJSON(res, 409, { error: 'Account bestaat al voor dit e-mailadres' });
        }
        try {
          const userRecord = createUserAccount({ email, name, password, locale, plan });
          const { accessToken, refreshToken } = issueTokens(req, userRecord, deviceId);
          logAudit('auth.register', req, { userId: userRecord.id, plan });
          recordEvent({ userId: userRecord.id, type: 'auth.register', metadata: { plan } });
          const cookies = [
            createCookie('learnzo_refresh_token', refreshToken, {
              maxAge: DEFAULT_REFRESH_TTL_SECONDS,
              path: '/auth',
              sameSite: 'Strict'
            })
          ];
          sendJSON(
            res,
            201,
            {
              accessToken,
              expiresIn: DEFAULT_ACCESS_TTL_SECONDS,
              refreshToken,
              user: toPublicUser(userRecord)
            },
            { cookies }
          );
        } catch (error) {
          console.error('Registration failed', error);
          sendJSON(res, 500, { error: 'Registratie mislukt' });
        }
        return;
      }

      if (pathname === '/auth/login') {
        if (method !== 'POST') return methodNotAllowed(res);
        const bodyResult = await readJsonBody(req, res);
        if (!bodyResult.ok) return;
        const body = bodyResult.value || {};
      const email = typeof body.email === 'string' ? body.email.trim() : '';
      const password = typeof body.password === 'string' ? body.password : '';
      const deviceId = extractDeviceId(req, body.deviceId);
      if (DEVICE_ID_REQUIRED && !deviceId) {
        return badRequest(res, `Device-ID verplicht. Voeg header ${DEVICE_ID_HEADER} toe of stuur deviceId in de payload.`);
      }
      if (!email || !password) {
        return badRequest(res, 'Email en wachtwoord zijn verplicht');
      }
      const user = getUserByEmail(email);
      if (!user || !verifyPassword(password, user.auth?.password)) {
        return sendJSON(res, 401, { error: 'Ongeldige inloggegevens' });
      }
      markUserLogin(user.id);
      const { accessToken, refreshToken } = issueTokens(req, user, deviceId);
      recordEvent({ userId: user.id, type: 'auth.login', metadata: { deviceId } });
      logAudit('auth.login', req, { userId: user.id });
      const cookies = [
        createCookie('learnzo_refresh_token', refreshToken, {
          maxAge: DEFAULT_REFRESH_TTL_SECONDS,
          path: '/auth',
          sameSite: 'Strict'
        })
      ];
      sendJSON(
        res,
        200,
        {
          accessToken,
          expiresIn: DEFAULT_ACCESS_TTL_SECONDS,
          refreshToken,
          user: toPublicUser(user)
        },
        { cookies }
      );
      return;
    }

    if (pathname === '/auth/refresh') {
      if (method !== 'POST') return methodNotAllowed(res);
      const cookies = parseCookies(req);
      let token = cookies['learnzo_refresh_token'] || null;
      let parsedBody = null;
      if (!token) {
        const bodyResult = await readJsonBody(req, res);
        if (!bodyResult.ok) return;
        parsedBody = bodyResult.value || {};
        token = parsedBody?.refreshToken || null;
      }
      if (typeof token === 'string') {
        token = token.trim();
      }
      if (!token) {
        return unauthorized(res);
      }
      if (isRefreshTokenRevoked(token)) {
        return unauthorized(res);
      }
      const payload = verifyJwt(token, REFRESH_TOKEN_SECRET);
      if (!payload || payload.type !== 'refresh') {
        return unauthorized(res);
      }
      let requestedDeviceId = extractDeviceId(req, parsedBody?.deviceId);
      const stored = getRefreshTokenRecord(token);
      if (!stored || stored.userId !== payload.sub) {
        return unauthorized(res);
      }
      if (!requestedDeviceId && stored?.deviceId) {
        requestedDeviceId = stored.deviceId;
      }
      if (DEVICE_ID_REQUIRED && !requestedDeviceId) {
        return badRequest(res, `Device-ID verplicht. Voeg header ${DEVICE_ID_HEADER} toe of stuur deviceId in de payload.`);
      }
      if (stored.deviceId && requestedDeviceId && stored.deviceId !== requestedDeviceId) {
        return unauthorized(res, 'Device mismatch');
      }
      deleteRefreshTokenRecord(token);
      markRefreshTokenRevoked(token);
      const user = getUserById(payload.sub);
      if (!user) {
        return unauthorized(res);
      }
      const targetDeviceId = stored.deviceId || requestedDeviceId || null;
      if (DEVICE_ID_REQUIRED && !targetDeviceId) {
        return unauthorized(res, 'Device niet geregistreerd');
      }
      const { accessToken, refreshToken } = issueTokens(req, user, targetDeviceId);
      logAudit('auth.refresh', req, { userId: user.id, previousSessionId: stored.sessionId });
      recordEvent({
        userId: user.id,
        type: 'auth.refresh',
        metadata: { sessionId: stored.sessionId, previousToken: token }
      });
      const cookiesOut = [
        createCookie('learnzo_refresh_token', refreshToken, {
          maxAge: DEFAULT_REFRESH_TTL_SECONDS,
          path: '/auth',
          sameSite: 'Strict'
        })
      ];
      sendJSON(
        res,
        200,
        {
          accessToken,
          expiresIn: DEFAULT_ACCESS_TTL_SECONDS,
          refreshToken,
          user: toPublicUser(user)
        },
        { cookies: cookiesOut }
      );
      return;
    }

    if (pathname === '/auth/logout') {
      if (method !== 'POST') return methodNotAllowed(res);
      const cookies = parseCookies(req);
      const token = cookies['learnzo_refresh_token'];
      if (token) {
        revokeRefreshToken(token);
      }
      const clearCookie = createCookie('learnzo_refresh_token', '', {
        maxAge: 0,
        path: '/auth',
        sameSite: 'Strict'
      });
      logAudit('auth.logout', req, { hadRefreshToken: Boolean(token) });
      sendNoContent(res, { cookies: [clearCookie] });
      return;
    }

    if (pathname === '/me') {
      if (method !== 'GET') return methodNotAllowed(res);
      const user = ensureAuth(req, res);
      if (!user) return;
      sendJSON(res, 200, { user });
      return;
    }

    if (pathname === '/paths') {
      if (method !== 'GET') return methodNotAllowed(res);
      sendJSON(res, 200, { paths });
      return;
    }

    if (pathname === '/courses') {
      if (method !== 'GET') return methodNotAllowed(res);
      sendJSON(res, 200, { courses });
      return;
    }

    const courseMatch = pathname.match(/^\/courses\/([a-z0-9-]+)/i);
    if (courseMatch) {
      if (method !== 'GET') return methodNotAllowed(res);
      const slug = courseMatch[1];
      const course = courses.find((item) => item.slug === slug || item.id === slug);
      if (!course) return notFound(res, 'Cursus niet gevonden');
      sendJSON(res, 200, { course });
      return;
    }

    const pathSlugMatch = pathname.match(/^\/paths\/([a-z0-9-]+)/i);
    if (pathSlugMatch) {
      if (method !== 'GET') return methodNotAllowed(res);
      const slug = pathSlugMatch[1];
      const path = paths.find((item) => item.slug === slug);
      if (!path) return notFound(res, 'Leerpad niet gevonden');
      sendJSON(res, 200, { path });
      return;
    }

    const lessonMatch = pathname.match(/^\/lessons\/([a-z0-9-]+)/i);
    if (lessonMatch) {
      if (method !== 'GET') return methodNotAllowed(res);
      const lesson = getLessonBySlug(lessonMatch[1]);
      if (!lesson) return notFound(res, 'Les niet gevonden');
      sendJSON(res, 200, { lesson });
      return;
    }

    const assignmentMatch = pathname.match(/^\/assignments\/([a-z0-9-]+)/i);
    if (assignmentMatch) {
      if (method !== 'GET') return methodNotAllowed(res);
      const assignment = assignments[assignmentMatch[1]];
      if (!assignment) return notFound(res, 'Opdracht niet gevonden');
      sendJSON(res, 200, { assignment });
      return;
    }

    if (pathname === '/progress') {
      if (method === 'GET') {
        const user = ensureAuth(req, res);
        if (!user) return;
        const queryUser = url.searchParams.get('user');
        if (queryUser && queryUser !== 'me' && queryUser !== user.id) {
          return unauthorized(res);
        }
        const scope = url.searchParams.get('scope');
        let filtered = progress.filter((item) => item.userId === user.id);
        if (scope && scope.startsWith('path/')) {
          const [, pathId] = scope.split('/');
          const modulesForPath = paths
            .find((item) => item.id === pathId || item.slug === pathId)
            ?.modules.map((module) => module.id);
          if (modulesForPath) {
            filtered = filtered.filter((entry) => modulesForPath.includes(lessons[entry.entityId]?.moduleId));
          }
        }
        sendJSON(res, 200, { progress: filtered });
        return;
      }
      if (method === 'POST') {
        const user = ensureAuth(req, res);
        if (!user) return;
        const body = await parseBody(req).catch(() => null);
        if (!body || !body.entityId || !body.entityType || !body.status) {
          return badRequest(res, 'entityId, entityType en status zijn verplicht');
        }
        const entry = upsertProgress({
          userId: user.id,
          entityType: body.entityType,
          entityId: body.entityId,
          status: body.status,
          score: body.score || null,
          timeSpentMs: body.timeSpentMs || null
        });
        recordEvent({
          userId: user.id,
          type: 'progress.update',
          metadata: {
            entityType: body.entityType,
            entityId: body.entityId,
            status: body.status,
            score: body.score || null
          }
        });
        sendJSON(res, 200, { progress: entry });
        return;
      }
      return methodNotAllowed(res);
    }

    if (pathname === '/subscriptions/change') {
      if (method !== 'POST') return methodNotAllowed(res);
      const actor = ensureAuth(req, res);
      if (!actor) return;
      const body = await parseBody(req).catch(() => null);
      if (!body) {
        return badRequest(res, 'Ongeldige payload');
      }
      const targetUserId =
        body.userId && (actor.role === 'admin' || actor.role === 'mentor')
          ? body.userId
          : actor.id;
      if (body.userId && body.userId !== actor.id && !(actor.role === 'admin' || actor.role === 'mentor')) {
        return forbidden(res);
      }
      const plan = typeof body.plan === 'string' && body.plan ? body.plan : actor.subscription?.plan || 'free';
      if (!SUBSCRIPTION_PLAN_KEYS.includes(plan)) {
        return badRequest(res, 'Onbekend abonnement');
      }
      const status = typeof body.status === 'string' && body.status ? body.status : 'active';
      if (!SUBSCRIPTION_STATUS_OPTIONS.has(status)) {
        return badRequest(res, 'Onbekende abonnementsstatus');
      }
      let trialEndsAt = null;
      if (body.trialEndsAt) {
        const parsedTrial = new Date(body.trialEndsAt);
        if (!Number.isNaN(parsedTrial.getTime())) {
          trialEndsAt = parsedTrial.toISOString();
        }
      }
      const userRecord = getUserById(targetUserId);
      if (!userRecord) {
        return notFound(res, 'Gebruiker niet gevonden');
      }
      const subscription = changeUserSubscription({
        userId: targetUserId,
        plan,
        status,
        trialEndsAt
      });
      if (!subscription) {
        return notFound(res, 'Abonnement kon niet worden bijgewerkt');
      }
      logAudit('subscription.change', req, {
        actorId: actor.id,
        targetUserId,
        plan,
        status
      });
      recordEvent({
        userId: targetUserId,
        type: 'subscription.change',
        metadata: { plan, status, actorId: actor.id }
      });
      sendJSON(res, 200, {
        subscription,
        planDetails: subscriptionPlans[subscription.plan] || null
      });
      return;
    }

    if (pathname === '/submissions' && method === 'POST') {
      const user = ensureAuth(req, res, { requireActiveSubscription: true });
      if (!user) return;
      const body = await parseBody(req).catch(() => null);
      if (!body || !body.assignmentId) {
        return badRequest(res, 'assignmentId is verplicht');
      }
      const assignment = assignments[body.assignmentId];
      if (!assignment) return notFound(res, 'Onbekende opdracht');
      const submission = createSubmission({
        userId: user.id,
        assignmentId: body.assignmentId,
        code: body.code || ''
      });
      const passed = (body.code || '').includes('return') || assignment.language === 'html';
      const result = {
        status: passed ? 'passed' : 'failed',
        score: passed ? 1 : 0,
        testResults: assignment.tests.map((test) => ({
          name: test,
          status: passed ? 'passed' : 'failed',
          message: passed ? 'Geslaagd' : 'Controleer je implementatie'
        })),
        runtimeMs: Math.floor(Math.random() * 200) + 100,
        plagioScore: Math.random() * 0.3
      };
      updateSubmissionResult(submission.id, result);
      logAudit('submission.create', req, {
        userId: user.id,
        assignmentId: body.assignmentId,
        submissionId: submission.id,
        status: result.status
      });
      recordEvent({
        userId: user.id,
        type: 'assignment.submit',
        metadata: {
          assignmentId: body.assignmentId,
          submissionId: submission.id,
          status: result.status,
          score: result.score
        }
      });
      sendJSON(res, 201, { submission: { ...submission, ...result } });
      return;
    }

    const submissionMatch = pathname.match(/^\/submissions\/([a-z0-9-]+)/i);
    if (submissionMatch) {
      if (method !== 'GET') return methodNotAllowed(res);
      const submission = submissions.find((item) => item.id === submissionMatch[1]);
      if (!submission) return notFound(res, 'Submission niet gevonden');
      sendJSON(res, 200, { submission });
      return;
    }

    if (pathname === '/grader/run') {
      if (method !== 'POST') return methodNotAllowed(res);
      const user = ensureAuth(req, res, { requireActiveSubscription: true });
      if (!user) return;
      const body = await parseBody(req).catch(() => null);
      if (!body || !body.assignmentId || !body.code) {
        return badRequest(res, 'assignmentId en code zijn verplicht');
      }
      const assignment = assignments[body.assignmentId];
      if (!assignment) return notFound(res, 'Opdracht niet gevonden');
      const passed = body.code.includes('return') || assignment.language === 'html';
      recordEvent({
        userId: user.id,
        type: 'assignment.run',
        metadata: {
          assignmentId: body.assignmentId,
          passed,
          codeLength: body.code.length
        }
      });
      sendJSON(res, 200, {
        passed,
        tests: assignment.tests.map((name) => ({
          name,
          status: passed ? 'passed' : 'failed',
          message: passed ? 'Alle assertions geslaagd' : 'Failing test'
        })),
        logs: passed ? ['Tests geslaagd'] : ['Tests gefaald'],
        runtimeMs: Math.floor(Math.random() * 150) + 50
      });
      return;
    }

    if (pathname === '/ai/hints') {
      res.locals.metricsRoute = '/ai/hints';
      if (method !== 'POST') return methodNotAllowed(res);
      const user = ensureAuth(req, res, { requireActiveSubscription: true });
      if (!user) return;
      const body = await parseBody(req).catch(() => null);
      if (!body || !body.assignmentId || !body.question) {
        return badRequest(res, 'assignmentId en question zijn verplicht');
      }
      const assignment = assignments[body.assignmentId];
      if (!assignment) return notFound(res, 'Opdracht niet gevonden');
      const question = String(body.question || '').trim();
      if (question.length < 4) {
        return badRequest(res, 'Vraag is te kort');
      }
      const normalizedQuestion = question.toLowerCase();
      const bannedPatterns = [
        /geef.*oplossing/,
        /volledige.*oplossing/,
        /complete.*code/,
        /write.*full.*solution/
      ];
      const violatesGuardrail = bannedPatterns.some((regex) => regex.test(normalizedQuestion));
      const failingTests = Array.isArray(body.failingTests) ? body.failingTests : [];
      const code = typeof body.code === 'string' ? body.code : '';
      if (code.length > 12000) {
        return badRequest(res, 'Code is te lang voor analyse');
      }
      if (violatesGuardrail) {
        const refusal = storeAiHintSession({
          userId: user.id,
          assignmentId: body.assignmentId,
          question,
          requestMeta: { reason: 'guardrail', failingTests },
          response: null,
          refusal: true
        });
        logAudit('ai.hint.refused', req, {
          assignmentId: body.assignmentId,
          guardrail: 'no_solutions',
          sessionId: refusal.id
        });
        recordEvent({
          userId: user.id,
          type: 'ai.hint.refused',
          metadata: { assignmentId: body.assignmentId, reason: 'guardrail' }
        });
        sendJSON(res, 400, {
          error: 'Vraag overschrijdt hintbeleid (geen volledige oplossingen).',
          guardrail: { type: 'no_solutions', sessionId: refusal.id }
        });
        return;
      }
      const reasoningSteps = [
        `Herformuleer het doel: ${assignment.why}`,
        failingTests.length
          ? `Analyseer mislukkende tests: ${failingTests.join(', ')}`
          : 'Controleer de testverwachtingen en bewijs de intentie van je oplossing.',
        assignment.reflectionPrompt || 'Beschrijf hoe jouw aanpak waarde oplevert voor de gebruiker.'
      ];
      const hint = {
        focus: assignment.why || 'Begrijp waarom deze opdracht bestaat voordat je code wijzigt.',
        guardrails: {
          prohibitsSolutions: true,
          rationale: 'Hints richten zich op het waarom en sturen naar reflectie.'
        },
        recommendedNextStep:
          failingTests.length > 0
            ? `Begin met het scenario "${failingTests[0]}" en noteer welke aannames daar falen.`
            : 'Leg voor jezelf in 3 zinnen uit welke waarde jouw huidige oplossing oplevert.',
        reasoningSteps,
        reflectionQuestion:
          assignment.reflectionPrompt || 'Welke beslissing in je code ondersteunt het leerdoel expliciet?'
      };
      storeAiHintSession({
        userId: user.id,
        assignmentId: body.assignmentId,
        question,
        requestMeta: {
          failingTests,
          codeLength: code.length,
          contextLength: typeof body.context === 'string' ? body.context.length : 0
        },
        response: hint,
        refusal: false
      });
      recordEvent({
        userId: user.id,
        type: 'ai.hint.generated',
        metadata: { assignmentId: body.assignmentId, failingTests: failingTests.length }
      });
      logAudit('ai.hint.generated', req, {
        assignmentId: body.assignmentId,
        failingTests: failingTests.length
      });
      sendJSON(res, 200, { hint });
      return;
    }

    if (pathname === '/events') {
      if (method === 'POST') {
        const user = ensureAuth(req, res);
        if (!user) return;
        const body = await parseBody(req).catch(() => null);
        if (!body || !body.type) {
          return badRequest(res, 'type is verplicht');
        }
        const event = recordEvent({
          userId: body.userId || user.id,
          type: body.type,
          source: body.source || 'web',
          metadata: body.metadata || {}
        });
        logAudit('event.record', req, { userId: event.userId, eventType: event.type, eventId: event.id });
        sendJSON(res, 202, { event });
        return;
      }
      if (method === 'GET') {
        const user = ensureAuth(req, res);
        if (!user) return;
        const type = url.searchParams.get('type');
        const limit = Math.min(parseInt(url.searchParams.get('limit') || '100', 10), 500);
        const requestedUser = url.searchParams.get('user');
        let targetUserId = user.id;
        const role = req.auth?.user?.role || req.auth?.payload?.role || user.role;
        if (requestedUser && requestedUser !== 'me') {
          if (role !== 'admin') {
            return forbidden(res);
          }
          targetUserId = requestedUser;
        }
        const events = listEvents({ userId: targetUserId, type: type || null, limit: Number.isNaN(limit) ? 100 : limit });
        sendJSON(res, 200, { events });
        return;
      }
      return methodNotAllowed(res);
    }

    if (pathname === '/gamification') {
      if (method !== 'GET') return methodNotAllowed(res);
      const user = ensureAuth(req, res);
      if (!user) return;
      let targetUserId = user.id;
      const queryUser = url.searchParams.get('userId');
      if (queryUser && queryUser !== user.id) {
        const role = req.auth?.user?.role || req.auth?.payload?.role || user.role;
        if (role === 'admin' || role === 'mentor') {
          targetUserId = queryUser;
        } else {
          return forbidden(res);
        }
      }
      const targetUser = getUserById(targetUserId);
      if (!targetUser) {
        return notFound(res, 'Gebruiker niet gevonden');
      }
      const gamification = getGamificationState(targetUserId);
      sendJSON(res, 200, { gamification });
      return;
    }

    if (pathname === '/gamification/streak') {
      if (method !== 'POST') return methodNotAllowed(res);
      const user = ensureAuth(req, res);
      if (!user) return;
      const body = await parseBody(req).catch(() => null);
      if (!body) {
        return badRequest(res, 'Ongeldige payload');
      }
      let targetUserId = user.id;
      if (body.userId && body.userId !== user.id) {
        const role = req.auth?.user?.role || req.auth?.payload?.role || user.role;
        if (role === 'admin' || role === 'mentor') {
          targetUserId = body.userId;
        } else {
          return forbidden(res);
        }
      }
      if (!getUserById(targetUserId)) {
        return notFound(res, 'Gebruiker niet gevonden');
      }
      const action = typeof body.action === 'string' ? body.action : 'increment';
      let streak;
      if (action === 'reset') {
        streak = resetStreak(targetUserId);
      } else {
        const amount = Number.isFinite(body.amount) ? body.amount : Number(body.amount) || 1;
        streak = incrementStreak(targetUserId, amount);
      }
      recordEvent({
        userId: targetUserId,
        type: 'gamification.streak',
        metadata: { action, actorId: user.id }
      });
      sendJSON(res, 200, { streak });
      return;
    }

    if (pathname === '/gamification/award') {
      if (method !== 'POST') return methodNotAllowed(res);
      const actor = ensureAuth(req, res, { roles: ['mentor', 'admin'] });
      if (!actor) return;
      const body = await parseBody(req).catch(() => null);
      if (!body || !body.userId || !body.type || !body.title) {
        return badRequest(res, 'userId, type en title zijn verplicht');
      }
      const targetUser = getUserById(body.userId);
      if (!targetUser) {
        return notFound(res, 'Gebruiker niet gevonden');
      }
      const rawPoints = Number.isFinite(body.points) ? body.points : Number(body.points) || 0;
      const points = Math.max(0, Math.round(rawPoints));
      const achievement = awardAchievement({
        userId: body.userId,
        type: body.type,
        title: body.title,
        description: typeof body.description === 'string' ? body.description : '',
        points,
        evidence: body.evidence || null,
        awardedBy: actor.id
      });
      logAudit('gamification.award', req, {
        actorId: actor.id,
        targetUserId: body.userId,
        achievementId: achievement.id,
        points
      });
      recordEvent({
        userId: body.userId,
        type: 'gamification.achievement',
        metadata: { achievementId: achievement.id, points, awardedBy: actor.id }
      });
      sendJSON(res, 201, {
        achievement,
        gamification: getGamificationState(body.userId)
      });
      return;
    }

    if (pathname === '/privacy/export') {
      if (method !== 'POST') return methodNotAllowed(res);
      const user = ensureAuth(req, res);
      if (!user) return;
      const body = await parseBody(req).catch(() => ({}));
      const request = registerPrivacyRequest({
        userId: user.id,
        requestType: 'export',
        reason: body.reason || null,
        locale: body.locale || user.locale
      });
      logAudit('privacy.request.export', req, { userId: user.id, requestId: request.id });
      recordEvent({ userId: user.id, type: 'privacy.request', metadata: { requestId: request.id, requestType: 'export' } });
      sendJSON(res, 202, { request });
      return;
    }

    if (pathname === '/privacy/delete') {
      if (method !== 'POST') return methodNotAllowed(res);
      const user = ensureAuth(req, res);
      if (!user) return;
      const body = await parseBody(req).catch(() => ({}));
      const request = registerPrivacyRequest({
        userId: user.id,
        requestType: 'delete',
        reason: body.reason || null,
        locale: body.locale || user.locale
      });
      logAudit('privacy.request.delete', req, { userId: user.id, requestId: request.id });
      recordEvent({ userId: user.id, type: 'privacy.request', metadata: { requestId: request.id, requestType: 'delete' } });
      sendJSON(res, 202, { request });
      return;
    }

    if (pathname === '/threads') {
      if (method === 'GET') {
        const scope = url.searchParams.get('scope');
        const filtered = scope
          ? threads.filter((thread) => thread.scope === scope)
          : threads;
        sendJSON(res, 200, { threads: filtered.map(formatThread) });
        return;
      }
      if (method === 'POST') {
        const user = ensureAuth(req, res);
        if (!user) return;
        const body = await parseBody(req).catch(() => null);
        if (!body || !body.scope || !body.title || !body.body || !body.type) {
          return badRequest(res, 'scope, title, type en body zijn verplicht');
        }
        const { thread, comment } = createThread({
          scope: body.scope,
          title: body.title,
          authorId: user.id,
          type: body.type,
          body: body.body,
          tags: body.tags || []
        });
        sendJSON(res, 201, { thread: formatThread(thread), firstComment: comment });
        return;
      }
      return methodNotAllowed(res);
    }

    if (pathname === '/comments' && method === 'POST') {
      const user = ensureAuth(req, res);
      if (!user) return;
      const body = await parseBody(req).catch(() => null);
      if (!body || !body.threadId || !body.body) {
        return badRequest(res, 'threadId en body zijn verplicht');
      }
      const comment = addComment({
        threadId: body.threadId,
        authorId: user.id,
        body: body.body
      });
      if (!comment) return notFound(res, 'Thread niet gevonden');
      sendJSON(res, 201, { comment });
      return;
    }

    if (pathname === '/pseudocode' && method === 'POST') {
      const user = ensureAuth(req, res);
      if (!user) return;
      const body = await parseBody(req).catch(() => null);
      if (!body || !body.assignmentId || typeof body.code !== 'string') {
        return badRequest(res, 'assignmentId en code zijn verplicht');
      }
      const steps = generatePseudocode(body.code);
      const draft = savePseudocodeDraft({
        userId: user.id,
        assignmentId: body.assignmentId,
        steps,
        complexityHint: steps.length > 8 ? 'Overweeg je oplossing te vereenvoudigen.' : null
      });
      sendJSON(res, 200, { steps, draftId: draft.id });
      return;
    }

    if (pathname === '/billing/checkout' && method === 'POST') {
      const user = ensureAuth(req, res);
      if (!user) return;
      const body = await parseBody(req).catch(() => null);
      if (!body || !body.priceId || !body.redirectUrl) {
        return badRequest(res, 'priceId en redirectUrl zijn verplicht');
      }
      sendJSON(res, 200, {
        checkoutUrl: `${body.redirectUrl}?session=${encodeURIComponent(body.priceId)}&token=${user.id}`,
        status: 'pending'
      });
      return;
    }

    if (pathname === '/analytics/events' && method === 'POST') {
      const body = await parseBody(req).catch(() => null);
      if (!body || !body.type) {
        return badRequest(res, 'type is verplicht');
      }
      sendJSON(res, 202, { received: true, recordedAt: new Date().toISOString() });
      return;
    }

    if (pathname === '/analytics/events/bulk' && method === 'POST') {
      const body = await parseBody(req).catch(() => null);
      if (!body || !Array.isArray(body.events)) {
        return badRequest(res, 'events[] is verplicht');
      }
      sendJSON(res, 202, {
        received: body.events.length,
        recordedAt: new Date().toISOString()
      });
      return;
    }

    if (pathname === '/quizzes') {
      if (method !== 'GET') return methodNotAllowed(res);
      sendJSON(res, 200, { quizzes });
      return;
    }

    if (pathname === '/cheatsheets') {
      if (method !== 'GET') return methodNotAllowed(res);
      const language = url.searchParams.get('language');
      const topic = url.searchParams.get('topic');
      const query = url.searchParams.get('q');
      const results = searchCheatsheets({ language, topic, query });
      sendJSON(res, 200, { cheatsheets: results });
      return;
    }

    const cheatsheetMatch = pathname.match(/^\/cheatsheets\/([a-z0-9-]+)/i);
    if (cheatsheetMatch) {
      if (method !== 'GET') return methodNotAllowed(res);
      const cheat = findCheatsheetBySlug(cheatsheetMatch[1]);
      if (!cheat) return notFound(res, 'Cheatsheet niet gevonden');
      sendJSON(res, 200, { cheatsheet: cheat });
      return;
    }

    if (pathname === '/anatomy') {
      if (method !== 'GET') return methodNotAllowed(res);
      const language = url.searchParams.get('language');
      sendJSON(res, 200, { entries: listAnatomyEntries({ language }) });
      return;
    }

    const anatomyMatch = pathname.match(/^\/anatomy\/([a-z0-9-]+)(?:\/([a-z0-9-]+))?/i);
    if (anatomyMatch) {
      if (method !== 'GET') return methodNotAllowed(res);
      const [, language, concept] = anatomyMatch;
      if (!concept) {
        const entries = listAnatomyEntries({ language });
        sendJSON(res, 200, { entries });
        return;
      }
      const entry = findAnatomyEntry(language, concept);
      if (!entry) return notFound(res, 'Anatomy entry niet gevonden');
      sendJSON(res, 200, { entry });
      return;
    }

    if (pathname === '/microvideos') {
      if (method !== 'GET') return methodNotAllowed(res);
      const topic = url.searchParams.get('topic');
      sendJSON(res, 200, { videos: listMicroVideos({ topic }) });
      return;
    }

    const microVideoMatch = pathname.match(/^\/microvideos\/([a-z0-9-]+)/i);
    if (microVideoMatch) {
      if (method !== 'GET') return methodNotAllowed(res);
      const video = microVideos.find((item) => item.slug === microVideoMatch[1] || item.id === microVideoMatch[1]);
      if (!video) return notFound(res, 'Microvideo niet gevonden');
      sendJSON(res, 200, { video });
      return;
    }

    if (pathname === '/app/dashboard' && method === 'GET') {
      const user = ensureAuth(req, res);
      if (!user) return;
      sendJSON(res, 200, { dashboard: getDashboardForUser(user.id) });
      return;
    }

    if (pathname === '/app/calendar') {
      if (method === 'GET') {
        const user = ensureAuth(req, res);
        if (!user) return;
        sendJSON(res, 200, { events: listCalendarEvents(user.id) });
        return;
      }
      if (method === 'POST') {
        const user = ensureAuth(req, res);
        if (!user) return;
        const body = await parseBody(req).catch(() => null);
        if (!body || !body.title || !body.start || !body.end) {
          return badRequest(res, 'title, start en end zijn verplicht');
        }
        const event = createCalendarEvent({
          userId: user.id,
          title: body.title,
          type: body.type || 'study-block',
          start: body.start,
          end: body.end
        });
        sendJSON(res, 201, { event });
        return;
      }
      return methodNotAllowed(res);
    }

    const calendarMatch = pathname.match(/^\/app\/calendar\/([a-z0-9-]+)/i);
    if (calendarMatch) {
      if (method === 'PATCH' || method === 'PUT') {
        const user = ensureAuth(req, res);
        if (!user) return;
        const body = await parseBody(req).catch(() => null);
        const event = updateCalendarEvent(calendarMatch[1], body || {});
        if (!event || event.userId !== user.id) return notFound(res, 'Event niet gevonden');
        sendJSON(res, 200, { event });
        return;
      }
      if (method === 'DELETE') {
        const user = ensureAuth(req, res);
        if (!user) return;
        const removed = deleteCalendarEvent(calendarMatch[1], user.id);
        if (!removed) return notFound(res, 'Event niet gevonden');
        sendNoContent(res);
        return;
      }
      return methodNotAllowed(res);
    }

    if (pathname === '/billing/invoices' && method === 'GET') {
      const user = ensureAuth(req, res);
      if (!user) return;
      sendJSON(res, 200, { invoices: listInvoices(user.id) });
      return;
    }

    if (pathname === '/app/certificaten' && method === 'GET') {
      const user = ensureAuth(req, res);
      if (!user) return;
      sendJSON(res, 200, { certificates: listCertificates(user.id) });
      return;
    }

    if (pathname === '/mentor/reviews') {
      if (method !== 'GET') return methodNotAllowed(res);
      const user = ensureAuth(req, res, { roles: ['mentor', 'admin'] });
      if (!user) return;
      sendJSON(res, 200, { queue: listReviewQueue() });
      return;
    }

    const mentorReviewAction = pathname.match(/^\/mentor\/reviews\/([a-z0-9-]+)\/(claim|complete)/i);
    if (mentorReviewAction) {
      if (method !== 'POST') return methodNotAllowed(res);
      const user = ensureAuth(req, res, { roles: ['mentor', 'admin'] });
      if (!user) return;
      const [, reviewId, action] = mentorReviewAction;
      const handler = action === 'claim' ? claimReview : completeReview;
      const review = handler(reviewId, user.id);
      if (!review) return notFound(res, 'Review niet gevonden of reeds verwerkt');
      sendJSON(res, 200, { review });
      return;
    }

    if (pathname === '/admin/promotions') {
      res.locals.metricsRoute = '/admin/promotions';
      if (method === 'GET') {
        const user = ensureAuth(req, res, { roles: ['admin'] });
        if (!user) return;
        const includeArchived = url.searchParams.get('includeArchived') === 'true';
        sendJSON(res, 200, { promotions: listPromotions({ includeArchived }) });
        return;
      }
      if (method === 'POST') {
        const user = ensureAuth(req, res, { roles: ['admin'] });
        if (!user) return;
        const bodyResult = await readJsonBody(req, res);
        if (!bodyResult.ok) return;
        try {
          const promotion = createPromotion({ payload: bodyResult.value, actorId: user.id });
          logAudit('promotion.create', req, { promotionId: promotion.id, code: promotion.code });
          sendJSON(res, 201, { promotion });
        } catch (error) {
          const status = error?.code === 'PROMO_CONFLICT' ? 409 : 400;
          sendJSON(res, status, { error: error.message });
        }
        return;
      }
      return methodNotAllowed(res);
    }

    const promotionActionMatch = pathname.match(/^\/admin\/promotions\/([a-z0-9-]+)\/(activate|pause|archive)$/i);
    if (promotionActionMatch) {
      if (method !== 'POST') return methodNotAllowed(res);
      res.locals.metricsRoute = '/admin/promotions/transition';
      const user = ensureAuth(req, res, { roles: ['admin'] });
      if (!user) return;
      const [, promotionId, action] = promotionActionMatch;
      try {
        const promotion = transitionPromotionStatus({ id: promotionId, action: action.toLowerCase(), actorId: user.id });
        logAudit(`promotion.${action.toLowerCase()}`, req, {
          promotionId: promotion.id,
          status: promotion.status
        });
        sendJSON(res, 200, { promotion });
      } catch (error) {
        const statusMap = {
          PROMO_NOT_FOUND: 404,
          PROMO_VALIDATION: 400
        };
        const status = statusMap[error?.code] || 400;
        sendJSON(res, status, { error: error.message });
      }
      return;
    }

    const promotionMatch = pathname.match(/^\/admin\/promotions\/([a-z0-9-]+)$/i);
    if (promotionMatch) {
      if (method !== 'PATCH') return methodNotAllowed(res);
      res.locals.metricsRoute = '/admin/promotions/:id';
      const user = ensureAuth(req, res, { roles: ['admin'] });
      if (!user) return;
      const bodyResult = await readJsonBody(req, res);
      if (!bodyResult.ok) return;
      try {
        const promotion = updatePromotion({ id: promotionMatch[1], patch: bodyResult.value || {}, actorId: user.id });
        logAudit('promotion.update', req, { promotionId: promotion.id });
        sendJSON(res, 200, { promotion });
      } catch (error) {
        const statusMap = {
          PROMO_NOT_FOUND: 404,
          PROMO_CONFLICT: 409,
          PROMO_VALIDATION: 400
        };
        const status = statusMap[error?.code] || 400;
        sendJSON(res, status, { error: error.message });
      }
      return;
    }

    if (pathname === '/admin/flags' && method === 'GET') {
      const user = ensureAuth(req, res, { roles: ['admin'] });
      if (!user) return;
      sendJSON(res, 200, { flags: listFeatureFlags() });
      return;
    }

    if (pathname === '/admin/audit-log' && method === 'GET') {
      const user = ensureAuth(req, res, { roles: ['admin'] });
      if (!user) return;
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '200', 10), 500);
      const events = listAuditEvents(limit);
      sendJSON(res, 200, { auditLog: events });
      return;
    }

    if (pathname === '/admin/privacy-requests' && method === 'GET') {
      const user = ensureAuth(req, res, { roles: ['admin'] });
      if (!user) return;
      sendJSON(res, 200, { requests: listPrivacyRequests() });
      return;
    }

    const privacyRequestMatch = pathname.match(/^\/admin\/privacy-requests\/([a-z0-9-]+)/i);
    if (privacyRequestMatch) {
      if (method !== 'PATCH') return methodNotAllowed(res);
      const user = ensureAuth(req, res, { roles: ['admin'] });
      if (!user) return;
      const body = await parseBody(req).catch(() => null);
      if (!body || !body.status) {
        return badRequest(res, 'status is verplicht');
      }
      const allowed = ['open', 'in_progress', 'completed', 'rejected'];
      if (!allowed.includes(body.status)) {
        return badRequest(res, 'Ongeldige status');
      }
      const updated = updatePrivacyRequestStatus(privacyRequestMatch[1], body.status, user.id);
      if (!updated) return notFound(res, 'Verzoek niet gevonden');
      logAudit('privacy.request.update', req, { requestId: updated.id, status: updated.status });
      sendJSON(res, 200, { request: updated });
      return;
    }

    const flagMatch = pathname.match(/^\/flags\/([a-z0-9-]+)/i);
    if (flagMatch) {
      if (method !== 'PATCH') return methodNotAllowed(res);
      const user = ensureAuth(req, res, { roles: ['admin'] });
      if (!user) return;
      const body = await parseBody(req).catch(() => null);
      if (!body || !body.variant) {
        return badRequest(res, 'variant is verplicht');
      }
      const flag = toggleFeatureFlag(flagMatch[1], body.variant);
      if (!flag) return notFound(res, 'Feature flag niet gevonden');
      sendJSON(res, 200, { flag });
      return;
    }

    if (pathname === '/lti/registrations') {
      res.locals.metricsRoute = '/lti/registrations';
      if (method === 'GET') {
        const user = ensureAuth(req, res, { roles: ['admin'] });
        if (!user) return;
        sendJSON(res, 200, { registrations: listLtiRegistrations() });
        return;
      }
      if (method === 'POST') {
        const user = ensureAuth(req, res, { roles: ['admin'] });
        if (!user) return;
        const body = await parseBody(req).catch(() => null);
        if (!body || !body.clientId || !body.deploymentId) {
          return badRequest(res, 'clientId en deploymentId zijn verplicht');
        }
        try {
          const registration = registerLtiRegistration(body);
          logAudit('lti.registration.upsert', req, {
            clientId: registration.clientId,
            deploymentId: registration.deploymentId
          });
          sendJSON(res, 201, { registration });
        } catch (error) {
          recordError(error, { stage: 'lti.registration' });
          sendJSON(res, 400, { error: error.message });
        }
        return;
      }
      return methodNotAllowed(res);
    }

    if (pathname === '/lti/launch') {
      res.locals.metricsRoute = '/lti/launch';
      if (method !== 'POST') return methodNotAllowed(res);
      const body = await parseBody(req).catch(() => null);
      if (!body || !body.clientId || !body.deploymentId) {
        return badRequest(res, 'clientId en deploymentId zijn verplicht');
      }
      const launch = recordLtiLaunch({
        clientId: body.clientId,
        deploymentId: body.deploymentId,
        userId: body.userId || null,
        context: body.context || {}
      });
      if (!launch) {
        return notFound(res, 'Registratie niet gevonden of inactief');
      }
      logAudit('lti.launch', req, {
        clientId: launch.clientId,
        deploymentId: launch.deploymentId,
        userId: launch.userId
      });
      recordEvent({
        userId: launch.userId,
        type: 'lti.launch',
        metadata: { clientId: launch.clientId, deploymentId: launch.deploymentId }
      });
      sendJSON(res, 200, { launch });
      return;
    }

    if (pathname === '/lti/outcomes') {
      res.locals.metricsRoute = '/lti/outcomes';
      if (method !== 'POST') return methodNotAllowed(res);
      const user = ensureAuth(req, res, { roles: ['mentor', 'admin'] });
      if (!user) return;
      const body = await parseBody(req).catch(() => null);
      if (!body || !body.launchId || typeof body.score !== 'number') {
        return badRequest(res, 'launchId en numerieke score zijn verplicht');
      }
      recordEvent({
        userId: body.userId || null,
        type: 'lti.outcome.recorded',
        metadata: { launchId: body.launchId, score: body.score }
      });
      logAudit('lti.outcome', req, { launchId: body.launchId, score: body.score });
      sendJSON(res, 202, { status: 'accepted' });
      return;
    }

    if (pathname === '/scorm/import') {
      res.locals.metricsRoute = '/scorm/import';
      if (method !== 'POST') return methodNotAllowed(res);
      const user = ensureAuth(req, res, { roles: ['admin'] });
      if (!user) return;
      const body = await parseBody(req).catch(() => null);
      if (!body || !body.manifestHash) {
        return badRequest(res, 'manifestHash is verplicht');
      }
      try {
        const pkg = storeScormPackage(body);
        logAudit('scorm.import', req, { packageId: pkg.id });
        sendJSON(res, 201, { package: pkg });
      } catch (error) {
        recordError(error, { stage: 'scorm.import' });
        sendJSON(res, 400, { error: error.message });
      }
      return;
    }

    if (pathname === '/scorm/packages' && method === 'GET') {
      res.locals.metricsRoute = '/scorm/packages';
      const user = ensureAuth(req, res, { roles: ['mentor', 'admin'] });
      if (!user) return;
      sendJSON(res, 200, { packages: listScormPackages() });
      return;
    }

    if (pathname === '/sso/providers') {
      res.locals.metricsRoute = '/sso/providers';
      if (method === 'GET') {
        const user = ensureAuth(req, res, { roles: ['admin'] });
        if (!user) return;
        sendJSON(res, 200, { providers: listSsoProviders() });
        return;
      }
      if (method === 'POST') {
        const user = ensureAuth(req, res, { roles: ['admin'] });
        if (!user) return;
        const body = await parseBody(req).catch(() => null);
        if (!body || !body.issuer) {
          return badRequest(res, 'issuer is verplicht');
        }
        try {
          const provider = registerSsoProvider(body);
          logAudit('sso.provider.upsert', req, { issuer: provider.issuer });
          sendJSON(res, 201, { provider });
        } catch (error) {
          recordError(error, { stage: 'sso.provider' });
          sendJSON(res, 400, { error: error.message });
        }
        return;
      }
      return methodNotAllowed(res);
    }

    const scimMatch = pathname.match(/^\/scim\/v2\/users\/?([a-z0-9-]+)?$/i);
    if (scimMatch) {
      res.locals.metricsRoute = scimMatch[1] ? '/scim/v2/users/:id' : '/scim/v2/users';
      const actor = ensureAuth(req, res, { roles: ['admin'] });
      if (!actor) return;
      const userId = scimMatch[1];
      if (!userId) {
        if (method === 'GET') {
          sendJSON(res, 200, { Resources: listScimDirectory() });
          return;
        }
        if (method === 'POST') {
          const body = await parseBody(req).catch(() => null);
          if (!body || !body.externalId) {
            return badRequest(res, 'externalId is verplicht');
          }
          try {
            const result = upsertScimUser(body);
            logAudit('scim.user.upsert', req, { externalId: body.externalId, userId: result.user.id });
            sendJSON(res, 201, { resource: result.mapping });
          } catch (error) {
            recordError(error, { stage: 'scim.user' });
            sendJSON(res, 400, { error: error.message });
          }
          return;
        }
        return methodNotAllowed(res);
      }
      if (method === 'PATCH') {
        const body = await parseBody(req).catch(() => null);
        if (!body || typeof body.active === 'undefined') {
          return badRequest(res, 'active veld is verplicht');
        }
        if (body.active) {
          try {
            const result = upsertScimUser({ externalId: userId, active: true });
            sendJSON(res, 200, { resource: result.mapping });
          } catch (error) {
            recordError(error, { stage: 'scim.activate' });
            sendJSON(res, 400, { error: error.message });
          }
        } else {
          const mapping = deactivateScimUser(userId);
          if (!mapping) return notFound(res, 'SCIM mapping niet gevonden');
          sendJSON(res, 200, { resource: mapping });
        }
        return;
      }
      if (method === 'DELETE') {
        const removed = deleteScimUser(userId);
        if (!removed) return notFound(res, 'SCIM mapping niet gevonden');
        sendJSON(res, 200, { deleted: true });
        return;
      }
      return methodNotAllowed(res);
    }

    if (pathname === '/affiliate/partners') {
      res.locals.metricsRoute = '/affiliate/partners';
      if (method === 'GET') {
        const user = ensureAuth(req, res, { roles: ['admin'] });
        if (!user) return;
        sendJSON(res, 200, { partners: listAffiliatePartners() });
        return;
      }
      if (method === 'POST') {
        const user = ensureAuth(req, res, { roles: ['admin'] });
        if (!user) return;
        const body = await parseBody(req).catch(() => null);
        if (!body || !body.code) {
          return badRequest(res, 'code is verplicht');
        }
        try {
          const partner = registerAffiliatePartner(body);
          sendJSON(res, 201, { partner });
        } catch (error) {
          sendJSON(res, 400, { error: error.message });
        }
        return;
      }
      return methodNotAllowed(res);
    }

    if (pathname === '/affiliate/click' && method === 'POST') {
      res.locals.metricsRoute = '/affiliate/click';
      const body = await parseBody(req).catch(() => null);
      if (!body || !body.code) {
        return badRequest(res, 'code is verplicht');
      }
      const partner = recordAffiliateClick(body.code);
      if (!partner) return notFound(res, 'Partner niet gevonden');
      sendJSON(res, 200, { partner });
      return;
    }

    if (pathname === '/affiliate/conversions') {
      res.locals.metricsRoute = '/affiliate/conversions';
      if (method !== 'POST') return methodNotAllowed(res);
      const user = ensureAuth(req, res, { roles: ['admin'] });
      if (!user) return;
      const body = await parseBody(req).catch(() => null);
      if (!body || !body.code || typeof body.amount !== 'number') {
        return badRequest(res, 'code en amount zijn verplicht');
      }
      const payout = recordAffiliateConversion(body);
      if (!payout) return notFound(res, 'Partner niet gevonden');
      sendJSON(res, 201, { payout });
      return;
    }

    if (pathname === '/affiliate/payouts') {
      res.locals.metricsRoute = '/affiliate/payouts';
      const user = ensureAuth(req, res, { roles: ['admin'] });
      if (!user) return;
      if (method === 'GET') {
        sendJSON(res, 200, { payouts: listAffiliatePayouts() });
        return;
      }
      if (method === 'PATCH') {
        const body = await parseBody(req).catch(() => null);
        if (!body || !body.payoutId) {
          return badRequest(res, 'payoutId is verplicht');
        }
        const payout = settleAffiliatePayout(body.payoutId, body.status || 'paid');
        if (!payout) return notFound(res, 'Payout niet gevonden');
        sendJSON(res, 200, { payout });
        return;
      }
      return methodNotAllowed(res);
    }

    if (pathname === '/admin/support' && method === 'GET') {
      const user = ensureAuth(req, res, { roles: ['admin'] });
      if (!user) return;
      sendJSON(res, 200, { tickets: listSupportTickets() });
      return;
    }

    if (pathname === '/admin/overview' && method === 'GET') {
      const user = ensureAuth(req, res, { roles: ['admin'] });
      if (!user) return;
      sendJSON(res, 200, {
        metrics: {
          activeStudents: users.filter((u) => u.role === 'student').length,
          mentorsOnline: users.filter((u) => u.role === 'mentor').length,
          openTickets: listSupportTickets().filter((ticket) => ticket.status === 'open').length,
          submissionsToday: submissions.length,
          featureFlags: listFeatureFlags().length
        }
      });
      return;
    }

    if (pathname === '/content/sync' && method === 'POST') {
      const user = ensureAuth(req, res, { roles: ['admin'] });
      if (!user) return;
      const body = await parseBody(req).catch(() => null);
      sendJSON(res, 202, {
        status: 'queued',
        receivedAt: new Date().toISOString(),
        payloadPreview: body ? Object.keys(body) : []
      });
      return;
    }

    if (pathname === '/support/status' && method === 'GET') {
      sendJSON(res, 200, {
        status: 'operational',
        updatedAt: new Date().toISOString(),
        incidents: []
      });
      return;
    }

    notFound(res);
  } catch (error) {
    console.error('Unexpected error', error);
    recordError(error, { route: pathname, method });
    sendJSON(res, 500, { error: 'Internal server error' });
  }
};

function resetServerState() {
  clearRefreshTokenState();
  rateLimiter.clear();
  resetRuntimeData();
}

function createServer() {
  let protocol = 'http';
  if (TLS_KEY_PATH && TLS_CERT_PATH) {
    try {
      const options = {
        key: fs.readFileSync(TLS_KEY_PATH),
        cert: fs.readFileSync(TLS_CERT_PATH)
      };
      if (TLS_CA_PATH) {
        options.ca = fs.readFileSync(TLS_CA_PATH);
      }
      const server = https.createServer(options, requestHandler);
      protocol = 'https';
      return { server, protocol };
    } catch (error) {
      throw new Error(`TLS configuration failed: ${error.message}`);
    }
  }
  const server = http.createServer(requestHandler);
  return { server, protocol };
}

if (require.main === module) {
  const { server, protocol } = createServer();
  server.listen(PORT, () => {
    console.log(`LearnZo API server running on ${protocol}://localhost:${PORT}`);
  });
}

module.exports = {
  createServer,
  resetServerState,
  requestHandler,
  PORT
};
