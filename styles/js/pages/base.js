// --------------------------- CONFIG ---------------------------
const LOGIN_KEY = "faenoir_user";
const AVATAR_CACHE_KEY = "faenoir_avatar";
const GAS_URL = "https://script.google.com/macros/s/AKfycbwJSeafkuiUukVYBx44yBVnKgYVhHxF5cAPB1QC5R2IoSldZ-jDSd_GbVOkXNb0-9gm2g/exec";

// --------------------------- LOGIN FLOW ---------------------------
function startToyhouseLogin() {
  fetch(GAS_URL + "?action=auth")
    .then(res => res.json())
    .then(data => {
      const popup = window.open(data.url, "toyhouse_login", "width=600,height=700");
      if (!popup) alert("Please allow pop-ups for Toyhouse login!");
    })
    .catch(err => console.error("Toyhouse auth fetch failed:", err));
}

// Listen for message from the popup (OAuth callback)
window.addEventListener("message", async (event) => {
  const data = event.data;
  if (!data || !data.ok || !data.user) return;

  const session = {
    token: data.token,
    username: data.user.username,
    id: data.user.id,
    avatar: data.user.avatar || "",
    timestamp: Date.now()
  };

  localStorage.setItem(LOGIN_KEY, JSON.stringify(session));
  if (session.avatar) localStorage.setItem(AVATAR_CACHE_KEY, session.avatar);

  // Fetch role from GAS
  try {
    const roleResp = await fetch(`${GAS_URL}?action=me&userId=${session.id}`).then(r => r.json());
    session.role = roleResp.role || "user";
    localStorage.setItem(LOGIN_KEY, JSON.stringify(session));
  } catch (e) {
    console.error("Error fetching user role:", e);
    session.role = "user";
  }

  showUser(session.username, session.avatar);
});

// --------------------------- UI HANDLERS ---------------------------
function showUser(username, avatar) {
  $("#login-btn").addClass("d-none");
  $("#user-info").removeClass("d-none");
  $("#user-avatar").attr("src", avatar || localStorage.getItem(AVATAR_CACHE_KEY) || "assets/default-avatar.png");
  $("#user-name").text(username);
}

function logout() {
  localStorage.removeItem(LOGIN_KEY);
  localStorage.removeItem(AVATAR_CACHE_KEY);
  $("#user-info").addClass("d-none");
  $("#login-btn").removeClass("d-none");
}

// --------------------------- SESSION ---------------------------
function checkExistingLogin() {
  const session = JSON.parse(localStorage.getItem(LOGIN_KEY) || "null");
  if (!session) return;

  // Auto-expire after 24 hours
  if (Date.now() - session.timestamp > 24*60*60*1000) {
    localStorage.removeItem(LOGIN_KEY);
    return;
  }

  showUser(session.username, session.avatar);
}

// --------------------------- INIT ---------------------------
$(document).ready(() => {
  $("#toyhouse-login").on("click", startToyhouseLogin);
  $("#logout-btn").on("click", logout);
  checkExistingLogin();
});
