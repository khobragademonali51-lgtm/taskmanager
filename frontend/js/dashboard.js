/**
 * Dashboard Overview & Statistics Logic
 */

async function checkDatabaseHealth() {
  try {
    const res = await fetch('/api/health');
    const data = await res.json();
    const banner = document.getElementById('dbAlertBanner');
    if (banner) {
      if (data.database === 'disconnected') {
        banner.style.display = 'flex';
      } else {
        banner.style.display = 'none';
      }
    }
  } catch (e) {
    console.warn('Could not check database health status:', e);
  }
}

async function loadDashboardStats() {
  await checkDatabaseHealth();
  try {
    const res = await apiRequest('/tasks/stats/summary');
    if (res.success && res.data) {
      updateDashboardUI(res.data);
    }
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
  }
}

function updateDashboardUI(stats) {
  // Update metric counters
  const totalEl = document.getElementById('statTotal');
  const pendingEl = document.getElementById('statPending');
  const completedEl = document.getElementById('statCompleted');
  const overdueEl = document.getElementById('statOverdue');
  const highPriorityEl = document.getElementById('statHighPriority');

  if (totalEl) totalEl.textContent = stats.total;
  if (pendingEl) pendingEl.textContent = stats.pending;
  if (completedEl) completedEl.textContent = stats.completed;
  if (overdueEl) overdueEl.textContent = stats.overdue;
  if (highPriorityEl) highPriorityEl.textContent = stats.highPriority;

  // Update progress bar
  const percentEl = document.getElementById('statPercentage');
  const fillEl = document.getElementById('statProgressFill');
  if (percentEl) percentEl.textContent = `${stats.completionRate}%`;
  if (fillEl) fillEl.style.width = `${stats.completionRate}%`;

  // Update sidebar counter badges
  const badgeAll = document.getElementById('badgeAllTasks');
  const badgePending = document.getElementById('badgePending');
  const badgeCompleted = document.getElementById('badgeCompleted');
  const badgeOverdue = document.getElementById('badgeOverdue');
  const badgeHigh = document.getElementById('badgeHighPriority');

  if (badgeAll) badgeAll.textContent = stats.total;
  if (badgePending) badgePending.textContent = stats.pending;
  if (badgeCompleted) badgeCompleted.textContent = stats.completed;
  if (badgeOverdue) badgeOverdue.textContent = stats.overdue;
  if (badgeHigh) badgeHigh.textContent = stats.highPriority;

  // Update category badges in sidebar
  if (stats.categoryCounts) {
    const badgeStudy = document.getElementById('badgeCatStudy');
    const badgeWork = document.getElementById('badgeCatWork');
    const badgePersonal = document.getElementById('badgeCatPersonal');
    const badgeOther = document.getElementById('badgeCatOther');

    if (badgeStudy) badgeStudy.textContent = stats.categoryCounts.Study || 0;
    if (badgeWork) badgeWork.textContent = stats.categoryCounts.Work || 0;
    if (badgePersonal) badgePersonal.textContent = stats.categoryCounts.Personal || 0;
    if (badgeOther) badgeOther.textContent = stats.categoryCounts.Other || 0;
  }
}

function renderUserGreeting() {
  const user = getCurrentUser();
  const greetingEl = document.getElementById('userGreeting');
  const userNameEl = document.getElementById('sidebarUserName');
  const userEmailEl = document.getElementById('sidebarUserEmail');
  const avatarEl = document.getElementById('sidebarUserAvatar');

  if (user) {
    const hour = new Date().getHours();
    let timeOfDay = 'Good morning';
    if (hour >= 12 && hour < 17) timeOfDay = 'Good afternoon';
    else if (hour >= 17) timeOfDay = 'Good evening';

    if (greetingEl) {
      greetingEl.innerHTML = `${timeOfDay}, <span style="color: var(--primary);">${escapeHtml(user.name)}</span> 👋`;
    }
    if (userNameEl) userNameEl.textContent = user.name;
    if (userEmailEl) userEmailEl.textContent = user.email;
    if (avatarEl) {
      const initials = user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase();
      avatarEl.textContent = initials || 'U';
    }
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
