import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler, ok, created } from '../../lib/http.js';
import { PERMISSIONS } from '../../config/rbac.js';
import { usersService } from './users.service.js';
import { createUserSchema, updateRoleSchema, assignTeamSchema } from './users.schema.js';

const router = Router();

router.use(authenticate);

router.post(
  '/',
  requirePermission(PERMISSIONS.USER_MANAGE),
  validate(createUserSchema),
  asyncHandler(async (req, res) => created(res, { user: await usersService.create(req.user, req.body) }))
);

router.get(
  '/',
  requirePermission(PERMISSIONS.USER_READ_ALL),
  asyncHandler(async (req, res) => ok(res, { users: await usersService.list() }))
);

router.get(
  '/:id',
  requirePermission(PERMISSIONS.USER_READ_ALL),
  asyncHandler(async (req, res) => ok(res, { user: await usersService.getById(req.params.id) }))
);

router.patch(
  '/:id/role',
  requirePermission(PERMISSIONS.USER_MANAGE),
  validate(updateRoleSchema),
  asyncHandler(async (req, res) =>
    ok(res, { user: await usersService.changeRole(req.user, req.params.id, req.body.role) })
  )
);

router.patch(
  '/:id/team',
  requirePermission(PERMISSIONS.USER_MANAGE),
  validate(assignTeamSchema),
  asyncHandler(async (req, res) =>
    ok(res, { user: await usersService.assignTeam(req.user, req.params.id, req.body.teamId) })
  )
);

export default router;
