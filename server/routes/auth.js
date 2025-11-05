import express from "express";
import axios from "axios";
import cookieParser from "cookie-parser";

const router = express.Router();
router.use(cookieParser());

const {
  TOYHOU_CLIENT_ID,
  TOYHOU_CLIENT_SECRET,
  TOYHOU_AUTH_URL,
  TOYHOU_TOKEN_URL,
  TOYHOU_USERINFO_URL,
  BACKEND_BASE_URL,
  FRONTEND_ORIGIN
} = process.env;

const getRedirectURI = () => `${BACKEND_BASE_URL}/auth/toyhou/callback`;

// Redirect user to Toyhou login
router.get("/toyhou", (req, res) => {
  const params = new URLSearchParams({
    client_id: TOYHOU_CLIENT_ID,
    redirect_uri: getRedirectURI(),
    response_type: "code",
    state: "faenoir-optional-csrf"
  }).toString();

  res.redirect(`${TOYHOU_AUTH_URL}?${params}`);
});

// Callback after login
router.get("/toyhou/callback", async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send("Missing code");

  try {
    const tokenResp = await axios.post(
      TOYHOU_TOKEN_URL,
      new URLSearchParams({
        client_id: TOYHOU_CLIENT_ID,
        client_secret: TOYHOU_CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: getRedirectURI()
      }).toString(),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const tokenData = tokenResp.data;

    // Get user info
    const userResp = await axios.get(TOYHOU_USERINFO_URL, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });

    // Store user in cookie
    res.cookie("toyhou_user", JSON.stringify(userResp.data), {
      httpOnly: false,
      sameSite: "Lax"
    });

    // Redirect back to frontend
    res.redirect(`${FRONTEND_ORIGIN}?toyhou_callback=success`);
  } catch (err) {
    console.error("OAuth error:", err.response?.data || err.message);
    res.redirect(`${FRONTEND_ORIGIN}?toyhou_callback=error`);
  }
});

export default router;
