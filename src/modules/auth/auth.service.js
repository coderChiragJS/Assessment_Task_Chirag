import { v4 as uuid } from 'uuid';
import { usersRepo, toPublicUser } from '../../repositories/users.repo.js';
import { refreshTokensRepo } from '../../repositories/refreshTokens.repo.js';
import {
  hashPassword,
  verifyPassword,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../../lib/crypto.js';
import { ApiError } from '../../lib/http.js';
import { ROLES } from '../../config/rbac.js';
import { recordActivity } from '../../services/activity.service.js';
import { ENTITY, ACTION } from '../../config/constants.js';
import { env } from '../../config/env.js';

function refreshExpiryEpoch() {
  const ttl = env.JWT_REFRESH_TTL;
  const days = /^(\d+)d$/.exec(ttl);
  const seconds = days ? Number(days[1]) * 86400 : 7 * 86400;
  return Math.floor(Date.now() / 1000) + seconds;
}

async function issueTokens(user) {
  const tokenId = uuid();
  await refreshTokensRepo.save({
    tokenId,
    userId: user.userId,
    expiresAt: refreshExpiryEpoch(),
  });
  return {
    accessToken: signAccessToken({
      userId: user.userId,
      role: user.role,
      teamId: user.teamId,
      name: user.name,
    }),
    refreshToken: signRefreshToken({ userId: user.userId, tokenId }),
  };
}

export const authService = {
    async signup({ name, email, password }) {
    const existing = await usersRepo.getByEmail(email);
    if (existing) throw ApiError.conflict('An account with this email already exists');

    const user = {
      userId: uuid(),
      name,
      email,
      passwordHash: await hashPassword(password),
      role: ROLES.USER,
      createdAt: new Date().toISOString(),
    };
    await usersRepo.create(user);

    await recordActivity({
      actor: { id: user.userId, name: user.name },
      entityType: ENTITY.USER,
      entityId: user.userId,
      action: ACTION.USER_CREATED,
      metadata: { via: 'signup' },
    });

    const tokens = await issueTokens(user);
    return { user: toPublicUser(user), ...tokens };
  },

  async login({ email, password }) {
    const user = await usersRepo.getByEmail(email);
    if (!user) throw ApiError.unauthorized('Invalid credentials');

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) throw ApiError.unauthorized('Invalid credentials');

    const tokens = await issueTokens(user);
    return { user: toPublicUser(user), ...tokens };
  },

    async refresh({ refreshToken }) {
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw ApiError.unauthorized('Invalid or expired refresh token');
    }

    const stored = await refreshTokensRepo.get(payload.jti);
    if (!stored || stored.userId !== payload.sub) {
      throw ApiError.unauthorized('Refresh token has been revoked');
    }

    const user = await usersRepo.getById(payload.sub);
    if (!user) throw ApiError.unauthorized('User no longer exists');

    await refreshTokensRepo.revoke(payload.jti);
    const tokens = await issueTokens(user);
    return { user: toPublicUser(user), ...tokens };
  },

  async logout({ refreshToken }) {
    try {
      const payload = verifyRefreshToken(refreshToken);
      await refreshTokensRepo.revoke(payload.jti);
    } catch {

    }
    return { ok: true };
  },
};
