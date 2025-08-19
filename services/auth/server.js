const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { DatabaseManager } = require('../../shared/database');
const { MessageBroker, EventTypes } = require('../../shared/messagePatterns');

const app = express();
const PORT = process.env.PORT || 3001;
const db = new DatabaseManager();
const messageBroker = new MessageBroker();

app.use(express.json());

// Initialize connections
async function init() {
  await db.connectPostgres();
  await db.connectRedis();
  await messageBroker.connect();
}

// Routes
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const result = await db.query(
      'SELECT * FROM auth_service.users WHERE email = $1 AND status = $2',
      [email, 'active']
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = result.rows[0];
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Generate JWT
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );
    
    // Update last login
    await db.query(
      'UPDATE auth_service.users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );
    
    // Publish login event
    await messageBroker.publishEvent('erp.events', EventTypes.USER_LOGIN, {
      userId: user.id,
      email: user.email,
      timestamp: new Date()
    });
    
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: `${user.first_name} ${user.last_name}`,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/verify-token', async (req, res) => {
  try {
    const { token } = req.body;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user still exists and is active
    const result = await db.query(
      'SELECT id, email, role, first_name, last_name FROM auth_service.users WHERE id = $1 AND status = $2',
      [decoded.userId, 'active']
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'auth-service' });
});

init().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Auth service running on port ${PORT}`);
  });
});
