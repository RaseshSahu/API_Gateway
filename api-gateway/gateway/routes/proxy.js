'use strict';

const axios = require('axios');
const { SERVICES } = require('../config');

/**
 * Build a sorted list of [prefix, serviceConfig] pairs, longest prefix first.
 * This ensures /orders/items doesn't accidentally match /orders if a longer
 * prefix were ever registered.
 */
const serviceRoutes = Object.values(SERVICES).sort(
  (a, b) => b.prefix.length - a.prefix.length
);

/**
 * resolveService
 * Returns the matching service config for a given path, or null.
 */
function resolveService(path) {
  for (const svc of serviceRoutes) {
    if (path === svc.prefix || path.startsWith(svc.prefix + '/')) {
      return svc;
    }
  }
  return null;
}

/**
 * proxyRequest
 * Forwards the incoming Express request to the resolved downstream service
 * using axios. Pipes headers, method, body, and query string through.
 *
 * On network/timeout errors → 502 Bad Gateway
 * On downstream 4xx/5xx    → forward the status + a sanitised message
 */
async function proxyRequest(req, res) {
  const service = resolveService(req.path);

  if (!service) {
    res.locals.routedTo = 'gateway (no match)';
    return res.status(404).json({
      error: 'Not Found',
      message: `No service is registered for path: ${req.path}`,
    });
  }

  res.locals.routedTo = service.name;

  const targetUrl = `${service.target}${req.path}`;

  // Forward safe headers; strip hop-by-hop headers
  const forwardHeaders = { ...req.headers };
  delete forwardHeaders['host'];
  delete forwardHeaders['connection'];
  delete forwardHeaders['transfer-encoding'];

  // Attach gateway-added headers
  forwardHeaders['x-forwarded-for'] = req.ip || req.socket.remoteAddress;
  forwardHeaders['x-gateway-request-id'] = generateRequestId();
  if (req.user) {
    forwardHeaders['x-user-id'] = String(req.user.sub || '');
    forwardHeaders['x-user-role'] = String(req.user.role || '');
  }

  try {
    const response = await axios({
      method: req.method,
      url: targetUrl,
      params: req.query,
      data: req.body,
      headers: forwardHeaders,
      // Don't let axios throw on non-2xx so we can forward downstream errors cleanly
      validateStatus: () => true,
      timeout: 10_000,
    });

    // Copy response headers back to the client (skip hop-by-hop)
    const skipHeaders = new Set(['transfer-encoding', 'connection', 'keep-alive']);
    for (const [key, value] of Object.entries(response.headers)) {
      if (!skipHeaders.has(key.toLowerCase())) {
        res.set(key, value);
      }
    }

    res.status(response.status).json(response.data);
  } catch (err) {
    // Network-level error (ECONNREFUSED, timeout, DNS, etc.)
    console.error(`[Gateway] Failed to reach ${service.name}:`, err.message);
    return res.status(502).json({
      error: 'Bad Gateway',
      message: `The ${service.name} is currently unavailable. Please try again later.`,
    });
  }
}

function generateRequestId() {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

module.exports = { proxyRequest, resolveService };
