'use strict';

const express = require('express');
const { PORT } = require('./config');

// Middleware
const logger       = require('./middleware/logger');
const rateLimiter  = require('./middleware/rateLimiter');
const authenticate = require('./middleware/authenticate');

// Route handlers
const authRoutes     = require('./routes/auth');
const { proxyRequest } = require('./routes/proxy');

const app = express();

// ─── Parse JSON bodies ────────────────────────────────────────────────────────
app.use(express.json());

// ─── Middleware pipeline (order matters) ─────────────────────────────────────
// 1. Logger  — wraps every request/response pair
app.use(logger);

// 2. Rate Limiter — reject abusive clients before doing any real work
app.use(rateLimiter);

// 3. Auth routes (public) — /login and /health skip JWT checks
app.use(authRoutes);

// 4. JWT Authentication — all routes beyond this point require a valid token
app.use(authenticate);

// 5. Proxy router — forward authenticated requests to downstream services
app.all('*', proxyRequest);

// ─── Global error handler ─────────────────────────────────────────────────────
// Catches any synchronous exceptions that bubble up from route handlers.
// Async errors in proxyRequest are caught internally; this is a safety net.
app.use((err, req, res, _next) => {
  console.error('[Gateway] Unhandled error:', err.message);
  res.locals.routedTo = res.locals.routedTo || 'gateway (error)';
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'An unexpected error occurred in the gateway.',
  });
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 API Gateway running on http://localhost:${PORT}`);
  console.log('   Middleware pipeline: logger → rateLimiter → auth → proxy\n');
});

module.exports = app; // exported for testing
