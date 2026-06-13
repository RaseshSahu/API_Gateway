'use strict';

const express = require('express');

const app  = express();
const PORT = 3002;

app.use(express.json());

const products = [
  { id: 1, name: 'Wireless Keyboard', price: 49.99,  stock: 120, category: 'Electronics' },
  { id: 2, name: 'USB-C Hub',         price: 29.99,  stock: 250, category: 'Electronics' },
  { id: 3, name: 'Standing Desk Mat', price: 39.99,  stock: 80,  category: 'Office'      },
  { id: 4, name: 'Laptop Stand',      price: 24.99,  stock: 60,  category: 'Office'      },
];

// GET /products — list products, optional ?category= filter
app.get('/products', (req, res) => {
  const { category } = req.query;
  const result = category
    ? products.filter(p => p.category.toLowerCase() === category.toLowerCase())
    : products;
  res.json({ service: 'product-service', data: result, total: result.length });
});

// GET /products/:id
app.get('/products/:id', (req, res) => {
  const product = products.find(p => p.id === parseInt(req.params.id, 10));
  if (!product) {
    return res.status(404).json({ service: 'product-service', error: 'Product not found' });
  }
  res.json({ service: 'product-service', data: product });
});

// POST /products — add a product
app.post('/products', (req, res) => {
  const { name, price, stock, category } = req.body || {};
  if (!name || price == null) {
    return res.status(400).json({
      service: 'product-service',
      error: 'name and price are required',
    });
  }
  const newProduct = { id: products.length + 1, name, price, stock: stock || 0, category: category || 'Uncategorised' };
  products.push(newProduct);
  res.status(201).json({ service: 'product-service', data: newProduct });
});

app.listen(PORT, () =>
  console.log(`[product-service] Listening on http://localhost:${PORT}`)
);
