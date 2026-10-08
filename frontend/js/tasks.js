/**
 * Task Management Module: CRUD, Filtering, Modals & Subtasks
 */

let tasks = [];
let activeFilters = {
  search: '',
  status: 'All',
  priority: 'All',
  category: 'All',
  dateFilter: 'All',
  sort: 'newest',
};
let currentView = 'grid';
let deletingTaskId = null;
let editingTaskId = null;

// Initialize Tasks on Page Load
async function initTaskManager() {
  setupFilterListeners();
  setupModalListeners();
  await loadTasks();
  await loadDashboardStats();
}

// Fetch Tasks from API
async function loadTasks() {
  const container = document.getElementById('tasksContainer');
  if (container) {
    container.innerHTML = '<div class="spinner"></div>';
  }

  const queryParams = new URLSearchParams();
  if (activeFilters.search) queryParams.append('search', activeFilters.search);
  if (activeFilters.status !== 'All') queryParams.append('status', activeFilters.status);
  if (activeFilters.priority !== 'All') queryParams.append('priority', activeFilters.priority);
  if (activeFilters.category !== 'All') queryParams.append('category', activeFilters.category);
  if (activeFilters.dateFilter !== 'All') queryParams.append('dateFilter', activeFilters.dateFilter);
  if (activeFilters.sort) queryParams.append('sort', activeFilters.sort);

  try {
    const res = await apiRequest(`/tasks?${queryParams.toString()}`);
    if (res.success) {
      tasks = res.data;
      renderTasksList();
    }
  } catch (error) {
    if (container) {
      container.innerHTML = `
        <div class="empty-state">
          <h3>Failed to load tasks</h3>
          <p>${escapeHtml(error.message)}</p>
          <button class="btn btn-primary" onclick="loadTasks()">Try Again</button>
        </div>
      `;
    }
  }
}

// Render Tasks to DOM
function renderTasksList() {
  const container = document.getElementById('tasksContainer');
  if (!container) return;

  if (tasks.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📝</div>
        <h3>No tasks found</h3>
        <p>No tasks match your current filter criteria, or you haven't created any tasks yet.</p>
        <button class="btn btn-primary" onclick="openAddTaskModal()">+ Create New Task</button>
      </div>
    `;
    return;
  }

  const containerClass = currentView === 'list' ? 'tasks-list' : 'tasks-grid';
  container.className = containerClass;

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  container.innerHTML = tasks
    .map((task) => {
      const isCompleted = task.status === 'Completed';
      const isOverdue = !isCompleted && task.dueDate && new Date(`${task.dueDate}T${task.dueTime || '23:59'}:00`) < now;
      const isToday = !isCompleted && task.dueDate === todayStr;

      // Subtask calculation
      const totalSubtasks = task.subtasks ? task.subtasks.length : 0;
      const completedSubtasks = task.subtasks ? task.subtasks.filter((s) => s.completed).length : 0;

      return `
        <div class="task-card ${isCompleted ? 'is-completed' : ''} ${isOverdue ? 'is-overdue' : ''}" id="task-${task._id}">
          <div class="task-header">
            <div class="task-checkbox-container">
              <input 
                type="checkbox" 
                class="task-checkbox" 
                ${isCompleted ? 'checked' : ''} 
                title="Mark as ${isCompleted ? 'Pending' : 'Completed'}"
                onchange="toggleTaskStatus('${task._id}')"
              />
            </div>
            <div class="task-title-group" onclick="openTaskDetailsModal('${task._id}')">
              <h3 class="task-title">${escapeHtml(task.title)}</h3>
              ${task.description ? `<p class="task-description">${escapeHtml(task.description)}</p>` : ''}
            </div>
          </div>

          <div class="task-badges">
            <span class="badge-priority ${(task.priority || 'Medium').toLowerCase()}">
              ${escapeHtml(task.priority || 'Medium')}
            </span>
            <span class="badge-category ${(task.category || 'Other').toLowerCase()}">
              ${escapeHtml(task.category || 'Other')}
            </span>
            ${isOverdue ? '<span class="badge-overdue">⚠ Overdue</span>' : ''}
            ${isToday ? '<span class="badge-overdue" style="background:var(--warning-bg);color:var(--warning);">⏰ Today</span>' : ''}
          </div>

          ${
            totalSubtasks > 0
              ? `
            <div class="task-subtasks-preview">
              <span>Subtasks: ${completedSubtasks}/${totalSubtasks}</span>
              <div class="subtask-mini-bar">
                <div class="subtask-mini-fill" style="width: ${(completedSubtasks / totalSubtasks) * 100}%"></div>
              </div>
            </div>
          `
              : ''
          }

          <div class="task-meta">
            <div class="task-due-info">
              <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <span>${formatDate(task.dueDate)} (${task.dueTime || '23:59'})</span>
            </div>
            <div class="task-actions">
              <button class="action-btn" title="View Details" onclick="openTaskDetailsModal('${task._id}')">
                <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              </button>
              <button class="action-btn" title="Edit Task" onclick="openEditTaskModal('${task._id}')">
                <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
              <button class="action-btn btn-delete" title="Delete Task" onclick="openDeleteModal('${task._id}')">
                <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      `;
    })
    .join('');
}

// Toggle Task Status (Pending <-> Completed)
async function toggleTaskStatus(taskId) {
  try {
    const res = await apiRequest(`/tasks/${taskId}/complete`, 'PATCH');
    if (res.success) {
      showToast(res.message, 'success');
      // Update local state
      const idx = tasks.findIndex((t) => t._id === taskId);
      if (idx !== -1) {
        tasks[idx] = res.data;
        renderTasksList();
      }
      loadDashboardStats();
    }
  } catch (error) {
    showToast('Failed to update task status', 'error');
    loadTasks();
  }
}

// Open Modal to Add New Task
function openAddTaskModal() {
  editingTaskId = null;
  const modal = document.getElementById('taskFormModal');
  const title = document.getElementById('modalFormTitle');
  const form = document.getElementById('taskForm');
  const subtasksList = document.getElementById('modalSubtasksList');

  title.textContent = 'Create New Task';
  form.reset();

  // Set default due date to tomorrow or today
  const todayStr = new Date().toISOString().split('T')[0];
  document.getElementById('taskDueDateInput').value = todayStr;
  document.getElementById('taskDueTimeInput').value = '18:00';
  document.getElementById('taskPriorityInput').value = 'Medium';
  document.getElementById('taskCategoryInput').value = 'Work';

  if (subtasksList) subtasksList.innerHTML = '';

  modal.classList.add('active');
}

// Open Modal to Edit Task
function openEditTaskModal(taskId) {
  const task = tasks.find((t) => t._id === taskId);
  if (!task) return;

  editingTaskId = taskId;
  const modal = document.getElementById('taskFormModal');
  const title = document.getElementById('modalFormTitle');
  const subtasksList = document.getElementById('modalSubtasksList');

  title.textContent = 'Edit Task';
  document.getElementById('taskTitleInput').value = task.title || '';
  document.getElementById('taskDescInput').value = task.description || '';
  document.getElementById('taskDueDateInput').value = task.dueDate || '';
  document.getElementById('taskDueTimeInput').value = task.dueTime || '23:59';
  document.getElementById('taskPriorityInput').value = task.priority || 'Medium';
  document.getElementById('taskCategoryInput').value = task.category || 'Other';

  // Subtasks list
  if (subtasksList) {
    subtasksList.innerHTML = '';
    if (task.subtasks && task.subtasks.length > 0) {
      task.subtasks.forEach((st) => {
        addSubtaskInputField(st.title, st.completed);
      });
    }
  }

  modal.classList.add('active');
}

// Add Subtask row in Modal Form
function addSubtaskInputField(title = '', completed = false) {
  const list = document.getElementById('modalSubtasksList');
  if (!list) return;

  const row = document.createElement('div');
  row.className = 'subtask-builder-item';
  row.innerHTML = `
    <input type="checkbox" class="subtask-checkbox" ${completed ? 'checked' : ''} style="width:18px;height:18px;">
    <input type="text" class="form-control subtask-title-input" placeholder="Subtask title..." value="${escapeHtml(title)}" required>
    <button type="button" class="btn-icon-only" onclick="this.parentElement.remove()" title="Remove subtask">✕</button>
  `;
  list.appendChild(row);
}

// Submit Add / Edit Task Form
async function handleTaskFormSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');

  const title = document.getElementById('taskTitleInput').value.trim();
  const description = document.getElementById('taskDescInput').value.trim();
  const dueDate = document.getElementById('taskDueDateInput').value;
  const dueTime = document.getElementById('taskDueTimeInput').value;
  const priority = document.getElementById('taskPriorityInput').value;
  const category = document.getElementById('taskCategoryInput').value;

  // Gather subtasks
  const subtaskRows = document.querySelectorAll('#modalSubtasksList .subtask-builder-item');
  const subtasks = Array.from(subtaskRows).map((row) => ({
    title: row.querySelector('.subtask-title-input').value.trim(),
    completed: row.querySelector('.subtask-checkbox').checked,
  })).filter((s) => s.title !== '');

  const payload = {
    title,
    description,
    dueDate,
    dueTime,
    priority,
    category,
    subtasks,
  };

  try {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';

    if (editingTaskId) {
      const res = await apiRequest(`/tasks/${editingTaskId}`, 'PUT', payload);
      showToast('Task updated successfully!', 'success');
    } else {
      const res = await apiRequest('/tasks', 'POST', payload);
      showToast('Task created successfully!', 'success');
    }

    closeModal('taskFormModal');
    await loadTasks();
    await loadDashboardStats();
  } catch (error) {
    showToast(error.message || 'Failed to save task', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Save Task';
  }
}

// Open Delete Confirmation Modal
function openDeleteModal(taskId) {
  deletingTaskId = taskId;
  const task = tasks.find((t) => t._id === taskId);
  const titlePreview = document.getElementById('deleteTaskTitlePreview');
  if (titlePreview && task) {
    titlePreview.textContent = `"${task.title}"`;
  }
  document.getElementById('deleteConfirmModal').classList.add('active');
}

// Confirm Delete Task
async function confirmDeleteTask() {
  if (!deletingTaskId) return;

  try {
    const res = await apiRequest(`/tasks/${deletingTaskId}`, 'DELETE');
    if (res.success) {
      showToast('Task deleted successfully', 'success');
      closeModal('deleteConfirmModal');
      await loadTasks();
      await loadDashboardStats();
    }
  } catch (error) {
    showToast('Failed to delete task', 'error');
  } finally {
    deletingTaskId = null;
  }
}

// Open Task Details View Modal
function openTaskDetailsModal(taskId) {
  const task = tasks.find((t) => t._id === taskId);
  if (!task) return;

  const modal = document.getElementById('taskDetailsModal');
  const body = document.getElementById('taskDetailsBody');

  const createdDate = new Date(task.createdAt).toLocaleString();
  const completedDate = task.completedAt ? new Date(task.completedAt).toLocaleString() : 'Not yet completed';

  body.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:16px;">
      <h2 style="font-size:1.4rem; font-weight:800; color:var(--text-main);">${escapeHtml(task.title)}</h2>
      <span class="badge-priority ${task.priority.toLowerCase()}">${escapeHtml(task.priority)}</span>
    </div>

    <div style="display:flex; gap:8px; margin-top:8px;">
      <span class="badge-category ${task.category.toLowerCase()}">${escapeHtml(task.category)}</span>
      <span class="badge-category" style="background:var(--bg-surface-secondary); color:var(--text-secondary);">
        Status: <strong>${escapeHtml(task.status)}</strong>
      </span>
    </div>

    <div style="margin-top:16px;">
      <h4 style="font-size:0.85rem; text-transform:uppercase; color:var(--text-muted); margin-bottom:6px;">Description</h4>
      <p style="color:var(--text-secondary); line-height:1.6; white-space:pre-wrap;">${escapeHtml(task.description || 'No description provided.')}</p>
    </div>

    <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-top:20px; padding:14px; background:var(--bg-surface-secondary); border-radius:var(--radius-md);">
      <div>
        <div style="font-size:0.75rem; color:var(--text-muted);">DUE DATE & TIME</div>
        <div style="font-weight:600; color:var(--text-main);">${formatDate(task.dueDate)} at ${task.dueTime}</div>
      </div>
      <div>
        <div style="font-size:0.75rem; color:var(--text-muted);">CREATED AT</div>
        <div style="font-weight:600; color:var(--text-main);">${createdDate}</div>
      </div>
      <div style="grid-column: span 2;">
        <div style="font-size:0.75rem; color:var(--text-muted);">COMPLETED AT</div>
        <div style="font-weight:600; color:var(--text-main);">${completedDate}</div>
      </div>
    </div>

    ${
      task.subtasks && task.subtasks.length > 0
        ? `
      <div style="margin-top:20px;">
        <h4 style="font-size:0.85rem; text-transform:uppercase; color:var(--text-muted); margin-bottom:10px;">Subtasks Checklist</h4>
        <div style="display:flex; flex-direction:column; gap:8px;">
          ${task.subtasks
            .map(
              (st, i) => `
            <div style="display:flex; align-items:center; gap:10px; padding:8px 12px; background:var(--bg-surface-secondary); border-radius:var(--radius-sm);">
              <input type="checkbox" ${st.completed ? 'checked' : ''} onchange="toggleSubtaskInDetails('${task._id}', ${i}, this.checked)">
              <span style="${st.completed ? 'text-decoration:line-through; color:var(--text-muted);' : 'color:var(--text-main);'}">${escapeHtml(st.title)}</span>
            </div>
          `
            )
            .join('')}
        </div>
      </div>
    `
        : ''
    }
  `;

  modal.classList.add('active');
}

// Toggle a specific subtask from the Details Modal
async function toggleSubtaskInDetails(taskId, subtaskIndex, completed) {
  const task = tasks.find((t) => t._id === taskId);
  if (!task || !task.subtasks || !task.subtasks[subtaskIndex]) return;

  task.subtasks[subtaskIndex].completed = completed;

  // Check if all subtasks are completed, offer auto-completion
  const allSubtasksDone = task.subtasks.every((s) => s.completed);

  try {
    await apiRequest(`/tasks/${taskId}`, 'PUT', { subtasks: task.subtasks });
    showToast('Subtask updated', 'info');
    renderTasksList();
    loadDashboardStats();
  } catch (error) {
    showToast('Failed to update subtask', 'error');
  }
}

// Close generic modal
function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('active');
}

// Setup Event Listeners for Filters, Search & Sort
function setupFilterListeners() {
  // Search input with debounce
  const searchInput = document.getElementById('taskSearchInput');
  if (searchInput) {
    let timeout = null;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        activeFilters.search = e.target.value.trim();
        loadTasks();
      }, 300);
    });
  }

  // Filter selects
  const statusFilter = document.getElementById('filterStatus');
  if (statusFilter) {
    statusFilter.addEventListener('change', (e) => {
      activeFilters.status = e.target.value;
      updateSidebarActiveFilter();
      loadTasks();
    });
  }

  const priorityFilter = document.getElementById('filterPriority');
  if (priorityFilter) {
    priorityFilter.addEventListener('change', (e) => {
      activeFilters.priority = e.target.value;
      loadTasks();
    });
  }

  const categoryFilter = document.getElementById('filterCategory');
  if (categoryFilter) {
    categoryFilter.addEventListener('change', (e) => {
      activeFilters.category = e.target.value;
      updateSidebarActiveFilter();
      loadTasks();
    });
  }

  const dateFilter = document.getElementById('filterDate');
  if (dateFilter) {
    dateFilter.addEventListener('change', (e) => {
      activeFilters.dateFilter = e.target.value;
      loadTasks();
    });
  }

  const sortSelect = document.getElementById('sortTasks');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      activeFilters.sort = e.target.value;
      loadTasks();
    });
  }

  // View switchers
  const gridViewBtn = document.getElementById('viewGridBtn');
  const listViewBtn = document.getElementById('viewListBtn');
  if (gridViewBtn && listViewBtn) {
    gridViewBtn.addEventListener('click', () => {
      currentView = 'grid';
      gridViewBtn.classList.add('active');
      listViewBtn.classList.remove('active');
      renderTasksList();
    });
    listViewBtn.addEventListener('click', () => {
      currentView = 'list';
      listViewBtn.classList.add('active');
      gridViewBtn.classList.remove('active');
      renderTasksList();
    });
  }
}

// Set active filter from sidebar or metric card click
function setQuickFilter(type, value) {
  if (type === 'status') {
    activeFilters.status = value;
    const el = document.getElementById('filterStatus');
    if (el) el.value = value;
  } else if (type === 'priority') {
    activeFilters.priority = value;
    const el = document.getElementById('filterPriority');
    if (el) el.value = value;
  } else if (type === 'category') {
    activeFilters.category = value;
    const el = document.getElementById('filterCategory');
    if (el) el.value = value;
  } else if (type === 'date') {
    activeFilters.dateFilter = value;
    const el = document.getElementById('filterDate');
    if (el) el.value = value;
  }

  // Close mobile sidebar if open
  const sidebar = document.getElementById('appSidebar');
  if (sidebar) sidebar.classList.remove('open');

  updateSidebarActiveFilter();
  loadTasks();
}

// Reset all filters
function resetAllFilters() {
  activeFilters = {
    search: '',
    status: 'All',
    priority: 'All',
    category: 'All',
    dateFilter: 'All',
    sort: 'newest',
  };

  const searchInput = document.getElementById('taskSearchInput');
  const statusFilter = document.getElementById('filterStatus');
  const priorityFilter = document.getElementById('filterPriority');
  const categoryFilter = document.getElementById('filterCategory');
  const dateFilter = document.getElementById('filterDate');
  const sortSelect = document.getElementById('sortTasks');

  if (searchInput) searchInput.value = '';
  if (statusFilter) statusFilter.value = 'All';
  if (priorityFilter) priorityFilter.value = 'All';
  if (categoryFilter) categoryFilter.value = 'All';
  if (dateFilter) dateFilter.value = 'All';
  if (sortSelect) sortSelect.value = 'newest';

  updateSidebarActiveFilter();
  loadTasks();
  showToast('Filters reset to default', 'info');
}

function updateSidebarActiveFilter() {
  document.querySelectorAll('.nav-item').forEach((item) => {
    item.classList.remove('active');
  });

  if (activeFilters.status === 'All' && activeFilters.category === 'All') {
    const navAll = document.getElementById('navItemAll');
    if (navAll) navAll.classList.add('active');
  } else if (activeFilters.status === 'Pending') {
    const navPending = document.getElementById('navItemPending');
    if (navPending) navPending.classList.add('active');
  } else if (activeFilters.status === 'Completed') {
    const navComp = document.getElementById('navItemCompleted');
    if (navComp) navComp.classList.add('active');
  } else if (activeFilters.status === 'Overdue') {
    const navOverdue = document.getElementById('navItemOverdue');
    if (navOverdue) navOverdue.classList.add('active');
  } else if (activeFilters.category !== 'All') {
    const navCat = document.getElementById(`navItemCat${activeFilters.category}`);
    if (navCat) navCat.classList.add('active');
  }
}

// Modal Form & Close Event Listeners
function setupModalListeners() {
  const form = document.getElementById('taskForm');
  if (form) {
    form.addEventListener('submit', handleTaskFormSubmit);
  }

  // Close modals when clicking backdrop
  document.querySelectorAll('.modal-overlay').forEach((modal) => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
      }
    });
  });
}

// Toggle mobile sidebar
function toggleMobileSidebar() {
  const sidebar = document.getElementById('appSidebar');
  if (sidebar) sidebar.classList.toggle('open');
}
