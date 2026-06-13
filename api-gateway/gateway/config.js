'use strict';

module.exports = {
  PORT: 3000,

  JWT_SECRET: 'super-secret-gateway-key-change-in-production',
  JWT_EXPIRES_IN: '1h',

  // Routes exempt from JWT authentication
  PUBLIC_ROUTES: ['/login', '/health'],

  // Downstream service registry
  SERVICES: {
    users: {
      prefix: '/users',
      target: 'http://localhost:3001',
      name: 'user-service',
    },
    products: {
      prefix: '/products',
      target: 'http://localhost:3002',
      name: 'product-service',
    },
    orders: {
      prefix: '/orders',
      target: 'http://localhost:3003',
      name: 'order-service',
    },
  },

  RATE_LIMIT: {
    MAX_REQUESTS: 10,
    WINDOW_MS: 60 * 1000, // 1 minute
  },
};
