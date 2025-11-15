/* =========================================================================== 
   base.js — Toyhouse-Only OAuth Login for Faenoir
   Backend: Google Apps Script (GAS)
=========================================================================== */

import { charadex } from '../utilities.js';

/* --------------------------- CONFIG --------------------------- */

const LOGIN_KEY = 'faenoir_user';
const AVATAR_CACHE_KEY = 'faenoir_avatar';
const LOGIN_HISTORY_KEY = 'faenoir_login_history';

// Your GAS endpoint (exec)
const GAS_URL =
  "https://script.google.com/macros/s/AKfycbwJSeafkuiUukVYBx44yBVnKgYVhHxF5cAPB1QC5R2IoSldZ-jDSd_GbVOkXNb0-9gm2g/exec";

/* --------------------------- GAS HELPERS --------------------------- */

async function gasGET(params = {}) {
  const url = new URL(GAS_URL);
  for (const k in params) url.searchParams.set(k, params[k]);
  const res = await fetch(url);
  return res.json();
}

/* ---------------------- TOYHOUSE LOGIN POPUP ---------------------- */

function startToyhouseLogin() {
  // GAS endpoint generates OAuth URL and redirects to Toyhouse authorize
  const authURL = `${GAS_URL}?action=toyhouStart`;

  const popup = window.open(
    authURL,
    "th_oauth",
    "width=600,height=700,left=200,top=100"
  );

  if (!popup) alert("Please allow pop-ups for Toyhouse login!");
}

/* --------------------------- HANDLE CALLBACK --------------------------- */

window.addEventListener("message", async (event) => {
  const data = event.data;
  if (!data || !data.ok || !data.user) return;

  const { token, user } = data;

  const session = {
    token,
    username: user.username,
    timestamp: Date.now(),
  };

  localStorage.setItem(LOGIN_KEY, JSON.stringify(session));

  if (user.avatar) localStorage.setItem(AVATAR_CACHE_KEY, user.avatar);

  // Fetch roles and avatar from GAS
  const roleResp = await gasGET({ action: "me", token });
  if (roleResp && roleResp.user) {
    session.roles = roleResp.user.roles || [];
    session.avatar = roleResp.user.avatar || user.avatar || "";
    localStorage.setItem(LOGIN_KEY, JSON.stringify(session));
    if (session.avatar) localStorage.setItem(AVATAR_CACHE_KEY, session.avatar);
  }

  showUser(session.username, session.avatar);
  recordLogin(session.username, "toyhouse");
});

/* --------------------------- UI HANDLERS --------------------------- */

function showUser(username, avatar) {
  $("#login-btn").addClass("d-none");
  $("#user-info").removeClass("d-none");

  const imgSrc = avatar || localStorage.getItem(AVATAR_CACHE_KEY) || "assets/default-avatar.png";
  $("#user-avatar").attr("src", imgSrc);
  $("#user-name").text(username);
}

function logout() {
  const session = JSON.parse(localStorage.getItem(LOGIN_KEY) || "{}");
  if (session.username) gasGET({ action: "log", username: session.username, reason: "logout" });

  localStorage.removeItem(LOGIN_KEY);
  localStorage.removeItem(AVATAR_CACHE_KEY);

  $("#user-info").addClass("d-none");
  $("#login-btn").removeClass("d-none");
}

/* --------------------------- ROLES --------------------------- */

function getRoles() {
  const session = JSON.parse(localStorage.getItem(LOGIN_KEY) || "{}");
  return session.roles || [];
}

export function isAdmin() {
  return getRoles().includes("admin");
}
export function isMod() {
  const roles = getRoles();
  return roles.includes("mod") || roles.includes("admin");
}

/* ------------------------ LOGIN HISTORY ------------------------ */

function recordLogin(username, method) {
  const now = new Date().toISOString();
  const history = JSON.parse(localStorage.getItem(LOGIN_HISTORY_KEY) || "[]");

  history.unshift({ user: username, method, ts: now });
  localStorage.setItem(LOGIN_HISTORY_KEY, JSON.stringify(history.slice(0, 50)));
}

export function lastLogin() {
  const history = JSON.parse(localStorage.getItem(LOGIN_HISTORY_KEY) || "[]");
  return history[0] || null;
}

/* ---------------------- SESSION CHECK ON LOAD ---------------------- */

function checkExistingLogin() {
  const session = JSON.parse(localStorage.getItem(LOGIN_KEY) || "null");
  if (!session) return;

  if (Date.now() - session.timestamp > 24 * 60 * 60 * 1000) {
    localStorage.removeItem(LOGIN_KEY);
    return;
  }

  showUser(session.username, session.avatar);
}

/* ---------------------- INIT BUTTON LOGIC ---------------------- */

function initButtons() {
  $(document).off("click.faelogin");
  $(document).on("click.faelogin", "#login-submit, #toyhouse-login", startToyhouseLogin);
  $(document).on("click.faelogin", "#logout-btn", logout);
}

/* --------------------------- OBSERVE HEADER --------------------------- */

const headerObserver = new MutationObserver(() => {
  if ($("#login-btn").length && $("#logout-btn").length) {
    initButtons();
    checkExistingLogin();
    headerObserver.disconnect();
  }
});

headerObserver.observe(document.body, { childList: true, subtree: true });

/* --------------------------- PAGE INIT --------------------------- */

document.addEventListener("DOMContentLoaded", () => {
  charadex.tools.loadIncludedFiles();
  charadex.tools.updateMeta();
  charadex.tools.loadPage("#charadex-body", 100);

  initButtons();
  checkExistingLogin();
});

window.faenoir = {
  startToyhouseLogin,
  getRoles,
  isAdmin,
  isMod,
  lastLogin
};
