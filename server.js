/**
 * Task Manager Pro - Main Server
 * A modern task management application with authentication,
 * search/filter, pagination, and notification support.
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');
const { getStatus } = require('./services/ping');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Security Middleware ────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:"],
    },
  },
}));

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'Demasiados pedidos. Tente novamente mais tarde.' },
});
app.use('/api/', limiter);

// Stricter rate limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Demasiadas tentativas de autenticação. Tente novamente em 15 minutos.' },
});
app.use('/api/auth/', authLimiter);

// ─── Body Parsing ───────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false }));

// ─── Static Files ───────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ─── API Routes ─────────────────────────────────────────────────────────────────
app.get('/api/ping', (req, res) => res.json(getStatus()));
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);

// ─── SPA fallback - serve index.html for non-API routes ─────────────────────────
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── Error Handling ─────────────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ─── Start Server ───────────────────────────────────────────────────────────────
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n🚀 Task Manager Pro a correr em http://localhost:${PORT}`);
    console.log(`📡 API disponível em http://localhost:${PORT}/api`);
    console.log(`❤️  Health check: http://localhost:${PORT}/api/ping\n`);
  });
}

module.exports = app;
