'use strict';

const jwt = require('jsonwebtoken');
const { JWT_SECRET, PUBLIC_ROUTES } = require('../config');

/**
 * authenticate middleware
 * Checks for a valid Bearer JWT on every request that is not in PUBLIC_ROUTES.
 * Attaches the decoded payload to req.user so downstream handlers can use it.
 */
function authenticate(req, res, next) {
  // Allow public routes to pass through without a token
  if (PUBLIC_ROUTES.includes(req.path)) {
    return next();
  }

  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.locals.routedTo = 'gateway (unauthorized)';
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing or malformed Authorization header. Expected: Bearer <token>',
    });
  }

  const token = authHeader.slice(7); // strip "Bearer "

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // attach claims for use in route handlers
    next();
  } catch (err) {
    res.locals.routedTo = 'gateway (unauthorized)';

    const message =
      err.name === 'TokenExpiredError'
        ? 'Token has expired. Please log in again.'
        : 'Invalid token. Authentication failed.';

    return res.status(401).json({
      error: 'Unauthorized',
      message,
    });
  }
}

module.exports = authenticate;
