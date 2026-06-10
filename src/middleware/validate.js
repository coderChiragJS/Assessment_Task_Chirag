import { ApiError } from '../lib/http.js';

export const validate =
  (schema, part = 'body') =>
  (req, _res, next) => {
    const result = schema.safeParse(req[part]);
    if (!result.success) {
      const details = result.error.issues.map((i) => ({
        field: i.path.join('.') || part,
        message: i.message,
      }));
      return next(ApiError.unprocessable('Validation failed', details));
    }

    if (part === 'body') req.body = result.data;
    else req.validated = { ...(req.validated || {}), [part]: result.data };
    next();
  };
