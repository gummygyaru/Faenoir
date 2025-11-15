/* ===========================================================================
   base.js — Toyhouse-Only Login for Faenoir
   Backend: Google Apps Script (GAS)
   Flow:
   1) User clicks “Sign in with Toyhouse”
   2) GAS generates a verification code & HTML instructions
   3) User pastes code into Toyhouse profile
   4) GAS verifies the link & redirects back with ?token & ?user
   5) This script stores session + loads avatar + roles
=========================================================================== */

import { charadex } from '../utilities.js';

/* --------------------------- CONFIG --------------------------- */

const LOGIN_KEY = 'faenoir_user';
const AVATAR_CACHE_KEY = 'faenoir_avatar';
const LOGIN_HISTORY_KEY = 'faenoir_login_history';

// YOUR GOOGLE APPS SCRIPT WEB APP URL:
const GAS_URL =
  "https://script.google.com/macros/s/AKfycbwJSeafkuiUukVYBx44yBVnKgYVhHxF5cAPB1QC5R2IoSldZ-jDSd_GbVOkXNb0-9gm2g/exec";

/* --------------------------- GAS HELPERS --------------------------- */

async function gasGet(params = {}) {
  const url = new URL(GAS_URL);
  for (const k in params) url.searchParams.set(k, params[k]);
  const res = await fetch(url);
  return res.json();
}

async function gasPost(body = {}) {
  const res = await fetch(GAS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

/* ---------------------- TOYHOUSE LOGIN FLOW ---------------------- */

/** Opens the GAS Toyhouse verification page */
function startToyhouseLogin() {
  window.open(GAS_URL + "?action=toyhouStart", "_blank");
  alert(
    "A new tab has opened with Toyhouse verification instructions.\n" +
    "Paste the provided code into your Toyhouse profile,\nthen complete the form on that page.\n\n" +
    "Once verified, you'll be automatically redirected back here ❤️"
  );
}

/** Handles ?token= & ?user= returned by GAS */
function handleAuthRedirect() {
  const url = new URL(window.location.href);

  const token = url.searchParams.get("token");
  const username = url.searchParams.get("user");

  if (!token) return; // nothing to do

  const session = {
    token,
    username,
    timestamp: Date.now(),
  };

  localStorage.setItem(LOGIN_KEY, JSON.stringify(session));

  // Pull avatar & roles from GAS
  gasGet({ action: "me", token })
    .then((resp) => {
      if (resp.status === "success" && resp.user) {
        session.username = resp.user.username;
        session.roles = resp.user.roles || [];
        session.avatar = resp.user.avatar;

        localStorage.setItem(LOGIN_KEY, JSON.stringify(session));

        if (session.avatar)
          localStorage.setItem(AVATAR_CACHE_KEY, session.avatar);

        showUser(session.username);
        recordLogin(session.username, "toyhouse");
      } else {
        // fallback: at least log them in visually
        showUser(username || "Unknown User");
        recordLogin(username || "Unknown User", "toyhouse");
      }
    })
    .catch((e) => {
      console.error("Error loading user info:", e);
      showUser(username || "User");
    });

  // Clean up the URL
  history.replaceState({}, document.title, window.location.pathname);
}

/* --------------------------- UI HANDLERS --------------------------- */

/** Display logged-in user in the header */
function showUser(username) {
  $("#login-btn").addClass("d-none");
  $("#user-info").removeClass("d-none");

  const avatar =
    localStorage.getItem(AVATAR_CACHE_KEY) || "assets/default-avatar.png";

  $("#user-avatar").attr("src", avatar);
  $("#user-name").text(username);
}

/** Logout */
function logout() {
  const session = JSON.parse(localStorage.getItem(LOGIN_KEY) || "{}");

  if (session.username) {
    gasPost({ action: "log", username: session.username, reason: "logout" });
  }

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
  return getRoles().includes("mod");
}

/* ------------------------ LOGIN HISTORY ------------------------ */

function recordLogin(username, method) {
  const now = new Date().toISOString();

  const history =
    JSON.parse(localStorage.getItem(LOGIN_HISTORY_KEY) || "[]");

  history.unshift({ user: username, method, ts: now });

  localStorage.setItem(LOGIN_HISTORY_KEY, JSON.stringify(history.slice(0, 50)));
}

export function lastLogin() {
  const history =
    JSON.parse(localStorage.getItem(LOGIN_HISTORY_KEY) || "[]");
  return history[0] || null;
}

/* ---------------------- SESSION CHECK ON LOAD ---------------------- */

function checkExistingLogin() {
  const session = JSON.parse(localStorage.getItem(LOGIN_KEY) || "null");
  if (!session) return;

  // session expires after 24 hours
  if (Date.now() - session.timestamp > 24 * 60 * 60 * 1000) {
    localStorage.removeItem(LOGIN_KEY);
    return;
  }

  showUser(session.username);
}

/* ---------------------- INIT BUTTON LOGIC ---------------------- */

function initButtons() {
  $(document).off("click.faelogin");

  $(document).on("click.faelogin", "#open-login-modal", () =>
    $("#loginModal").modal("show")
  );

  $(document).on("click.faelogin", "#toyhouse-login", startToyhouseLogin);

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
  handleAuthRedirect();
});

// Expose utility helpers if needed globally
window.faenoir = {
  startToyhouseLogin,
  isAdmin,
  isMod,
  lastLogin,
};
