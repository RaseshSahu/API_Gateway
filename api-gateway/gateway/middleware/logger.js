'use strict';

/**
 * logger middleware
 * Logs every request after the response is finished so we can capture the
 * final status code (including codes set by downstream services).
 *
 * Fields logged:
 *   timestamp | client-ip | method | path | routed-to | status
 */
function logger(req, res, next) {
  const startedAt = Date.now();

  // Fire after the response is fully sent
  res.on('finish', () => {
    const duration = Date.now() - startedAt;
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const routedTo = res.locals.routedTo || 'unknown';
    const timestamp = new Date().toISOString();

    const statusCode = res.statusCode;
    const statusColor = colorForStatus(statusCode);

    console.log(
      `[${timestamp}] ${ip} ${req.method} ${req.path} → ${routedTo} | ` +
        `${statusColor}${statusCode}\x1b[0m (${duration}ms)`
    );
  });

  next();
}

/** ANSI color codes for quick visual scanning of logs */
function colorForStatus(code) {
  if (code >= 500) return '\x1b[31m'; // red
  if (code >= 400) return '\x1b[33m'; // yellow
  if (code >= 300) return '\x1b[36m'; // cyan
  return '\x1b[32m';                  // green
}

module.exports = logger;
