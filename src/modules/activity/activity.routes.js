import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';
import { asyncHandler, ok, ApiError } from '../../lib/http.js';
import { encodeCursor, decodeCursor } from '../../lib/pagination.js';
import { PERMISSIONS, ROLES } from '../../config/rbac.js';
import { ENTITY } from '../../config/constants.js';
import { activityRepo } from '../../repositories/activity.repo.js';
import { tasksService } from '../tasks/tasks.service.js';

const router = Router();
router.use(authenticate);

router.get(
  '/me',
  requirePermission(PERMISSIONS.ACTIVITY_READ_OWN),
  asyncHandler(async (req, res) => {
    const { items, lastKey } = await activityRepo.listByActor(req.user.id, {
      cursor: decodeCursor(req.query.cursor),
    });
    ok(res, { activity: items }, { meta: { nextCursor: encodeCursor(lastKey) } });
  })
);

router.get(
  '/task/:taskId',
  asyncHandler(async (req, res) => {
    await tasksService.getById(req.user, req.params.taskId);
    const { items, lastKey } = await activityRepo.listByEntity(ENTITY.TASK, req.params.taskId, {
      cursor: decodeCursor(req.query.cursor),
    });
    ok(res, { activity: items }, { meta: { nextCursor: encodeCursor(lastKey) } });
  })
);

router.get(
  '/user/:userId',
  requirePermission(PERMISSIONS.ACTIVITY_READ_ALL),
  asyncHandler(async (req, res) => {
    if (req.user.role !== ROLES.ADMIN) throw ApiError.forbidden();
    const { items, lastKey } = await activityRepo.listByActor(req.params.userId, {
      cursor: decodeCursor(req.query.cursor),
    });
    ok(res, { activity: items }, { meta: { nextCursor: encodeCursor(lastKey) } });
  })
);

export default router;
