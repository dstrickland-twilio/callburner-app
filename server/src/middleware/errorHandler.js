import logger from '../utils/logger.js';

/**
 * Standard error response format
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.name = 'AppError';
  }
}

/**
 * Express error handling middleware
 * Must be the last middleware added to the app
 */
export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';
  const details = err.details || null;

  // Log error with appropriate level
  if (statusCode >= 500) {
    logger.error({
      err,
      method: req.method,
      path: req.path,
      statusCode
    }, message);
  } else {
    logger.warn({
      method: req.method,
      path: req.path,
      statusCode,
      message
    }, 'Client error');
  }

  // Send standardized error response
  const response = {
    error: message
  };

  if (details) {
    response.details = details;
  }

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development' && err.stack) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

/**
 * Async handler wrapper to catch errors in async route handlers
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
