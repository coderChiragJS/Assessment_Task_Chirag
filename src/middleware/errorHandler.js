import { ApiError } from '../lib/http.js';
import { isProd } from '../config/env.js';

export function errorHandler(err, _req, res, _next) {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      error: { message: err.message, ...(err.details ? { details: err.details } : {}) },
    });
  }

  console.error('Unhandled error:', err);
  return res.status(500).json({
    success: false,
    error: {
      message: 'Internal server error',
      ...(isProd ? {} : { debug: err.message }),
    },
  });
}

export function notFoundHandler(_req, res) {
  res.status(404).json({ success: false, error: { message: 'Route not found' } });
}
