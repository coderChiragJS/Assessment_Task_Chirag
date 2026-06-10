import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/auth.js';
import { asyncHandler, ok, created } from '../../lib/http.js';
import { authService } from './auth.service.js';
import { signupSchema, loginSchema, refreshSchema } from './auth.schema.js';

const router = Router();

router.post(
  '/signup',
  validate(signupSchema),
  asyncHandler(async (req, res) => created(res, await authService.signup(req.body)))
);

router.post(
  '/login',
  validate(loginSchema),
  asyncHandler(async (req, res) => ok(res, await authService.login(req.body)))
);

router.post(
  '/refresh',
  validate(refreshSchema),
  asyncHandler(async (req, res) => ok(res, await authService.refresh(req.body)))
);

router.post(
  '/logout',
  validate(refreshSchema),
  asyncHandler(async (req, res) => ok(res, await authService.logout(req.body)))
);

router.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => ok(res, { user: req.user }))
);

export default router;
