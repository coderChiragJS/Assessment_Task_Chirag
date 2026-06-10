import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';

export function signAccessToken({ userId, role, teamId, name }) {
  return jwt.sign({ role, teamId, name }, env.JWT_ACCESS_SECRET, {
    subject: userId,
    expiresIn: env.JWT_ACCESS_TTL,
  });
}

export function signRefreshToken({ userId, tokenId }) {
  return jwt.sign({ jti: tokenId }, env.JWT_REFRESH_SECRET, {
    subject: userId,
    expiresIn: env.JWT_REFRESH_TTL,
  });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET);
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, env.JWT_REFRESH_SECRET);
}

export const hashPassword = (plain) => bcrypt.hash(plain, env.BCRYPT_ROUNDS);

export const verifyPassword = (plain, hash) => bcrypt.compare(plain, hash);
