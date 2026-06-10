import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';
import { asyncHandler, ok } from '../../lib/http.js';
import { PERMISSIONS } from '../../config/rbac.js';
import { dashboardService } from './dashboard.service.js';

const router = Router();
router.use(authenticate);

router.get(
  '/',
  requirePermission(PERMISSIONS.DASHBOARD_VIEW),
  asyncHandler(async (req, res) => ok(res, await dashboardService.forUser(req.user)))
);

export default router;
