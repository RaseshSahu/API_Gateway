# API Gateway — Built from Scratch with Node.js & Express

A fully hand-rolled API Gateway demonstrating how gateway logic works under the hood. No proxy middleware, no rate-limit libraries, no auth frameworks — every piece is implemented manually.

---

## Architecture

```
Client
  │
  ▼
┌─────────────────────────────┐
│         Gateway :3000       │
│                             │
│  logger → rateLimiter →     │
│  authenticate → proxy       │
└──────────┬──────────────────┘
           │  routes by prefix
     ┌─────┼──────────┐
     ▼     ▼          ▼
  :3001  :3002      :3003
  users  products   orders
```

---

## Components

### Gateway (`gateway/`)

| File | Responsibility |
|---|---|
| `server.js` | Entry point — assembles the Express app and wires the middleware pipeline |
| `config.js` | Centralised configuration: ports, JWT secret, service registry, rate-limit settings |
| `middleware/logger.js` | Logs every request after the response finishes: timestamp, IP, method, path, routed-to, status |
| `middleware/rateLimiter.js` | Manual in-memory rate limiter — tracks request counts per IP, resets every 60 s, returns 429 above threshold |
| `middleware/authenticate.js` | Validates `Authorization: Bearer <token>` JWTs; skips public routes |
| `routes/auth.js` | `POST /login` (issues JWTs) and `GET /health` — both public, no token required |
| `routes/proxy.js` | Resolves the target service by URL prefix and forwards the request via `axios`; handles 502 on downstream failure |

### Mock Services (`services/`)

Each service is a minimal Express app with in-memory data. They exist only to give the gateway something real to route to.

| Service | Port | Routes |
|---|---|---|
| user-service | 3001 | `GET /users`, `GET /users/:id`, `POST /users` |
| product-service | 3002 | `GET /products`, `GET /products/:id`, `POST /products` |
| order-service | 3003 | `GET /orders`, `GET /orders/:id`, `POST /orders`, `PATCH /orders/:id/status` |

---

## Middleware Pipeline (in order)

```
Request
  │
  ├─► logger        — records start time; logs on response finish
  ├─► rateLimiter   — 10 req/min per IP; 429 if exceeded
  ├─► authRoutes    — /login and /health pass through here (no token needed)
  ├─► authenticate  — all other routes must carry a valid JWT
  └─► proxy         — resolve service, forward request, handle 502
```

---

## How to Run

### Prerequisites
- Node.js ≥ 18
- npm

### Install dependencies
```bash
npm install
```

### Option A — Start everything at once
```bash
node scripts/start-all.js
```

### Option B — Start each process in a separate terminal
```bash
# Terminal 1
node services/user-service/index.js

# Terminal 2
node services/product-service/index.js

# Terminal 3
node services/order-service/index.js

# Terminal 4
node gateway/server.js
```

---

## Example Requests

### 1. Log in and get a JWT token
```bash
curl -s -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | jq .
```

Expected response:
```json
{
  "message": "Login successful",
  "token": "<jwt>",
  "expiresIn": "1h"
}
```

> Store the token: `TOKEN=$(curl -s -X POST http://localhost:3000/login -H "Content-Type: application/json" -d '{"username":"admin","password":"admin123"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)`

---

### 2. Successful authenticated request
```bash
curl -s http://localhost:3000/users \
  -H "Authorization: Bearer $TOKEN" | jq .
```

```bash
curl -s http://localhost:3000/products \
  -H "Authorization: Bearer $TOKEN" | jq .
```

```bash
curl -s "http://localhost:3000/orders?userId=2" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

---

### 3. Rejected — missing or invalid token (401)
```bash
# No token at all
curl -s http://localhost:3000/users | jq .
```

```json
{
  "error": "Unauthorized",
  "message": "Missing or malformed Authorization header. Expected: Bearer <token>"
}
```

```bash
# Tampered token
curl -s http://localhost:3000/users \
  -H "Authorization: Bearer thisisnotavalidtoken" | jq .
```

```json
{
  "error": "Unauthorized",
  "message": "Invalid token. Authentication failed."
}
```

---

### 4. Rate limited (429)
Send more than 10 requests per minute from the same IP:
```bash
for i in {1..12}; do
  curl -s -o /dev/null -w "Request $i: %{http_code}\n" \
    http://localhost:3000/login \
    -X POST \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"admin123"}'
done
```

Requests 11 and 12 will receive:
```json
{
  "error": "Too Many Requests",
  "message": "Rate limit of 10 requests per minute exceeded. Try again in 42s.",
  "retryAfter": 42
}
```

---

### 5. Unmatched route (404)
```bash
curl -s http://localhost:3000/unknown \
  -H "Authorization: Bearer $TOKEN" | jq .
```

```json
{
  "error": "Not Found",
  "message": "No service is registered for path: /unknown"
}
```

---

### 6. Bad Gateway — service unreachable (502)
Stop a service, then try to route to it:
```bash
# (kill the user-service process, then:)
curl -s http://localhost:3000/users \
  -H "Authorization: Bearer $TOKEN" | jq .
```

```json
{
  "error": "Bad Gateway",
  "message": "The user-service is currently unavailable. Please try again later."
}
```

---

### 7. Health check (public, no token needed)
```bash
curl -s http://localhost:3000/health | jq .
```

---

## Configuration

All tunable values live in `gateway/config.js`:

| Setting | Default | Description |
|---|---|---|
| `PORT` | `3000` | Gateway listen port |
| `JWT_SECRET` | `super-secret-…` | **Change this in production** |
| `JWT_EXPIRES_IN` | `1h` | Token lifetime |
| `PUBLIC_ROUTES` | `['/login', '/health']` | Routes that skip JWT auth |
| `RATE_LIMIT.MAX_REQUESTS` | `10` | Requests allowed per window |
| `RATE_LIMIT.WINDOW_MS` | `60000` | Window size in milliseconds |

---

## Design Decisions

- **No proxy libraries** — `axios` is used directly with `validateStatus: () => true` so downstream errors are forwarded cleanly without axios throwing.
- **No rate-limit libraries** — a plain JS object keyed by IP, reset on a `setInterval`. Simple, zero-dependency, easy to swap for Redis in production.
- **No passport.js** — `jsonwebtoken` is called directly; middleware is a single small function.
- **Logging after response** — the `res.on('finish')` hook ensures the logged status code reflects the final value, including codes set by downstream services.
- **Gateway headers** — `x-forwarded-for`, `x-user-id`, and `x-user-role` are injected so services know who is calling without re-decoding the JWT.
