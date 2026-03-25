/**
 * Task Manager Pro - Frontend Application
 * Handles authentication, CRUD operations, search, filter, pagination, and notifications.
 */

// ═══════════════════════════════════════════════════════════════════════
//  API Client
// ═══════════════════════════════════════════════════════════════════════

const API_BASE = '/api';

/**
 * Make an authenticated API request.
 */
async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  const config = {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  };
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, config);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Ocorreu um erro inesperado.');
  }
  return data;
}

// ═══════════════════════════════════════════════════════════════════════
//  Toast Notification System
// ═══════════════════════════════════════════════════════════════════════

const TOAST_ICONS = {
  success: '✅',
  error: '❌',
  warning: '⚠️',
  info: 'ℹ️',
};

const TOAST_TITLES = {
  success: 'Sucesso',
  error: 'Erro',
  warning: 'Aviso',
  info: 'Informação',
};

/**
 * Show a toast notification.
 * @param {string} message - The message to display
 * @param {'success'|'error'|'warning'|'info'} type - Toast type
 * @param {number} duration - Auto-dismiss time in ms (0 = manual)
 */
function showToast(message, type = 'info', duration = 4000) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${TOAST_ICONS[type]}</span>
    <div class="toast-body">
      <div class="toast-title">${TOAST_TITLES[type]}</div>
      <div class="toast-message">${escapeHtml(message)}</div>
    </div>
    <button class="toast-close">✕</button>
  `;

  const closeBtn = toast.querySelector('.toast-close');
  const dismiss = () => {
    toast.classList.add('leaving');
    setTimeout(() => toast.remove(), 300);
  };
  closeBtn.addEventListener('click', dismiss);

  container.appendChild(toast);

  if (duration > 0) {
    setTimeout(dismiss, duration);
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ═══════════════════════════════════════════════════════════════════════
//  Form Validation
// ═══════════════════════════════════════════════════════════════════════

/**
 * Show a field-level error.
 */
function showFieldError(inputId, errorId, message) {
  const input = document.getElementById(inputId);
  const error = document.getElementById(errorId);
  if (input) input.classList.add('error');
  if (error) { error.textContent = message; error.classList.add('visible'); }
}

/**
 * Clear a field-level error.
 */
function clearFieldError(inputId, errorId) {
  const input = document.getElementById(inputId);
  const error = document.getElementById(errorId);
  if (input) input.classList.remove('error');
  if (error) { error.textContent = ''; error.classList.remove('visible'); }
}

/**
 * Clear all errors in a form.
 */
function clearFormErrors(formId) {
  const form = document.getElementById(formId);
  if (!form) return;
  form.querySelectorAll('.form-input, .form-textarea').forEach((el) => el.classList.remove('error'));
  form.querySelectorAll('.form-error').forEach((el) => { el.textContent = ''; el.classList.remove('visible'); });
}

/**
 * Validate email format.
 */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ═══════════════════════════════════════════════════════════════════════
//  Page Navigation / Auth State
// ═══════════════════════════════════════════════════════════════════════

let currentUser = null;

function showPage(pageId) {
  document.querySelectorAll('[id^="page-"]').forEach((el) => el.classList.add('hidden'));
  const page = document.getElementById(pageId);
  if (page) page.classList.remove('hidden');
}

function isAuthenticated() {
  return !!localStorage.getItem('token');
}

async function checkAuth() {
  if (!isAuthenticated()) {
    showPage('page-login');
    return;
  }
  try {
    const data = await apiRequest('/auth/me');
    currentUser = data.user;
    updateUserUI();
    showPage('page-app');
    loadStats();
    loadTasks();
  } catch (err) {
    localStorage.removeItem('token');
    showPage('page-login');
  }
}

function updateUserUI() {
  if (!currentUser) return;
  const initials = currentUser.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
  document.getElementById('user-avatar').textContent = initials;
  document.getElementById('user-name').textContent = currentUser.name;
  document.getElementById('user-email').textContent = currentUser.email;
}

function logout() {
  localStorage.removeItem('token');
  currentUser = null;
  showPage('page-login');
  showToast('Sessão terminada com sucesso.', 'info');
}

// ═══════════════════════════════════════════════════════════════════════
//  Auth Forms
// ═══════════════════════════════════════════════════════════════════════

function initAuthForms() {
  // Navigation between login/register
  document.getElementById('goto-register').addEventListener('click', (e) => {
    e.preventDefault();
    clearFormErrors('login-form');
    showPage('page-register');
  });

  document.getElementById('goto-login').addEventListener('click', (e) => {
    e.preventDefault();
    clearFormErrors('register-form');
    showPage('page-login');
  });

  // Login form
  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFormErrors('login-form');

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    let valid = true;

    if (!email) { showFieldError('login-email', 'login-email-error', 'Email é obrigatório.'); valid = false; }
    else if (!isValidEmail(email)) { showFieldError('login-email', 'login-email-error', 'Email inválido.'); valid = false; }

    if (!password) { showFieldError('login-password', 'login-password-error', 'Password é obrigatória.'); valid = false; }

    if (!valid) return;

    const btn = document.getElementById('login-btn');
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner"></div> A entrar...';

    try {
      const data = await apiRequest('/auth/login', {
        method: 'POST',
        body: { email, password },
      });
      localStorage.setItem('token', data.token);
      currentUser = data.user;
      updateUserUI();
      showPage('page-app');
      showToast(`Bem-vindo de volta, ${data.user.name}!`, 'success');
      loadStats();
      loadTasks();
      document.getElementById('login-form').reset();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = 'Entrar';
    }
  });

  // Register form
  document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFormErrors('register-form');

    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const passwordConfirm = document.getElementById('reg-password-confirm').value;
    let valid = true;

    if (!name || name.length < 2) { showFieldError('reg-name', 'reg-name-error', 'Nome deve ter pelo menos 2 caracteres.'); valid = false; }
    if (!email) { showFieldError('reg-email', 'reg-email-error', 'Email é obrigatório.'); valid = false; }
    else if (!isValidEmail(email)) { showFieldError('reg-email', 'reg-email-error', 'Email inválido.'); valid = false; }
    if (!password || password.length < 6) { showFieldError('reg-password', 'reg-password-error', 'Password deve ter pelo menos 6 caracteres.'); valid = false; }
    else if (!/\d/.test(password)) { showFieldError('reg-password', 'reg-password-error', 'Password deve conter pelo menos um número.'); valid = false; }
    else if (!/[a-zA-Z]/.test(password)) { showFieldError('reg-password', 'reg-password-error', 'Password deve conter pelo menos uma letra.'); valid = false; }
    if (password !== passwordConfirm) { showFieldError('reg-password-confirm', 'reg-password-confirm-error', 'As passwords não coincidem.'); valid = false; }

    if (!valid) return;

    const btn = document.getElementById('register-btn');
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner"></div> A criar conta...';

    try {
      const data = await apiRequest('/auth/register', {
        method: 'POST',
        body: { name, email, password },
      });
      localStorage.setItem('token', data.token);
      currentUser = data.user;
      updateUserUI();
      showPage('page-app');
      showToast(`Conta criada com sucesso! Bem-vindo, ${data.user.name}!`, 'success');
      loadStats();
      loadTasks();
      document.getElementById('register-form').reset();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = 'Criar Conta';
    }
  });

  // Password toggle buttons
  document.querySelectorAll('.password-toggle').forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = document.getElementById(btn.dataset.target);
      if (target) {
        const isPassword = target.type === 'password';
        target.type = isPassword ? 'text' : 'password';
        btn.textContent = isPassword ? '🙈' : '👁';
      }
    });
  });

  // Real-time validation: clear errors on input
  document.querySelectorAll('.form-input, .form-textarea').forEach((input) => {
    input.addEventListener('input', () => {
      input.classList.remove('error');
      const errorEl = input.closest('.form-group')?.querySelector('.form-error');
      if (errorEl) { errorEl.textContent = ''; errorEl.classList.remove('visible'); }
    });
  });
}

// ═══════════════════════════════════════════════════════════════════════
//  Sidebar & Mobile Menu
// ═══════════════════════════════════════════════════════════════════════

let currentStatusFilter = '';

function initSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const toggle = document.getElementById('menu-toggle');

  const openMenu = () => { sidebar.classList.add('open'); overlay.classList.add('open'); };
  const closeMenu = () => { sidebar.classList.remove('open'); overlay.classList.remove('open'); };

  toggle?.addEventListener('click', openMenu);
  overlay?.addEventListener('click', closeMenu);

  // Nav items
  document.querySelectorAll('.sidebar-nav-item').forEach((item) => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.sidebar-nav-item').forEach((i) => i.classList.remove('active'));
      item.classList.add('active');

      const filter = item.dataset.filter;
      currentStatusFilter = filter === 'all' ? '' : filter;
      currentPage = 1;
      loadTasks();
      closeMenu();
    });
  });

  // Logout
  document.getElementById('logout-btn').addEventListener('click', logout);
}

// ═══════════════════════════════════════════════════════════════════════
//  Tasks Management
// ═══════════════════════════════════════════════════════════════════════

let currentPage = 1;
const ITEMS_PER_PAGE = 8;
let searchTimeout = null;
let deleteTaskId = null;

/**
 * Load task statistics.
 */
async function loadStats() {
  try {
    const stats = await apiRequest('/tasks/stats');
    document.getElementById('stat-total').textContent = stats.total;
    document.getElementById('stat-pending').textContent = stats.pending;
    document.getElementById('stat-progress').textContent = stats.in_progress;
    document.getElementById('stat-done').textContent = stats.completed;
  } catch (err) {
    console.error('Failed to load stats:', err);
  }
}

/**
 * Load tasks with current filters and pagination.
 */
async function loadTasks() {
  const taskList = document.getElementById('task-list');
  taskList.innerHTML = '<div class="loading-container"><div class="spinner spinner-lg"></div><span>A carregar tarefas...</span></div>';

  try {
    const search = document.getElementById('search-input').value.trim();
    const priority = document.getElementById('filter-priority').value;
    const sortVal = document.getElementById('sort-select').value.split('-');

    const params = new URLSearchParams({
      page: currentPage,
      limit: ITEMS_PER_PAGE,
      sortBy: sortVal[0],
      sortOrder: sortVal[1],
    });

    if (currentStatusFilter) params.set('status', currentStatusFilter);
    if (priority) params.set('priority', priority);
    if (search) params.set('search', search);

    const data = await apiRequest(`/tasks?${params}`);
    renderTasks(data.items);
    renderPagination(data);
  } catch (err) {
    taskList.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><h3>Erro ao carregar tarefas</h3><p>${escapeHtml(err.message)}</p></div>`;
  }
}

/**
 * Render task cards.
 */
function renderTasks(tasks) {
  const taskList = document.getElementById('task-list');

  if (!tasks || tasks.length === 0) {
    taskList.innerHTML = `
      <div class="empty-state">
        <div class="icon">📝</div>
        <h3>Nenhuma tarefa encontrada</h3>
        <p>Clique em "Nova Tarefa" para começar a organizar o seu trabalho.</p>
      </div>
    `;
    return;
  }

  const statusLabels = { pending: 'Pendente', in_progress: 'Em Progresso', completed: 'Concluída' };
  const priorityLabels = { low: 'Baixa', medium: 'Média', high: 'Alta' };

  taskList.innerHTML = tasks.map((task) => `
    <div class="task-card ${task.status === 'completed' ? 'completed' : ''}" data-id="${task.id}">
      <input type="checkbox" class="task-checkbox" ${task.status === 'completed' ? 'checked' : ''}
        title="Marcar como ${task.status === 'completed' ? 'pendente' : 'concluída'}"
        data-id="${task.id}" data-status="${task.status}">
      <div class="task-body">
        <div class="task-title">${escapeHtml(task.title)}</div>
        ${task.description ? `<div class="task-description">${escapeHtml(task.description)}</div>` : ''}
        <div class="task-meta">
          <span class="badge badge-${task.status}">${statusLabels[task.status] || task.status}</span>
          <span class="badge badge-${task.priority}">${priorityLabels[task.priority] || task.priority}</span>
          <span class="task-date">${formatDate(task.createdAt)}</span>
        </div>
      </div>
      <div class="task-actions">
        <button class="btn btn-ghost btn-icon btn-sm edit-task-btn" data-id="${task.id}" title="Editar">✏️</button>
        <button class="btn btn-ghost btn-icon btn-sm delete-task-btn" data-id="${task.id}" title="Eliminar">🗑️</button>
      </div>
    </div>
  `).join('');
}

/**
 * Format ISO date to readable format.
 */
function formatDate(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * Render pagination controls.
 */
function renderPagination(data) {
  const container = document.getElementById('pagination');
  if (data.totalPages <= 1) { container.innerHTML = ''; return; }

  let html = `<span class="pagination-info">${data.total} tarefas · Página ${data.page} de ${data.totalPages}</span>`;

  html += `<button class="btn btn-secondary btn-sm" ${data.page <= 1 ? 'disabled' : ''} data-page="${data.page - 1}">← Anterior</button>`;

  const maxVisible = 5;
  let startPage = Math.max(1, data.page - Math.floor(maxVisible / 2));
  let endPage = Math.min(data.totalPages, startPage + maxVisible - 1);
  if (endPage - startPage < maxVisible - 1) startPage = Math.max(1, endPage - maxVisible + 1);

  if (startPage > 1) {
    html += `<button class="btn btn-secondary btn-sm" data-page="1">1</button>`;
    if (startPage > 2) html += `<span class="text-muted" style="padding:0 0.25rem">…</span>`;
  }

  for (let i = startPage; i <= endPage; i++) {
    html += `<button class="btn ${i === data.page ? 'active' : 'btn-secondary'} btn-sm" data-page="${i}">${i}</button>`;
  }

  if (endPage < data.totalPages) {
    if (endPage < data.totalPages - 1) html += `<span class="text-muted" style="padding:0 0.25rem">…</span>`;
    html += `<button class="btn btn-secondary btn-sm" data-page="${data.totalPages}">${data.totalPages}</button>`;
  }

  html += `<button class="btn btn-secondary btn-sm" ${data.page >= data.totalPages ? 'disabled' : ''} data-page="${data.page + 1}">Seguinte →</button>`;

  container.innerHTML = html;
}

// ═══════════════════════════════════════════════════════════════════════
//  Task Modal (Create / Edit)
// ═══════════════════════════════════════════════════════════════════════

function openTaskModal(task = null) {
  clearFormErrors('task-form');
  const modal = document.getElementById('task-modal');
  const title = document.getElementById('modal-title');
  const saveBtn = document.getElementById('save-task-btn');

  if (task) {
    title.textContent = 'Editar Tarefa';
    saveBtn.textContent = 'Atualizar Tarefa';
    document.getElementById('task-id').value = task.id;
    document.getElementById('task-title').value = task.title;
    document.getElementById('task-desc').value = task.description || '';
    document.getElementById('task-status').value = task.status;
    document.getElementById('task-priority').value = task.priority;
  } else {
    title.textContent = 'Nova Tarefa';
    saveBtn.textContent = 'Guardar Tarefa';
    document.getElementById('task-form').reset();
    document.getElementById('task-id').value = '';
  }

  modal.classList.add('open');
  setTimeout(() => document.getElementById('task-title').focus(), 100);
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('open');
}

async function saveTask() {
  clearFormErrors('task-form');

  const id = document.getElementById('task-id').value;
  const titleVal = document.getElementById('task-title').value.trim();
  const desc = document.getElementById('task-desc').value.trim();
  const status = document.getElementById('task-status').value;
  const priority = document.getElementById('task-priority').value;

  let valid = true;
  if (!titleVal || titleVal.length < 2) {
    showFieldError('task-title', 'task-title-error', 'Título deve ter pelo menos 2 caracteres.');
    valid = false;
  }
  if (titleVal.length > 200) {
    showFieldError('task-title', 'task-title-error', 'Título não pode exceder 200 caracteres.');
    valid = false;
  }
  if (desc.length > 1000) {
    showFieldError('task-desc', 'task-desc-error', 'Descrição não pode exceder 1000 caracteres.');
    valid = false;
  }

  if (!valid) return;

  const saveBtn = document.getElementById('save-task-btn');
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<div class="spinner"></div> A guardar...';

  try {
    const body = { title: titleVal, description: desc, status, priority };

    if (id) {
      await apiRequest(`/tasks/${id}`, { method: 'PUT', body });
      showToast('Tarefa atualizada com sucesso!', 'success');
    } else {
      await apiRequest('/tasks', { method: 'POST', body });
      showToast('Tarefa criada com sucesso!', 'success');
    }

    closeModal('task-modal');
    loadTasks();
    loadStats();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerHTML = id ? 'Atualizar Tarefa' : 'Guardar Tarefa';
  }
}

async function toggleTaskStatus(taskId, currentStatus) {
  const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
  try {
    await apiRequest(`/tasks/${taskId}`, { method: 'PUT', body: { status: newStatus } });
    showToast(newStatus === 'completed' ? 'Tarefa concluída! 🎉' : 'Tarefa reaberta.', 'success');
    loadTasks();
    loadStats();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteTask() {
  if (!deleteTaskId) return;
  const btn = document.getElementById('confirm-delete-btn');
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner"></div> A eliminar...';

  try {
    await apiRequest(`/tasks/${deleteTaskId}`, { method: 'DELETE' });
    showToast('Tarefa eliminada com sucesso!', 'success');
    closeModal('confirm-modal');
    loadTasks();
    loadStats();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = 'Eliminar';
    deleteTaskId = null;
  }
}

// ═══════════════════════════════════════════════════════════════════════
//  Event Listeners
// ═══════════════════════════════════════════════════════════════════════

function initEventListeners() {
  // Add task button
  document.getElementById('add-task-btn').addEventListener('click', () => openTaskModal());

  // Save task
  document.getElementById('save-task-btn').addEventListener('click', saveTask);

  // Confirm delete
  document.getElementById('confirm-delete-btn').addEventListener('click', deleteTask);

  // Close modals
  document.querySelectorAll('.modal-close').forEach((btn) => {
    btn.addEventListener('click', () => closeModal(btn.dataset.modal));
  });

  // Close modal on overlay click
  document.querySelectorAll('.modal-overlay').forEach((overlay) => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.classList.remove('open');
    });
  });

  // Close modal on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.open').forEach((m) => m.classList.remove('open'));
    }
  });

  // Submit task form on Enter in title field
  document.getElementById('task-title').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); saveTask(); }
  });

  // Task list delegation (checkbox, edit, delete)
  document.getElementById('task-list').addEventListener('click', async (e) => {
    const target = e.target;

    // Checkbox toggle
    if (target.classList.contains('task-checkbox')) {
      e.preventDefault();
      toggleTaskStatus(target.dataset.id, target.dataset.status);
      return;
    }

    // Edit button
    const editBtn = target.closest('.edit-task-btn');
    if (editBtn) {
      try {
        const task = await apiRequest(`/tasks/${editBtn.dataset.id}`);
        openTaskModal(task);
      } catch (err) {
        showToast(err.message, 'error');
      }
      return;
    }

    // Delete button
    const deleteBtn = target.closest('.delete-task-btn');
    if (deleteBtn) {
      deleteTaskId = deleteBtn.dataset.id;
      document.getElementById('confirm-modal').classList.add('open');
      return;
    }
  });

  // Search with debounce
  document.getElementById('search-input').addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => { currentPage = 1; loadTasks(); }, 350);
  });

  // Filter by priority
  document.getElementById('filter-priority').addEventListener('change', () => { currentPage = 1; loadTasks(); });

  // Sort
  document.getElementById('sort-select').addEventListener('change', () => { currentPage = 1; loadTasks(); });

  // Pagination delegation
  document.getElementById('pagination').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-page]');
    if (btn && !btn.disabled) {
      currentPage = parseInt(btn.dataset.page);
      loadTasks();
      document.getElementById('task-list').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════
//  Initialize App
// ═══════════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  initAuthForms();
  initSidebar();
  initEventListeners();
  checkAuth();
});
