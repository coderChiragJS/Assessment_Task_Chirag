import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler, ok, created } from '../../lib/http.js';
import { PERMISSIONS } from '../../config/rbac.js';
import { tasksService } from './tasks.service.js';
import commentsRouter from '../comments/comments.routes.js';
import {
  createTaskSchema,
  updateTaskSchema,
  assignTaskSchema,
  changeStatusSchema,
  listTasksQuerySchema,
} from './tasks.schema.js';

const router = Router();

router.use(authenticate);

router.use('/:taskId/comments', commentsRouter);

const READ_TASKS = [
  PERMISSIONS.TASK_READ_ALL,
  PERMISSIONS.TASK_READ_TEAM,
  PERMISSIONS.TASK_READ_OWN,
];

router.post(
  '/',
  requirePermission(PERMISSIONS.TASK_CREATE),
  validate(createTaskSchema),
  asyncHandler(async (req, res) => created(res, { task: await tasksService.create(req.user, req.body) }))
);

router.get(
  '/',
  requirePermission(...READ_TASKS),
  validate(listTasksQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { items, meta } = await tasksService.list(req.user, req.validated.query);
    ok(res, { tasks: items }, { meta });
  })
);

router.get(
  '/:id',
  requirePermission(...READ_TASKS),
  asyncHandler(async (req, res) => ok(res, { task: await tasksService.getById(req.user, req.params.id) }))
);

router.patch(
  '/:id',
  requirePermission(PERMISSIONS.TASK_UPDATE_ANY),
  validate(updateTaskSchema),
  asyncHandler(async (req, res) =>
    ok(res, { task: await tasksService.update(req.user, req.params.id, req.body) })
  )
);

router.patch(
  '/:id/assign',
  requirePermission(PERMISSIONS.TASK_ASSIGN),
  validate(assignTaskSchema),
  asyncHandler(async (req, res) =>
    ok(res, { task: await tasksService.assign(req.user, req.params.id, req.body.assigneeId) })
  )
);

router.patch(
  '/:id/status',
  requirePermission(PERMISSIONS.TASK_UPDATE_ANY, PERMISSIONS.TASK_UPDATE_OWN),
  validate(changeStatusSchema),
  asyncHandler(async (req, res) =>
    ok(res, { task: await tasksService.changeStatus(req.user, req.params.id, req.body.status) })
  )
);

router.delete(
  '/:id',
  requirePermission(PERMISSIONS.TASK_DELETE),
  asyncHandler(async (req, res) => ok(res, await tasksService.remove(req.user, req.params.id)))
);

export default router;
