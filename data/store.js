/**
 * In-memory data store with CRUD operations.
 * Supports users and tasks collections.
 * In production, replace with a real database (MongoDB, PostgreSQL, etc.).
 */

const { v4: uuidv4 } = require('uuid');

// ─── In-Memory Collections ─────────────────────────────────────────────────────
const collections = {
  users: [],
  tasks: [],
};

// ─── Generic CRUD helpers ───────────────────────────────────────────────────────

/**
 * Get all items from a collection, optionally filtered.
 * @param {string} collection - Collection name
 * @param {object} filters - Key-value filters to match
 * @returns {Array}
 */
function getAll(collection, filters = {}) {
  if (!collections[collection]) return [];
  let items = [...collections[collection]];

  // Apply filters
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      items = items.filter((item) => {
        if (typeof item[key] === 'string' && typeof value === 'string') {
          return item[key].toLowerCase().includes(value.toLowerCase());
        }
        return item[key] === value;
      });
    }
  });

  return items;
}

/**
 * Get paginated items from a collection with filtering.
 * @param {string} collection - Collection name
 * @param {object} options - { page, limit, filters, sortBy, sortOrder }
 * @returns {{ items: Array, total: number, page: number, limit: number, totalPages: number }}
 */
function getPaginated(collection, options = {}) {
  const { page = 1, limit = 10, filters = {}, sortBy = 'createdAt', sortOrder = 'desc' } = options;

  let items = getAll(collection, filters);

  // Sort
  items.sort((a, b) => {
    const aVal = a[sortBy] || '';
    const bVal = b[sortBy] || '';
    if (sortOrder === 'asc') return aVal > bVal ? 1 : -1;
    return aVal < bVal ? 1 : -1;
  });

  const total = items.length;
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  const paginatedItems = items.slice(start, start + limit);

  return { items: paginatedItems, total, page, limit, totalPages };
}

/**
 * Find a single item by a field value.
 * @param {string} collection
 * @param {string} field
 * @param {*} value
 * @returns {object|null}
 */
function findOne(collection, field, value) {
  if (!collections[collection]) return null;
  return collections[collection].find((item) => item[field] === value) || null;
}

/**
 * Find item by ID.
 */
function findById(collection, id) {
  return findOne(collection, 'id', id);
}

/**
 * Create a new item in a collection.
 * @param {string} collection
 * @param {object} data
 * @returns {object} Created item
 */
function create(collection, data) {
  if (!collections[collection]) collections[collection] = [];
  const item = {
    id: uuidv4(),
    ...data,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  collections[collection].push(item);
  return item;
}

/**
 * Update an item by ID.
 * @param {string} collection
 * @param {string} id
 * @param {object} data
 * @returns {object|null} Updated item or null
 */
function update(collection, id, data) {
  if (!collections[collection]) return null;
  const index = collections[collection].findIndex((item) => item.id === id);
  if (index === -1) return null;

  collections[collection][index] = {
    ...collections[collection][index],
    ...data,
    updatedAt: new Date().toISOString(),
  };
  return collections[collection][index];
}

/**
 * Remove an item by ID.
 * @param {string} collection
 * @param {string} id
 * @returns {boolean}
 */
function remove(collection, id) {
  if (!collections[collection]) return false;
  const index = collections[collection].findIndex((item) => item.id === id);
  if (index === -1) return false;
  collections[collection].splice(index, 1);
  return true;
}

/**
 * Clear a collection (useful for testing).
 */
function clear(collection) {
  if (collections[collection]) collections[collection] = [];
}

/**
 * Clear all collections.
 */
function clearAll() {
  Object.keys(collections).forEach((key) => {
    collections[key] = [];
  });
}

module.exports = {
  getAll,
  getPaginated,
  findOne,
  findById,
  create,
  update,
  remove,
  clear,
  clearAll,
};
