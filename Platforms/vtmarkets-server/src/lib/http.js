'use strict';

/** Small helpers for consistent JSON responses and async error handling. */

class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const badRequest   = (msg, details) => new ApiError(400, 'bad_request', msg, details);
const unauthorized = (msg = 'Unauthorized') => new ApiError(401, 'unauthorized', msg);
const forbidden    = (msg = 'Forbidden') => new ApiError(403, 'forbidden', msg);
const notFound     = (msg = 'Not found') => new ApiError(404, 'not_found', msg);
const conflict     = (msg, details) => new ApiError(409, 'conflict', msg, details);

/** Wrap an async route so thrown errors reach the error middleware. */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = {
  ApiError,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  asyncHandler,
};
