import express from "express";
import fetch from "node-fetch";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

// Load .env only in development
if (process.env.NODE_ENV !== "production") dotenv.config();

const app = express();
app.use(cookieParser());

// 1️⃣ Environment variables
const CLIENT_ID = process.env.TOYHOU_CLIENT_ID;
const CLIENT_SECRET = process.env.TOYHOU_CLIENT_SECRET;

// Use Render URL in production, localhost in dev
const PORT = process.env.PORT || 4000;
const FRONTEND_ORIGIN =
  process.env.FRONTEND_ORIGIN || "http://localhost:4000";
const BACKEND_BASE_URL =
  process.env.BACKEND_BASE_URL || `http://localhost:${PORT}`;

const REDIRECT_URI =
  process.env.TOYHOU_REDIRECT_URI ||
  `${BACKEND_BASE_URL}/auth/toyhou/callback`;

// 2️⃣ Redirect user to Toyhou for login
app.get("/auth/toyhou", (req, res) => {
  const redirect = `https://toyhou.se/~login/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(
    REDIRECT_URI
  )}&response_type=code`;
  res.redirect(redirect);
});

// 3️⃣ Handle Toyhou callback
app.get("/auth/toyhou/callback", async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send("Missing code");

  try {
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

    // Fetch user info
    const userResp = await fetch("https://toyhou.se/~api/v1/me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const userData = await userResp.json();

    // Save user in cookie
    res.cookie("toyhou_user", JSON.stringify(userData), {
      httpOnly: process.env.NODE_ENV === "production", // secure in prod
      sameSite: "Lax",
    });

    // Redirect back to frontend
    res.redirect(`${FRONTEND_ORIGIN}?toyhou_callback=success`);
  } catch (err) {
    console.error("Callback error:", err);
    res.status(500).send("Server error");
  }
});

// 4️⃣ /me endpoint for frontend
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

// 5️⃣ Start server
app.listen(PORT, () => {
  console.log(`✅ Toyhou auth server running on port ${PORT}`);
});
