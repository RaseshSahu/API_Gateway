'use strict';

const express = require('express');
const jwt = require('jsonwebtoken');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config');

const router = express.Router();

// Hardcoded test credentials — replace with a real user store in production
const USERS = {
  admin: { password: 'admin123', role: 'admin', sub: 1 },
  alice:  { password: 'alice123', role: 'user',  sub: 2 },
};

/**
 * POST /login
 * Public route — no auth required.
 * Body: { "username": "admin", "password": "admin123" }
 * Returns a signed JWT valid for JWT_EXPIRES_IN.
 */
router.post('/login', (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Body must include "username" and "password".',
    });
  }

  const user = USERS[username];

  if (!user || user.password !== password) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid credentials.',
    });
  }

  const payload = {
    sub: user.sub,
    username,
    role: user.role,
  };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

  res.locals.routedTo = 'gateway (login)';

  return res.status(200).json({
    message: 'Login successful',
    token,
    expiresIn: JWT_EXPIRES_IN,
  });
});

/**
 * GET /health
 * Public liveness probe — useful for load-balancer health checks.
 */
router.get('/health', (req, res) => {
  res.locals.routedTo = 'gateway (health)';
  return res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

module.exports = router;
