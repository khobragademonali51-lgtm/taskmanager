/**
 * Central API Client and Global Utilities
 */

const API_BASE = '/api';

// Toast Notification Engine
function showToast(message, type = 'info') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
  };

  toast.innerHTML = `
    <span style="font-weight: 700; font-size: 1.1rem;">${icons[type] || '•'}</span>
    <span style="flex: 1;">${message}</span>
  `;

  container.appendChild(toast);

  // Auto remove after 3.5 seconds
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3500);
}

// Global Fetch with Auth Header
async function apiRequest(endpoint, method = 'GET', data = null) {
  const token = localStorage.getItem('tm_token');

  const headers = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options = {
    method,
    headers,
  };

  if (data && ['POST', 'PUT', 'PATCH'].includes(method)) {
    options.body = JSON.stringify(data);
  }

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, options);
    const result = await res.json();

    if (res.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('tm_token');
      localStorage.removeItem('tm_user');
      if (!window.location.pathname.includes('login') && !window.location.pathname.includes('register') && window.location.pathname !== '/') {
        showToast('Session expired. Redirecting to login...', 'warning');
        setTimeout(() => {
          window.location.href = '/login.html';
        }, 1200);
      }
      throw new Error(result.message || 'Unauthorized');
    }

    if (!res.ok) {
      throw new Error(result.message || 'API request failed');
    }

    return result;
  } catch (err) {
    throw err;
  }
}

// Theme Manager
function initTheme() {
  const savedTheme = localStorage.getItem('tm_theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcons(savedTheme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('tm_theme', next);
  updateThemeIcons(next);
  showToast(`Switched to ${next} mode`, 'info');
}

function updateThemeIcons(theme) {
  const btns = document.querySelectorAll('.theme-toggle-btn');
  btns.forEach(btn => {
    btn.innerHTML = theme === 'dark' 
      ? '<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72 1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42m12.72-12.72 1.42-1.42"/></svg>'
      : '<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  });
}

// Date Formatter Utilities
function formatDate(dateString) {
  if (!dateString) return 'No date';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatRelativeDue(dateString, timeString = '23:59') {
  if (!dateString) return '';
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const due = new Date(`${dateString}T${timeString || '23:59'}:00`);
  const diffTime = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (due < now) {
    return { text: 'Overdue', isOverdue: true };
  } else if (dateString === todayStr) {
    return { text: `Due Today at ${timeString}`, isOverdue: false, isToday: true };
  } else if (diffDays === 1) {
    return { text: `Tomorrow at ${timeString}`, isOverdue: false };
  } else {
    return { text: formatDate(dateString), isOverdue: false };
  }
}

// Initialize theme on load
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
});
