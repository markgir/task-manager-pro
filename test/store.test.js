const store = require('../data/store');

describe('Data Store', () => {
  beforeEach(() => {
    store.clearAll();
  });

  describe('create', () => {
    it('should create an item with a generated id and timestamps', () => {
      const item = store.create('tasks', { title: 'Test task', status: 'pending' });
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('createdAt');
      expect(item).toHaveProperty('updatedAt');
      expect(item.title).toBe('Test task');
    });
  });

  describe('findById', () => {
    it('should find an item by id', () => {
      const created = store.create('tasks', { title: 'Find me' });
      const found = store.findById('tasks', created.id);
      expect(found).not.toBeNull();
      expect(found.title).toBe('Find me');
    });

    it('should return null for non-existent id', () => {
      const found = store.findById('tasks', 'non-existent');
      expect(found).toBeNull();
    });
  });

  describe('findOne', () => {
    it('should find an item by field value', () => {
      store.create('users', { email: 'test@test.com', name: 'Test' });
      const found = store.findOne('users', 'email', 'test@test.com');
      expect(found).not.toBeNull();
      expect(found.name).toBe('Test');
    });
  });

  describe('getAll', () => {
    it('should return all items', () => {
      store.create('tasks', { title: 'Task 1' });
      store.create('tasks', { title: 'Task 2' });
      const all = store.getAll('tasks');
      expect(all).toHaveLength(2);
    });

    it('should filter items', () => {
      store.create('tasks', { title: 'Task 1', status: 'pending' });
      store.create('tasks', { title: 'Task 2', status: 'completed' });
      const pending = store.getAll('tasks', { status: 'pending' });
      expect(pending).toHaveLength(1);
      expect(pending[0].title).toBe('Task 1');
    });
  });

  describe('getPaginated', () => {
    it('should return paginated results', () => {
      for (let i = 1; i <= 15; i++) {
        store.create('tasks', { title: `Task ${i}` });
      }
      const page1 = store.getPaginated('tasks', { page: 1, limit: 5 });
      expect(page1.items).toHaveLength(5);
      expect(page1.total).toBe(15);
      expect(page1.totalPages).toBe(3);
      expect(page1.page).toBe(1);
    });
  });

  describe('update', () => {
    it('should update an item', () => {
      const created = store.create('tasks', { title: 'Old title' });
      const updated = store.update('tasks', created.id, { title: 'New title' });
      expect(updated.title).toBe('New title');
      expect(updated.id).toBe(created.id);
    });

    it('should return null for non-existent id', () => {
      const result = store.update('tasks', 'fake', { title: 'Nope' });
      expect(result).toBeNull();
    });
  });

  describe('remove', () => {
    it('should remove an item', () => {
      const created = store.create('tasks', { title: 'Delete me' });
      const result = store.remove('tasks', created.id);
      expect(result).toBe(true);
      expect(store.findById('tasks', created.id)).toBeNull();
    });

    it('should return false for non-existent id', () => {
      expect(store.remove('tasks', 'nope')).toBe(false);
    });
  });

  describe('clear', () => {
    it('should clear a collection', () => {
      store.create('tasks', { title: 'Task' });
      store.clear('tasks');
      expect(store.getAll('tasks')).toHaveLength(0);
    });
  });
});
