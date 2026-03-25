/**
 * Input sanitization utilities to prevent XSS and injection attacks.
 */

/**
 * Strip HTML tags from a string.
 */
function stripTags(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/<[^>]*>/g, '').trim();
}

/**
 * Escape HTML entities.
 */
function escapeHtml(str) {
  if (typeof str !== 'string') return str;
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;', '/': '&#x2F;' };
  return str.replace(/[&<>"'/]/g, (char) => map[char]);
}

/**
 * Sanitize an object's string values.
 */
function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const sanitized = {};
  Object.entries(obj).forEach(([key, value]) => {
    sanitized[key] = typeof value === 'string' ? stripTags(value) : value;
  });
  return sanitized;
}

module.exports = { stripTags, escapeHtml, sanitizeObject };
