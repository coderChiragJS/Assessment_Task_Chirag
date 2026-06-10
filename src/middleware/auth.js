import { ApiError } from '../lib/http.js';
import { verifyAccessToken } from '../lib/crypto.js';

export function authenticate(req, _res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(ApiError.unauthorized('Missing or malformed Authorization header'));
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = {
      id: payload.sub,
      role: payload.role,
      teamId: payload.teamId ?? null,
      name: payload.name ?? null,
    };
    next();
  } catch {
    next(ApiError.unauthorized('Invalid or expired access token'));
  }
}
