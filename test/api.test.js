const request = require('supertest');
const app = require('../server');
const store = require('../data/store');

describe('API Endpoints', () => {
  let token;
  let taskId;

  beforeAll(async () => {
    store.clearAll();
    // Register a user
    const res = await request(app).post('/api/auth/register').send({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password1',
    });
    token = res.body.token;
  });

  afterAll(() => {
    store.clearAll();
  });

  // ── Ping ──────────────────────────────────────────────
  describe('GET /api/ping', () => {
    it('should return server status', async () => {
      const res = await request(app).get('/api/ping');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });

  // ── Auth ──────────────────────────────────────────────
  describe('Auth', () => {
    it('should not register with invalid email', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: 'Bad', email: 'notemail', password: 'password1',
      });
      expect(res.status).toBe(400);
    });

    it('should not register with short password', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: 'Bad', email: 'new@test.com', password: '12',
      });
      expect(res.status).toBe(400);
    });

    it('should not register duplicate email', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: 'Dup', email: 'test@example.com', password: 'password1',
      });
      expect(res.status).toBe(409);
    });

    it('should login with valid credentials', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'test@example.com', password: 'password1',
      });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
    });

    it('should not login with wrong password', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'test@example.com', password: 'wrong',
      });
      expect(res.status).toBe(401);
    });

    it('should get user profile with valid token', async () => {
      const res = await request(app).get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe('test@example.com');
    });

    it('should reject requests without token', async () => {
      const res = await request(app).get('/api/tasks');
      expect(res.status).toBe(401);
    });
  });

  // ── Tasks CRUD ────────────────────────────────────────
  describe('Tasks', () => {
    it('should create a task', async () => {
      const res = await request(app).post('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'My first task', description: 'A description', priority: 'high' });
      expect(res.status).toBe(201);
      expect(res.body.task.title).toBe('My first task');
      taskId = res.body.task.id;
    });

    it('should not create a task without title', async () => {
      const res = await request(app).post('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({ description: 'No title' });
      expect(res.status).toBe(400);
    });

    it('should list tasks with pagination', async () => {
      const res = await request(app).get('/api/tasks?page=1&limit=10')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('items');
      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('totalPages');
    });

    it('should get task by id', async () => {
      const res = await request(app).get(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.title).toBe('My first task');
    });

    it('should get task statistics', async () => {
      const res = await request(app).get('/api/tasks/stats')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('total');
      expect(res.body.total).toBeGreaterThan(0);
    });

    it('should update a task', async () => {
      const res = await request(app).put(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Updated task', status: 'completed' });
      expect(res.status).toBe(200);
      expect(res.body.task.title).toBe('Updated task');
      expect(res.body.task.status).toBe('completed');
    });

    it('should search tasks', async () => {
      const res = await request(app).get('/api/tasks?search=Updated')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.items.length).toBeGreaterThan(0);
    });

    it('should filter tasks by status', async () => {
      const res = await request(app).get('/api/tasks?status=completed')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      res.body.items.forEach((t) => expect(t.status).toBe('completed'));
    });

    it('should delete a task', async () => {
      const res = await request(app).delete(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });

    it('should return 404 for deleted task', async () => {
      const res = await request(app).get(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });
  });
});
