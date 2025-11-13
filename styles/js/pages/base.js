/* ==================================================================== */
/* Import Utilities
======================================================================= */
import { charadex } from '../utilities.js';

/* ==================================================================== */
/* Toyhou “Login” Check (Visual Only)
======================================================================= */
async function checkToyhouLogin() {
  const url = new URL(window.location.href);
  if (url.searchParams.get('toyhou_callback') === 'success') {
    console.log('Toyhou callback detected – treating as logged in (visual only)');
    const username = url.searchParams.get('user') || 'Toyhou User';
    showUser(username);
    logToSheet(username, 'Toyhou Login');
    history.replaceState({}, document.title, window.location.pathname); // clean up URL
  }
}

/* ==================================================================== */
/* Load Charadex Core
======================================================================= */
document.addEventListener("DOMContentLoaded", () => {
  // Run Charadex utilities
  charadex.tools.loadIncludedFiles();
  charadex.tools.updateMeta();
  charadex.tools.loadPage('#charadex-body', 100);

  // Run login checks
  checkToyhouLogin();
});

/* ==================================================================== */
/* Frontend Login System (LocalStorage + Google Sheets)
======================================================================= */

const LOGIN_KEY = 'faenoir_user';
const SHEET_URL = 'https://script.google.com/macros/s/AKfycbx5f4V1TjMagGoZkb_6cHHuXrEWWE8xgBkv1Q19JS8Am7mjgwfgbE1HZaM89YipmzrteA/exec';
const AVATARS = {}; // optional custom avatar map

/* ==================== SIGN IN ==================== */
async function signIn() {
  const username = prompt("Enter your username:");
  if (!username) return alert("Username cannot be empty.");

  let passwords = JSON.parse(localStorage.getItem('faenoir_passwords')) || {};

  if (passwords[username]) {
    // existing user
    const pw = prompt("Enter your password:");
    if (pw !== passwords[username]) return alert("Incorrect password.");
  } else {
    // new user
    const pw = prompt("Set a password for your account:");
    if (!pw) return alert("Password cannot be empty.");
    passwords[username] = pw;
    localStorage.setItem('faenoir_passwords', JSON.stringify(passwords));
    alert("Account created successfully!");
  }

  const session = { username, timestamp: Date.now() };
  localStorage.setItem(LOGIN_KEY, JSON.stringify(session));

  showUser(username);
  logToSheet(username, 'Sign In');
}

/* ==================== SHOW USER ==================== */
function showUser(username) {
  $('#login-btn').addClass('d-none');
  $('#user-info').removeClass('d-none');
  $('#user-avatar').attr('src', AVATARS[username] || 'assets/default-avatar.png');
  $('#user-name').text(username);
}

/* ==================== LOGOUT ==================== */
function logout() {
  const session = JSON.parse(localStorage.getItem(LOGIN_KEY));
  if (session) logToSheet(session.username, 'Sign Out');

  localStorage.removeItem(LOGIN_KEY);
  $('#user-info').addClass('d-none');
  $('#login-btn').removeClass('d-none');
}

/* ==================== LOG TO GOOGLE SHEET ==================== */
function logToSheet(username, action) {
  fetch(SHEET_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, action })
  })
  .then(res => res.json())
  .then(data => console.log('Sheet updated:', data))
  .catch(err => console.error('Sheet update error:', err));
}

/* ==================== SESSION CHECK ==================== */
function checkLogin() {
  const session = JSON.parse(localStorage.getItem(LOGIN_KEY));
  if (!session) return;

  const now = Date.now();
  if (now - session.timestamp > 24 * 60 * 60 * 1000) {
    localStorage.removeItem(LOGIN_KEY);
    return;
  }

  showUser(session.username);
}

/* ==================== BUTTON SETUP ==================== */
function initLoginButtons() {
  // ensure clean re-bind
  $(document).off('click.faenoirLogin');
  $(document).on('click.faenoirLogin', '#login-submit, #login-btn', signIn);
  $(document).on('click.faenoirLogin', '#logout-btn', logout);
}

/* ==================== OBSERVE HEADER ==================== */
const headerObserver = new MutationObserver(() => {
  if ($('#login-btn').length && $('#logout-btn').length) {
    initLoginButtons();
    checkLogin();
    headerObserver.disconnect();
  }
});

headerObserver.observe(document.body, { childList: true, subtree: true });
