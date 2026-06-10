import { ApiError } from '../lib/http.js';
import { roleHasPermission } from '../config/rbac.js';

export function requirePermission(...permissions) {
  return (req, _res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    const allowed = permissions.some((p) => roleHasPermission(req.user.role, p));
    if (!allowed) {
      return next(ApiError.forbidden('You do not have permission'));
    }
    next();
  };
}
