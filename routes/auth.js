/**
 * Authentication routes: register, login, profile.
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const store = require('../data/store');
const { generateToken, requireAuth } = require('../middleware/auth');
const { sanitizeObject } = require('../utils/sanitize');

const router = express.Router();

// ─── Validation rules ───────────────────────────────────────────────────────────
const registerValidation = [
  body('name').trim().notEmpty().withMessage('Nome é obrigatório.').isLength({ min: 2, max: 100 }).withMessage('Nome deve ter entre 2 e 100 caracteres.'),
  body('email').trim().isEmail().withMessage('Email inválido.').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password deve ter pelo menos 6 caracteres.')
    .matches(/\d/).withMessage('Password deve conter pelo menos um número.')
    .matches(/[a-zA-Z]/).withMessage('Password deve conter pelo menos uma letra.'),
];

const loginValidation = [
  body('email').trim().isEmail().withMessage('Email inválido.').normalizeEmail(),
  body('password').notEmpty().withMessage('Password é obrigatória.'),
];

// ─── POST /api/auth/register ────────────────────────────────────────────────────
router.post('/register', registerValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg, errors: errors.array() });
  }

  const { name, email, password } = sanitizeObject(req.body);

  // Check if user already exists
  const existing = store.findOne('users', 'email', email);
  if (existing) {
    return res.status(409).json({ error: 'Este email já está registado.' });
  }

  // Hash password
  const salt = await bcrypt.genSalt(12);
  const hashedPassword = await bcrypt.hash(password, salt);

  // Create user
  const user = store.create('users', { name, email, password: hashedPassword });
  const token = generateToken(user);

  res.status(201).json({
    message: 'Conta criada com sucesso!',
    token,
    user: { id: user.id, name: user.name, email: user.email },
  });
});

// ─── POST /api/auth/login ───────────────────────────────────────────────────────
router.post('/login', loginValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg, errors: errors.array() });
  }

  const { email, password } = req.body;

  const user = store.findOne('users', 'email', email);
  if (!user) {
    return res.status(401).json({ error: 'Credenciais inválidas.' });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(401).json({ error: 'Credenciais inválidas.' });
  }

  const token = generateToken(user);

  res.json({
    message: 'Login efetuado com sucesso!',
    token,
    user: { id: user.id, name: user.name, email: user.email },
  });
});

// ─── GET /api/auth/me ───────────────────────────────────────────────────────────
router.get('/me', requireAuth, (req, res) => {
  const user = store.findById('users', req.user.id);
  if (!user) return res.status(404).json({ error: 'Utilizador não encontrado.' });
  res.json({ user: { id: user.id, name: user.name, email: user.email } });
});

module.exports = router;
