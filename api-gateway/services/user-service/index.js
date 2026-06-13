'use strict';

const express = require('express');

const app  = express();
const PORT = 3001;

app.use(express.json());

// In-memory data — no database needed
const users = [
  { id: 1, username: 'admin', name: 'Admin User',  email: 'admin@example.com', role: 'admin' },
  { id: 2, username: 'alice', name: 'Alice Smith',  email: 'alice@example.com', role: 'user'  },
  { id: 3, username: 'bob',   name: 'Bob Johnson',  email: 'bob@example.com',   role: 'user'  },
];

// GET /users — list all users
app.get('/users', (req, res) => {
  const requestedBy = req.headers['x-user-id'] || 'anonymous';
  console.log(`[user-service] GET /users — requested by user-id: ${requestedBy}`);
  res.json({ service: 'user-service', data: users });
});

// GET /users/:id — fetch a single user
app.get('/users/:id', (req, res) => {
  const user = users.find(u => u.id === parseInt(req.params.id, 10));
  if (!user) {
    return res.status(404).json({ service: 'user-service', error: 'User not found' });
  }
  res.json({ service: 'user-service', data: user });
});

// POST /users — create a user
app.post('/users', (req, res) => {
  const { username, name, email, role = 'user' } = req.body || {};
  if (!username || !name || !email) {
    return res.status(400).json({
      service: 'user-service',
      error: 'username, name, and email are required',
    });
  }
  const newUser = { id: users.length + 1, username, name, email, role };
  users.push(newUser);
  res.status(201).json({ service: 'user-service', data: newUser });
});

app.listen(PORT, () =>
  console.log(`[user-service] Listening on http://localhost:${PORT}`)
);
