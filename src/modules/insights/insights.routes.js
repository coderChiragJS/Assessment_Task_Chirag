import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';
import { asyncHandler, ok } from '../../lib/http.js';
import { PERMISSIONS } from '../../config/rbac.js';
import { insightsService } from './insights.service.js';

const router = Router();
router.use(authenticate);

router.get(
  '/bottlenecks',
  requirePermission(PERMISSIONS.ACTIVITY_READ_TEAM, PERMISSIONS.ACTIVITY_READ_ALL),
  asyncHandler(async (req, res) => ok(res, await insightsService.bottlenecks(req.user, req.query.teamId)))
);

export default router;
