/**
 * Task CRUD routes with pagination, search, and filtering.
 * All routes are protected by authentication.
 */

const express = require('express');
const { body, query, param, validationResult } = require('express-validator');
const store = require('../data/store');
const { requireAuth } = require('../middleware/auth');
const { sanitizeObject } = require('../utils/sanitize');

const router = express.Router();

// All task routes require authentication
router.use(requireAuth);

// ─── Validation rules ───────────────────────────────────────────────────────────
const taskValidation = [
  body('title').trim().notEmpty().withMessage('Título é obrigatório.')
    .isLength({ min: 2, max: 200 }).withMessage('Título deve ter entre 2 e 200 caracteres.'),
  body('description').optional().trim().isLength({ max: 1000 }).withMessage('Descrição não pode exceder 1000 caracteres.'),
  body('status').optional().isIn(['pending', 'in_progress', 'completed']).withMessage('Status inválido.'),
  body('priority').optional().isIn(['low', 'medium', 'high']).withMessage('Prioridade inválida.'),
];

const taskUpdateValidation = [
  body('title').optional().trim().isLength({ min: 2, max: 200 }).withMessage('Título deve ter entre 2 e 200 caracteres.'),
  body('description').optional().trim().isLength({ max: 1000 }).withMessage('Descrição não pode exceder 1000 caracteres.'),
  body('status').optional().isIn(['pending', 'in_progress', 'completed']).withMessage('Status inválido.'),
  body('priority').optional().isIn(['low', 'medium', 'high']).withMessage('Prioridade inválida.'),
];

// ─── GET /api/tasks - List tasks with pagination, search, and filter ────────────
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Página deve ser um número positivo.'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limite deve estar entre 1 e 100.'),
  query('status').optional().isIn(['pending', 'in_progress', 'completed', '']).withMessage('Status inválido.'),
  query('priority').optional().isIn(['low', 'medium', 'high', '']).withMessage('Prioridade inválida.'),
  query('search').optional().trim(),
  query('sortBy').optional().isIn(['createdAt', 'title', 'status', 'priority', 'updatedAt']),
  query('sortOrder').optional().isIn(['asc', 'desc']),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  const { page = 1, limit = 10, status, priority, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

  // Build filters - only show tasks belonging to this user
  const filters = { userId: req.user.id };
  if (status) filters.status = status;
  if (priority) filters.priority = priority;

  // Get paginated results
  let result = store.getPaginated('tasks', {
    page: parseInt(page),
    limit: parseInt(limit),
    filters,
    sortBy,
    sortOrder,
  });

  // Apply search filter on title/description (post-filter for in-memory store)
  if (search) {
    const searchLower = search.toLowerCase();
    const allFiltered = store.getAll('tasks', filters).filter(
      (t) => t.title.toLowerCase().includes(searchLower) || (t.description && t.description.toLowerCase().includes(searchLower))
    );
    const total = allFiltered.length;
    const totalPages = Math.ceil(total / parseInt(limit));
    const start = (parseInt(page) - 1) * parseInt(limit);
    result = {
      items: allFiltered.slice(start, start + parseInt(limit)),
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages,
    };
  }

  // Remove userId from response items
  result.items = result.items.map(({ userId, ...task }) => task);

  res.json(result);
});

// ─── GET /api/tasks/stats - Task statistics ─────────────────────────────────────
router.get('/stats', (req, res) => {
  const tasks = store.getAll('tasks', { userId: req.user.id });
  const stats = {
    total: tasks.length,
    pending: tasks.filter((t) => t.status === 'pending').length,
    in_progress: tasks.filter((t) => t.status === 'in_progress').length,
    completed: tasks.filter((t) => t.status === 'completed').length,
    high_priority: tasks.filter((t) => t.priority === 'high').length,
    medium_priority: tasks.filter((t) => t.priority === 'medium').length,
    low_priority: tasks.filter((t) => t.priority === 'low').length,
  };
  res.json(stats);
});

// ─── GET /api/tasks/:id ─────────────────────────────────────────────────────────
router.get('/:id', [
  param('id').isUUID().withMessage('ID de tarefa inválido.'),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  const task = store.findById('tasks', req.params.id);
  if (!task || task.userId !== req.user.id) {
    return res.status(404).json({ error: 'Tarefa não encontrada.' });
  }

  const { userId, ...taskData } = task;
  res.json(taskData);
});

// ─── POST /api/tasks ────────────────────────────────────────────────────────────
router.post('/', taskValidation, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg, errors: errors.array() });
  }

  const sanitized = sanitizeObject(req.body);
  const task = store.create('tasks', {
    title: sanitized.title,
    description: sanitized.description || '',
    status: sanitized.status || 'pending',
    priority: sanitized.priority || 'medium',
    userId: req.user.id,
  });

  const { userId, ...taskData } = task;
  res.status(201).json({ message: 'Tarefa criada com sucesso!', task: taskData });
});

// ─── PUT /api/tasks/:id ─────────────────────────────────────────────────────────
router.put('/:id', [
  param('id').isUUID().withMessage('ID de tarefa inválido.'),
  ...taskUpdateValidation,
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg, errors: errors.array() });
  }

  const existing = store.findById('tasks', req.params.id);
  if (!existing || existing.userId !== req.user.id) {
    return res.status(404).json({ error: 'Tarefa não encontrada.' });
  }

  const sanitized = sanitizeObject(req.body);
  const updateData = {};
  if (sanitized.title !== undefined) updateData.title = sanitized.title;
  if (sanitized.description !== undefined) updateData.description = sanitized.description;
  if (sanitized.status !== undefined) updateData.status = sanitized.status;
  if (sanitized.priority !== undefined) updateData.priority = sanitized.priority;

  const updated = store.update('tasks', req.params.id, updateData);
  const { userId, ...taskData } = updated;
  res.json({ message: 'Tarefa atualizada com sucesso!', task: taskData });
});

// ─── DELETE /api/tasks/:id ──────────────────────────────────────────────────────
router.delete('/:id', [
  param('id').isUUID().withMessage('ID de tarefa inválido.'),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  const existing = store.findById('tasks', req.params.id);
  if (!existing || existing.userId !== req.user.id) {
    return res.status(404).json({ error: 'Tarefa não encontrada.' });
  }

  store.remove('tasks', req.params.id);
  res.json({ message: 'Tarefa eliminada com sucesso!' });
});

module.exports = router;
