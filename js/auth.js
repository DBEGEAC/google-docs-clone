const users = [
  { username: 'admin', password: 'admin123', role: 'admin', suspended: false },
  { username: 'user1', password: 'user123', role: 'user', suspended: false }
];

function saveToLocal(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getFromLocal(key) {
  return JSON.parse(localStorage.getItem(key));
}

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');

  if (loginForm) {
    loginForm.addEventListener('submit', e => {
      e.preventDefault();
      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;
      const user = users.find(u => u.username === username && u.password === password && !u.suspended);
      if (user) {
        saveToLocal('loggedInUser', user);
        window.location.href = 'dashboard.html';
      } else {
        alert('Invalid credentials or suspended account');
      }
    });
  }

  if (registerForm) {
    registerForm.addEventListener('submit', e => {
      e.preventDefault();
      const username = document.getElementById('newUsername').value;
      const password = document.getElementById('newPassword').value;
      users.push({ username, password, role: 'user', suspended: false });
      alert('User registered. Please login.');
      window.location.href = 'login.html';
    });
  }
});
