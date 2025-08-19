// shared/serviceClient.js
// HTTP client for inter-service communication

const axios = require('axios');

class ServiceClient {
  constructor(baseURL, serviceName = 'unknown') {
    this.client = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Name': serviceName
      }
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        config.headers['X-Request-ID'] = require('uuid').v4();
        config.headers['X-Timestamp'] = new Date().toISOString();
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error(`Service call failed: ${error.config?.url}`, {
          status: error.response?.status,
          message: error.message,
          service: serviceName
        });
        return Promise.reject(error);
      }
    );
  }

  async get(endpoint, params = {}) {
    const response = await this.client.get(endpoint, { params });
    return response.data;
  }

  async post(endpoint, data = {}) {
    const response = await this.client.post(endpoint, data);
    return response.data;
  }

  async put(endpoint, data = {}) {
    const response = await this.client.put(endpoint, data);
    return response.data;
  }

  async delete(endpoint) {
    const response = await this.client.delete(endpoint);
    return response.data;
  }
}

// Service registry for all internal services
const ServiceRegistry = {
  AUTH: process.env.AUTH_SERVICE_URL || 'http://auth-service:3001',
  CRM: process.env.CRM_SERVICE_URL || 'http://crm-service:3003',
  INVOICES: process.env.INVOICES_SERVICE_URL || 'http://invoices-service:3002',
  PROJECTS: process.env.PROJECTS_SERVICE_URL || 'http://project-management-service:3004',
  ACCOUNTING: process.env.ACCOUNTING_SERVICE_URL || 'http://accounting-service:3005',
  INVENTORY: process.env.INVENTORY_SERVICE_URL || 'http://inventory-service:3007',
  WAREHOUSE: process.env.WAREHOUSE_SERVICE_URL || 'http://warehouse-service:3008',
  SUPPLY_CHAIN: process.env.SUPPLY_CHAIN_SERVICE_URL || 'http://supply-chain-service:3006',
  TMS: process.env.TMS_SERVICE_URL || 'http://tms-service:3009',
  LMS: process.env.LMS_SERVICE_URL || 'http://lms-service:3010'
};

// Pre-configured service clients
const Services = {
  auth: new ServiceClient(ServiceRegistry.AUTH, 'auth-client'),
  crm: new ServiceClient(ServiceRegistry.CRM, 'crm-client'),
  invoices: new ServiceClient(ServiceRegistry.INVOICES, 'invoices-client'),
  projects: new ServiceClient(ServiceRegistry.PROJECTS, 'projects-client'),
  accounting: new ServiceClient(ServiceRegistry.ACCOUNTING, 'accounting-client'),
  inventory: new ServiceClient(ServiceRegistry.INVENTORY, 'inventory-client'),
  warehouse: new ServiceClient(ServiceRegistry.WAREHOUSE, 'warehouse-client'),
  supplyChain: new ServiceClient(ServiceRegistry.SUPPLY_CHAIN, 'supply-chain-client'),
  tms: new ServiceClient(ServiceRegistry.TMS, 'tms-client'),
  lms: new ServiceClient(ServiceRegistry.LMS, 'lms-client')
};

module.exports = { ServiceClient, ServiceRegistry, Services };

// shared/middleware/auth.js
// Authentication middleware for service-to-service calls

const jwt = require('jsonwebtoken');
const { Services } = require('../serviceClient');

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Verify token with auth service
    const user = await Services.auth.post('/verify-token', { token });
    
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Service-to-service authentication
const serviceAuthMiddleware = (req, res, next) => {
  const serviceName = req.headers['x-service-name'];
  const allowedServices = [
    'auth-service', 'crm-service', 'invoices-service', 
    'project-management-service', 'accounting-service',
    'inventory-service', 'warehouse-service', 'supply-chain-service',
    'tms-service', 'lms-service'
  ];

  if (!serviceName || !allowedServices.includes(serviceName)) {
    return res.status(403).json({ error: 'Unauthorized service' });
  }

  req.callingService = serviceName;
  next();
};

module.exports = { authMiddleware, serviceAuthMiddleware };

// shared/database.js  
// Database connection utilities

const { Pool } = require('pg');
const Redis = require('ioredis');

class DatabaseManager {
  constructor() {
    this.pg = null;
    this.redis = null;
  }

  async connectPostgres() {
    this.pg = new Pool({
      host: process.env.DB_HOST || 'postgres',
      port: process.env.DB_PORT || 5432,
      database: process.env.POSTGRES_DB || 'moukawalati_database',
      user: process.env.POSTGRES_USER || 'moukawalati_user',
      password: process.env.POSTGRES_PASSWORD,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Test connection
    await this.pg.query('SELECT NOW()');
    console.log('Connected to PostgreSQL');
  }

  async connectRedis() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'redis',
      port: process.env.REDIS_PORT || 6379,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
    });

    this.redis.on('connect', () => {
      console.log('Connected to Redis');
    });

    this.redis.on('error', (err) => {
      console.error('Redis error:', err);
    });
  }

  async query(text, params) {
    return await this.pg.query(text, params);
  }

  async transaction(callback) {
    const client = await this.pg.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async cache(key, value, ttl = 3600) {
    await this.redis.setex(key, ttl, JSON.stringify(value));
  }

  async getCache(key) {
    const value = await this.redis.get(key);
    return value ? JSON.parse(value) : null;
  }

  async clearCache(pattern) {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  async close() {
    if (this.pg) await this.pg.end();
    if (this.redis) await this.redis.disconnect();
  }
}

module.exports = { DatabaseManager };