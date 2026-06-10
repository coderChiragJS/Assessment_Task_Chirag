import { z } from 'zod';

export const createTeamSchema = z.object({
  name: z.string().min(1).max(120),
  managerId: z.string().uuid().optional(),
});
