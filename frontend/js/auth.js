/**
 * Authentication Handler: Login, Register, Logout & Guard
 */

// Check Auth Status on page load
function checkAuth(redirectIfLoggedIn = false) {
  const token = localStorage.getItem('tm_token');
  const path = window.location.pathname;

  if (redirectIfLoggedIn && token) {
    window.location.href = '/dashboard.html';
    return;
  }

  if (!redirectIfLoggedIn && !token) {
    if (!path.includes('login') && !path.includes('register') && path !== '/' && !path.endsWith('index.html')) {
      window.location.href = '/login.html';
    }
  }
}

// Get Logged In User
function getCurrentUser() {
  const user = localStorage.getItem('tm_user');
  try {
    return user ? JSON.parse(user) : null;
  } catch (e) {
    return null;
  }
}

// Handle Login Form
async function handleLogin(e) {
  e.preventDefault();
  const form = e.target;
  const email = form.email.value.trim();
  const password = form.password.value;
  const submitBtn = form.querySelector('button[type="submit"]');

  if (!email || !password) {
    showToast('Please enter both email and password', 'warning');
    return;
  }

  try {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner" style="width:16px;height:16px;margin:0;border-width:2px;"></span> Logging in...';

    const res = await apiRequest('/auth/login', 'POST', { email, password });

    if (res.success && res.data.token) {
      localStorage.setItem('tm_token', res.data.token);
      localStorage.setItem('tm_user', JSON.stringify(res.data));
      showToast('Login successful! Redirecting...', 'success');
      setTimeout(() => {
        window.location.href = '/dashboard.html';
      }, 800);
    }
  } catch (error) {
    showToast(error.message || 'Login failed. Please check your credentials.', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = 'Sign In';
  }
}

// Handle Register Form
async function handleRegister(e) {
  e.preventDefault();
  const form = e.target;
  const name = form.name.value.trim();
  const email = form.email.value.trim();
  const password = form.password.value;
  const confirmPassword = form.confirmPassword.value;
  const submitBtn = form.querySelector('button[type="submit"]');

  if (!name || !email || !password) {
    showToast('Please fill in all required fields', 'warning');
    return;
  }

  if (password.length < 6) {
    showToast('Password must be at least 6 characters long', 'warning');
    return;
  }

  if (password !== confirmPassword) {
    showToast('Passwords do not match', 'error');
    return;
  }

  try {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner" style="width:16px;height:16px;margin:0;border-width:2px;"></span> Creating account...';

    const res = await apiRequest('/auth/register', 'POST', { name, email, password });

    if (res.success && res.data.token) {
      localStorage.setItem('tm_token', res.data.token);
      localStorage.setItem('tm_user', JSON.stringify(res.data));
      showToast('Registration successful! Welcome!', 'success');
      setTimeout(() => {
        window.location.href = '/dashboard.html';
      }, 800);
    }
  } catch (error) {
    showToast(error.message || 'Registration failed. Email might already exist.', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = 'Create Account';
  }
}

// Handle Logout
function logoutUser() {
  localStorage.removeItem('tm_token');
  localStorage.removeItem('tm_user');
  showToast('You have been logged out.', 'info');
  setTimeout(() => {
    window.location.href = '/login.html';
  }, 500);
}

// Auto-fill demo credentials
function fillDemoCredentials() {
  const emailInput = document.getElementById('loginEmail');
  const passInput = document.getElementById('loginPassword');
  if (emailInput && passInput) {
    emailInput.value = 'demo@example.com';
    passInput.value = 'password123';
    showToast('Demo credentials filled! Click Sign In or Register if first time.', 'info');
  }
}
