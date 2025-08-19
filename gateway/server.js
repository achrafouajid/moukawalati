const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'gateway', timestamp: new Date().toISOString() });
});

// Service routes
const services = {
  '/auth': 'http://auth-service:3001',
  '/invoices': 'http://invoices-service:3002',
  '/crm': 'http://crm-service:3003',
  '/projects': 'http://project-management-service:3004',
  '/accounting': 'http://accounting-service:3005',
  '/supply-chain': 'http://supply-chain-service:3006',
  '/inventory': 'http://inventory-service:3007',
  '/warehouse': 'http://warehouse-service:3008',
  '/tms': 'http://tms-service:3009',
  '/lms': 'http://lms-service:3010'
};

Object.keys(services).forEach(path => {
  app.use(path, createProxyMiddleware({
    target: services[path],
    changeOrigin: true,
    pathRewrite: { [`^${path}`]: '' }
  }));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Gateway running on port ${PORT}`);
});