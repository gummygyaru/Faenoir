/* ==================================================================== */
/* Import Utilities
======================================================================= */
import { charadex } from '../utilities.js';

/* ==================================================================== */
/* Toyhou Login Check
======================================================================= */
async function checkToyhouLogin() {
  const url = new URL(window.location.href);
  if (url.searchParams.get('toyhou_callback') === 'success') {
    try {
      // Request the user profile from your backend
      const resp = await fetch('https://your-backend.example.com/me', {
        credentials: 'include'
      });
      if (resp.ok) {
        const data = await resp.json();
        console.log('Toyhou user', data.user);

        // Optional: Update UI dynamically
        const loginBtn = document.querySelector('.btn.btn-primary');
        if (loginBtn && data.user?.name) {
          loginBtn.textContent = `Welcome, ${data.user.name}`;
          loginBtn.classList.remove('btn-primary');
          loginBtn.classList.add('btn-success');
          loginBtn.href = '#'; // or a profile/settings page
        }

      } else {
        console.log('Not logged in');
      }
    } catch (err) {
      console.error('Toyhou login check failed:', err);
    }
  }
}

/* ==================================================================== */
/* Load
======================================================================= */
document.addEventListener("DOMContentLoaded", () => {
  checkToyhouLogin(); // ✅ runs on every page load

  charadex.tools.loadIncludedFiles();
  charadex.tools.updateMeta();
  charadex.tools.loadPage('#charadex-body', 100);
});
// ========== LOGIN SYSTEM ==========
const LOGIN_KEY = 'faenoir_user';
const SHEET_URL = 'https://script.google.com/macros/s/AKfycbx5f4V1TjMagGoZkb_6cHHuXrEWWE8xgBkv1Q19JS8Am7mjgwfgbE1HZaM89YipmzrteA/exec';
const AVATARS = {};

// Prompt user for username + password on login
async function signIn() {
  const username = prompt("Enter your username:");
  if (!username) return alert("Username cannot be empty.");

  let passwords = JSON.parse(localStorage.getItem('faenoir_passwords')) || {};

  if (passwords[username]) {
    const pw = prompt("Enter your password:");
    if (pw !== passwords[username]) return alert("Incorrect password.");
  } else {
    const pw = prompt("Set a password for your account:");
    if (!pw) return alert("Password cannot be empty.");
    passwords[username] = pw;
    localStorage.setItem('faenoir_passwords', JSON.stringify(passwords));
    alert("Account created successfully!");
  }

  const session = { username, timestamp: new Date().getTime() };
  localStorage.setItem(LOGIN_KEY, JSON.stringify(session));

  showUser(username);
  logToSheet(username, 'Sign In');
}

// Show user info in navbar
function showUser(username) {
  $('#login-btn').addClass('d-none');
  $('#user-info').removeClass('d-none');
  $('#user-avatar').attr('src', AVATARS[username] || '../assets/default-avatar.png');
  $('#user-name').text(username);
}

// Logout
function logout() {
  const session = JSON.parse(localStorage.getItem(LOGIN_KEY));
  if (session) logToSheet(session.username, 'Sign Out');
  localStorage.removeItem(LOGIN_KEY);
  $('#user-info').addClass('d-none');
  $('#login-btn').removeClass('d-none');
}

// Log to Google Sheet
function logToSheet(username, action) {
  fetch(SHEET_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, action })
  })
  .then(res => res.json())
  .then(data => console.log('Sheet updated', data))
  .catch(err => console.error('Sheet update error', err));
}

// Check session on page load
function checkLogin() {
  const session = JSON.parse(localStorage.getItem(LOGIN_KEY));
  if (!session) return;

  const now = new Date().getTime();
  if (now - session.timestamp > 24 * 60 * 60 * 1000) {
    localStorage.removeItem(LOGIN_KEY);
    return;
  }

  showUser(session.username);
}

// Wait for header to finish loading before attaching listeners
function initLoginButtons() {
  // use delegated event handlers so buttons can appear later
  $(document).off('click.faenoirLogin'); // prevent duplicate bindings
  $(document).on('click.faenoirLogin', '#login-submit', signIn);
  $(document).on('click.faenoirLogin', '#logout-btn', logout);
}

// Observe when header gets injected
const headerObserver = new MutationObserver(() => {
  if ($('#login-btn').length && $('#logout-btn').length) {
    initLoginButtons();
    checkLogin();
    headerObserver.disconnect();
  }
});

headerObserver.observe(document.body, { childList: true, subtree: true });
