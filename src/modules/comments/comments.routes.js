import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler, ok, created } from '../../lib/http.js';
import { PERMISSIONS } from '../../config/rbac.js';
import { commentsService } from './comments.service.js';
import { createCommentSchema } from './comments.schema.js';

const router = Router({ mergeParams: true });

router.use(authenticate);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const result = await commentsService.list(req.user, req.params.taskId, {
      limit: 50,
      cursor: req.query.cursor,
    });
    ok(res, { comments: result.items }, { meta: { nextCursor: result.nextCursor } });
  })
);

router.post(
  '/',
  requirePermission(PERMISSIONS.COMMENT_CREATE),
  validate(createCommentSchema),
  asyncHandler(async (req, res) =>
    created(res, { comment: await commentsService.add(req.user, req.params.taskId, req.body.body) })
  )
);

export default router;
