import axios from "axios";
import cookie from "cookie";

export default async function handler(req, res) {
  const {
    TOYHOU_CLIENT_ID,
    TOYHOU_CLIENT_SECRET,
    TOYHOU_TOKEN_URL,
    TOYHOU_USERINFO_URL,
    BACKEND_BASE_URL,
    FRONTEND_ORIGIN
  } = process.env;

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
        redirect_uri: `${BACKEND_BASE_URL}/api/auth/callback`
      }).toString(),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const tokenData = tokenResp.data;

    // Fetch user info
    const userResp = await axios.get(TOYHOU_USERINFO_URL, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });

    // Set cookie with user info
    res.setHeader(
      "Set-Cookie",
      cookie.serialize("toyhou_user", JSON.stringify(userResp.data), {
        httpOnly: false,
        path: "/",
        sameSite: "lax"
      })
    );

    // Redirect to frontend
    res.redirect(`${FRONTEND_ORIGIN}?toyhou_callback=success`);
  } catch (err) {
    console.error("OAuth error:", err.response?.data || err.message);
    res.redirect(`${FRONTEND_ORIGIN}?toyhou_callback=error`);
  }
}

