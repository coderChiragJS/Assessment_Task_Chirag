import { z } from 'zod';
import { ROLES } from '../../config/rbac.js';

export const createUserSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email().transform((e) => e.toLowerCase()),
  password: z.string().min(6).max(128),
  role: z.nativeEnum(ROLES).default(ROLES.USER),
  teamId: z.string().uuid().optional(),
});

export const updateRoleSchema = z.object({
  role: z.nativeEnum(ROLES),
});

export const assignTeamSchema = z.object({
  teamId: z.string().uuid().nullable(),
});
