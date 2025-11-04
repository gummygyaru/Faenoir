import express from "express";
import fetch from "node-fetch";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(cookieParser());

// 1️⃣ Toyhou OAuth settings from .env
const CLIENT_ID = process.env.TOYHOU_CLIENT_ID;
const CLIENT_SECRET = process.env.TOYHOU_CLIENT_SECRET;
const REDIRECT_URI = process.env.TOYHOU_REDIRECT_URI;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN;
const PORT = process.env.PORT || 4000;

// 2️⃣ Redirect user to Toyhou for login
app.get("/auth/toyhou", (req, res) => {
  const redirect = `https://toyhou.se/~login/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(
    REDIRECT_URI
  )}&response_type=code`;
  res.redirect(redirect);
});

// 3️⃣ Handle Toyhou redirect
app.get("/auth/toyhou/callback", async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send("Missing code");

  // Exchange code for access token
  const tokenResp = await fetch("https://toyhou.se/~login/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
      redirect_uri: REDIRECT_URI,
    }),
  });

  const tokenData = await tokenResp.json();
  if (!tokenData.access_token) {
    console.error("OAuth error:", tokenData);
    return res.status(400).send("OAuth failed");
  }

  // Fetch user info from Toyhou API
  const userResp = await fetch("https://toyhou.se/~api/v1/me", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  const userData = await userResp.json();

  // Save user data in a cookie
  res.cookie("toyhou_user", JSON.stringify(userData), {
    httpOnly: false, // change to true in production for security
    sameSite: "Lax",
  });

  // Redirect back to frontend
  res.redirect(`${FRONTEND_ORIGIN}?toyhou_callback=success`);
});

// 4️⃣ Simple /me endpoint for the frontend
app.get("/me", (req, res) => {
  try {
    const cookie = req.cookies.toyhou_user;
    if (!cookie) return res.status(401).json({ error: "Not logged in" });
    const user = JSON.parse(cookie);
    res.json({ user });
  } catch {
    res.status(400).json({ error: "Invalid cookie" });
  }
});

// 5️⃣ Start the server
app.listen(PORT, () => {
  console.log(`✅ Toyhou auth server running on port ${PORT}`);
});
