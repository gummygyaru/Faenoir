import express from "express";
import axios from "axios";

const router = express.Router();

// Environment variables
const {
  TOYHOU_CLIENT_ID,
  TOYHOU_CLIENT_SECRET,
  TOYHOU_AUTH_URL,
  TOYHOU_TOKEN_URL,
  TOYHOU_USERINFO_URL,
  BACKEND_BASE_URL,
  FRONTEND_ORIGIN,
  NODE_ENV
} = process.env;

// Helper: get redirect URI (switches between local and production)
const getRedirectURI = () => {
  // Matches the route your backend listens on
  return `${BACKEND_BASE_URL || (NODE_ENV !== "production" ? "http://localhost:4000" : "")}/auth/toyhou/callback`;
};

// 1️⃣ Start auth: redirect user to Toyhou's authorize endpoint
router.get("/toyhou", (req, res) => {
  const redirect_uri = getRedirectURI();

  const params = new URLSearchParams({
    client_id: TOYHOU_CLIENT_ID,
    redirect_uri,
    response_type: "code",
    state: "faenoir-optional-csrf", // TODO: generate per-session random state in production
  }).toString();

  res.redirect(`${TOYHOU_AUTH_URL}?${params}`);
});

// 2️⃣ Callback: Toyhou redirects here with ?code=...
router.get("/toyhou/callback", async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send("Missing code");

  try {
    // Exchange code for access token
    const tokenResp = await axios.post(
      TOYHOU_TOKEN_URL,
      new URLSearchParams({
        client_id: TOYHOU_CLIENT_ID,
        client_secret: TOYHOU_CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: getRedirectURI(),
      }).toString(),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const tokenData = tokenResp.data;

    // Fetch user info if endpoint available
    let userInfo = null;
    if (TOYHOU_USERINFO_URL && tokenData.access_token) {
      const userResp = await axios.get(TOYHOU_USERINFO_URL, {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      userInfo = userResp.data;
    } else {
      userInfo = tokenData.user || tokenData;
    }

    // Save minimal session (or cookie if preferred)
    req.session = req.session || {};
    req.session.toyhou = {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      user: userInfo,
    };

    // Redirect back to frontend safely
    res.redirect(`${FRONTEND_ORIGIN || "http://localhost:4000"}/?toyhou_callback=success`);
  } catch (err) {
    console.error("Token exchange error:", err.response ? err.response.data : err.message);
    res.redirect(`${FRONTEND_ORIGIN || "http://localhost:4000"}/?toyhou_callback=error`);
  }
});

export default router;
