'use strict';

const express = require('express');

const app  = express();
const PORT = 3003;

app.use(express.json());

const orders = [
  { id: 1, userId: 2, productId: 1, quantity: 2, status: 'delivered', total: 99.98  },
  { id: 2, userId: 2, productId: 3, quantity: 1, status: 'shipped',   total: 39.99  },
  { id: 3, userId: 3, productId: 2, quantity: 3, status: 'pending',   total: 89.97  },
];

// GET /orders — list orders, optional ?userId= filter
app.get('/orders', (req, res) => {
  const { userId } = req.query;
  const result = userId
    ? orders.filter(o => o.userId === parseInt(userId, 10))
    : orders;
  res.json({ service: 'order-service', data: result, total: result.length });
});

// GET /orders/:id
app.get('/orders/:id', (req, res) => {
  const order = orders.find(o => o.id === parseInt(req.params.id, 10));
  if (!order) {
    return res.status(404).json({ service: 'order-service', error: 'Order not found' });
  }
  res.json({ service: 'order-service', data: order });
});

// POST /orders — place a new order
app.post('/orders', (req, res) => {
  const { userId, productId, quantity } = req.body || {};
  if (!userId || !productId || !quantity) {
    return res.status(400).json({
      service: 'order-service',
      error: 'userId, productId, and quantity are required',
    });
  }
  // Dummy price calculation — in real life you'd call the product service
  const pricePerUnit = 25.00;
  const newOrder = {
    id: orders.length + 1,
    userId,
    productId,
    quantity,
    status: 'pending',
    total: parseFloat((pricePerUnit * quantity).toFixed(2)),
  };
  orders.push(newOrder);
  res.status(201).json({ service: 'order-service', data: newOrder });
});

// PATCH /orders/:id/status — update order status
app.patch('/orders/:id/status', (req, res) => {
  const order = orders.find(o => o.id === parseInt(req.params.id, 10));
  if (!order) {
    return res.status(404).json({ service: 'order-service', error: 'Order not found' });
  }
  const { status } = req.body || {};
  const valid = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
  if (!valid.includes(status)) {
    return res.status(400).json({ service: 'order-service', error: `status must be one of: ${valid.join(', ')}` });
  }
  order.status = status;
  res.json({ service: 'order-service', data: order });
});

app.listen(PORT, () =>
  console.log(`[order-service] Listening on http://localhost:${PORT}`)
);
