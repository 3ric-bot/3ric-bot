const { createHmac, randomBytes, scryptSync, timingSafeEqual } = require('crypto');

const DEFAULT_ACCESS_TTL_SECONDS = 900; // 15 minutes
const DEFAULT_REFRESH_TTL_SECONDS = 60 * 60 * 24 * 14; // 14 days

function base64UrlEncode(input) {
  return Buffer.from(input).toString('base64url');
}

function base64UrlDecode(input) {
  return Buffer.from(input, 'base64url').toString('utf8');
}

function signToken(unsignedToken, secret) {
  return createHmac('sha256', secret).update(unsignedToken).digest('base64url');
}

function createJwt(payload, secret, options = {}) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresIn = options.expiresInSeconds || DEFAULT_ACCESS_TTL_SECONDS;
  const body = {
    iat: issuedAt,
    exp: issuedAt + expiresIn,
    ...payload
  };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedBody = base64UrlEncode(JSON.stringify(body));
  const signature = signToken(`${encodedHeader}.${encodedBody}`, secret);
  return `${encodedHeader}.${encodedBody}.${signature}`;
}

function verifyJwt(token, secret) {
  if (!token || typeof token !== 'string') {
    return null;
  }
  const segments = token.split('.');
  if (segments.length !== 3) {
    return null;
  }
  const [encodedHeader, encodedBody, signature] = segments;
  const expected = signToken(`${encodedHeader}.${encodedBody}`, secret);
  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(signature);
  if (
    expectedBuffer.length !== providedBuffer.length ||
    !timingSafeEqual(expectedBuffer, providedBuffer)
  ) {
    return null;
  }
  try {
    const payload = JSON.parse(base64UrlDecode(encodedBody));
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (payload.exp && nowSeconds > payload.exp) {
      return null;
    }
    return payload;
  } catch (error) {
    return null;
  }
}

function createPasswordRecord(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

function verifyPassword(password, record) {
  if (!record || !record.salt || !record.hash) {
    return false;
  }
  const computedHash = scryptSync(password, record.salt, 64).toString('hex');
  const computedBuffer = Buffer.from(computedHash, 'hex');
  const storedBuffer = Buffer.from(record.hash, 'hex');
  if (computedBuffer.length !== storedBuffer.length) {
    return false;
  }
  return timingSafeEqual(computedBuffer, storedBuffer);
}

module.exports = {
  DEFAULT_ACCESS_TTL_SECONDS,
  DEFAULT_REFRESH_TTL_SECONDS,
  createJwt,
  verifyJwt,
  createPasswordRecord,
  verifyPassword
};
