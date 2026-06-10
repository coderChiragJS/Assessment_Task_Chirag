import { z } from 'zod';
import { TASK_STATUS, TASK_PRIORITY } from '../../config/constants.js';

export const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional().default(''),
  priority: z.nativeEnum(TASK_PRIORITY).default(TASK_PRIORITY.MEDIUM),
  assigneeId: z.string().uuid().optional(),
  teamId: z.string().uuid().optional(),
  dueDate: z.string().datetime().optional(),
});

export const updateTaskSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(5000).optional(),
    priority: z.nativeEnum(TASK_PRIORITY).optional(),
    dueDate: z.string().datetime().nullable().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'No fields to update' });

export const assignTaskSchema = z.object({
  assigneeId: z.string().uuid(),
});

export const changeStatusSchema = z.object({
  status: z.nativeEnum(TASK_STATUS),
});

export const listTasksQuerySchema = z.object({
  status: z.nativeEnum(TASK_STATUS).optional(),
  priority: z.nativeEnum(TASK_PRIORITY).optional(),
  assigneeId: z.string().uuid().optional(),
  teamId: z.string().uuid().optional(),
  q: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  page: z.coerce.number().int().min(1).default(1),
});
