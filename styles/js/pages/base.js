/* ==================================================================== */
/* Import Utilities
======================================================================= */
import { charadex } from '../utilities.js';

/* ==================================================================== */
/* CONFIG
======================================================================= */
const LOGIN_KEY = 'faenoir_user';
const SHEET_URL = 'https://script.google.com/macros/s/AKfycbx5f4V1TjMagGoZkb_6cHHuXrEWWE8xgBkv1Q19JS8Am7mjgwfgbE1HZaM89YipmzrteA/exec';
const AVATARS = {}; // optional username→image map


/* ==================================================================== */
/* TOYHOUSE LOGIN (REDIRECT + CALLBACK SIMULATION)
======================================================================= */

// User clicks "Sign in with Toyhouse"
function startToyhouLogin() {
  const callback = encodeURIComponent(
    window.location.origin + window.location.pathname + '?toyhou_callback=success'
  );

  // Redirect to Toyhouse’s login page (this works with any TH user)
  window.location.href = `https://toyhou.se/~login?redirect=${callback}`;
}


// When Toyhouse sends them back here:
function handleToyhouCallback() {
  const url = new URL(window.location.href);
  if (url.searchParams.get('toyhou_callback') !== 'success') return;

  console.log('Toyhouse login detected');

  // Toyhouse does NOT give us the username; user enters it once
  let username = url.searchParams.get('user');
  if (!username) {
    username = prompt("Enter your Toyhouse username:");
    if (!username) return alert("Toyhouse login cancelled.");
  }

  const session = {
    username,
    toyhou: true,
    timestamp: Date.now()
  };

  localStorage.setItem(LOGIN_KEY, JSON.stringify(session));

  showUser(username);
  logToSheet(username, "Toyhouse Login");

  // Remove callback from URL
  history.replaceState({}, document.title, window.location.pathname);
}


/* ==================================================================== */
/* DEFAULT FRONTEND LOGIN (LocalStorage)
======================================================================= */

async function signIn() {
  const username = prompt("Enter your username:");
  if (!username) return alert("Username cannot be empty.");

  let passwords = JSON.parse(localStorage.getItem('faenoir_passwords')) || {};

  if (passwords[username]) {
    // existing user login
    const pw = prompt("Enter your password:");
    if (pw !== passwords[username]) return alert("Incorrect password.");
  } else {
    // first-time user registration
    const pw = prompt("Set a password for this account:");
    if (!pw) return alert("Password cannot be empty.");
    passwords[username] = pw;
    localStorage.setItem('faenoir_passwords', JSON.stringify(passwords));
    alert("Account created!");
  }

  const session = { username, timestamp: Date.now() };
  localStorage.setItem(LOGIN_KEY, JSON.stringify(session));

  showUser(username);
  logToSheet(username, 'Sign In');
}


/* ==================================================================== */
/* SHOW + LOGOUT + SESSION
======================================================================= */

function showUser(username) {
  $('#login-btn').addClass('d-none');
  $('#user-info').removeClass('d-none');
  $('#user-avatar').attr('src', AVATARS[username] || 'assets/default-avatar.png');
  $('#user-name').text(username);
}

function logout() {
  const session = JSON.parse(localStorage.getItem(LOGIN_KEY));
  if (session) logToSheet(session.username, 'Sign Out');

  localStorage.removeItem(LOGIN_KEY);
  $('#user-info').addClass('d-none');
  $('#login-btn').removeClass('d-none');
}

function checkLogin() {
  const session = JSON.parse(localStorage.getItem(LOGIN_KEY));
  if (!session) return;

  // Session expires after 24 hours
  if (Date.now() - session.timestamp > 24 * 60 * 60 * 1000) {
    localStorage.removeItem(LOGIN_KEY);
    return;
  }

  showUser(session.username);
}


/* ==================================================================== */
/* GOOGLE SHEETS LOGGING
======================================================================= */

function logToSheet(username, action) {
  fetch(SHEET_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, action })
  })
  .then(r => r.json())
  .then(data => console.log("Sheet:", data))
  .catch(err => console.error("Sheet error:", err));
}


/* ==================================================================== */
/* BUTTON SETUP
======================================================================= */

function initLoginButtons() {
  $(document).off('click.faenoirLogin');

  $(document).on('click.faenoirLogin', '#login-btn, #login-submit', signIn);
  $(document).on('click.faenoirLogin', '#logout-btn', logout);
  $(document).on('click.faenoirLogin', '#toyhou-login-btn', startToyhouLogin);
}


/* ==================================================================== */
/* OBSERVE HEADER (Charadex injects it later)
======================================================================= */

const headerObserver = new MutationObserver(() => {
  if ($('#login-btn').length && $('#logout-btn').length) {
    initLoginButtons();
    checkLogin();
    headerObserver.disconnect();
  }
});

headerObserver.observe(document.body, { childList: true, subtree: true });


/* ==================================================================== */
/* LOAD CHARADEx + LOGIN CALLBACKS
======================================================================= */

document.addEventListener("DOMContentLoaded", () => {
  charadex.tools.loadIncludedFiles();
  charadex.tools.updateMeta();
  charadex.tools.loadPage('#charadex-body', 100);

  handleToyhouCallback(); // NEW: detect Toyhouse login
});
