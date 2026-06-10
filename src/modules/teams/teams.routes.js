import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler, ok, created } from '../../lib/http.js';
import { PERMISSIONS } from '../../config/rbac.js';
import { teamsService } from './teams.service.js';
import { createTeamSchema } from './teams.schema.js';

const router = Router();

router.use(authenticate);

router.post(
  '/',
  requirePermission(PERMISSIONS.TEAM_MANAGE),
  validate(createTeamSchema),
  asyncHandler(async (req, res) => created(res, { team: await teamsService.create(req.user, req.body) }))
);

router.get(
  '/',
  requirePermission(PERMISSIONS.TEAM_READ),
  asyncHandler(async (req, res) => ok(res, { teams: await teamsService.list() }))
);

router.get(
  '/:id',
  requirePermission(PERMISSIONS.TEAM_READ),
  asyncHandler(async (req, res) => ok(res, { team: await teamsService.getWithMembers(req.params.id) }))
);

export default router;
