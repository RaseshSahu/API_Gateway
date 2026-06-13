'use strict';

const { RATE_LIMIT } = require('../config');

/**
 * In-memory store: { [ip]: { count: number, resetAt: number } }
 * No external library — just a plain object reset on an interval.
 */
const requestCounts = {};

// Reset all counters every WINDOW_MS milliseconds
setInterval(() => {
  const now = Date.now();
  for (const ip of Object.keys(requestCounts)) {
    if (requestCounts[ip].resetAt <= now) {
      delete requestCounts[ip];
    }
  }
}, RATE_LIMIT.WINDOW_MS);

/**
 * rateLimiter middleware
 * Runs before auth. Tracks requests per IP within the current window.
 * Responds 429 if the client exceeds MAX_REQUESTS.
 */
function rateLimiter(req, res, next) {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();

  if (!requestCounts[ip]) {
    requestCounts[ip] = {
      count: 0,
      resetAt: now + RATE_LIMIT.WINDOW_MS,
    };
  }

  requestCounts[ip].count += 1;

  const { count, resetAt } = requestCounts[ip];
  const secondsUntilReset = Math.ceil((resetAt - now) / 1000);

  // Expose rate-limit info via headers (good practice)
  res.set('X-RateLimit-Limit', RATE_LIMIT.MAX_REQUESTS);
  res.set('X-RateLimit-Remaining', Math.max(0, RATE_LIMIT.MAX_REQUESTS - count));
  res.set('X-RateLimit-Reset', secondsUntilReset);

  if (count > RATE_LIMIT.MAX_REQUESTS) {
    // Logger will still fire because we attach status before returning
    res.locals.routedTo = 'gateway (rate-limited)';
    return res
      .status(429)
      .json({
        error: 'Too Many Requests',
        message: `Rate limit of ${RATE_LIMIT.MAX_REQUESTS} requests per minute exceeded. Try again in ${secondsUntilReset}s.`,
        retryAfter: secondsUntilReset,
      });
  }

  next();
}

module.exports = rateLimiter;
