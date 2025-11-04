// server/index.js
import express from "express";
import fetch from "node-fetch";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(cookieParser());

// 1️⃣ Toyhou OAuth settings
const CLIENT_ID = process.env.TOYHOU_CLIENT_ID;
const CLIENT_SECRET = process.env.TOYHOU_CLIENT_SECRET;
const REDIRECT_URI = process.env.TOYHOU_REDIRECT_URI || "http://localhost:3000/auth/toyhou/callback";

// 2️⃣ Redirect user to Toyhou for login
app.get("/auth/toyhou", (req, res) => {
  const redirect = `https://toyhou.se/~login/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code`;
  res.redirect(redirect);
});

// 3️⃣ Handle Toyhou redirect
app.get("/auth/toyhou/callback", async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send("Missing code");

  // Exchange code for token
  const tokenResp = await fetch("https://toyhou.se/~login/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
      redirect_uri: REDIRECT_URI
    }),
  });

  const tokenData = await tokenResp.json();
  if (!tokenData.access_token) return res.status(400).send("OAuth failed");

  // Fetch user info
  const userResp = await fetch("https://toyhou.se/~api/v1/me", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  const userData = await userResp.json();

  // Save in cookie (simplified)
  res.cookie("toyhou_user", JSON.stringify(userData), {
    httpOnly: false,
    sameSite: "Lax",
  });

  // Redirect back to your site
  res.redirect("https://your-username.github.io/Faenoir/?toyhou_callback=success");
});

// 4️⃣ /me endpoint for frontend
app.get("/me", (req, res) => {
  try {
    const cookie = req.cookies.toyhou_user;
    if (!cookie) return res.status(401).json({ error: "Not logged in" });
    const user = JSON.parse(cookie);
    res.json({ user });
  } catch {
    res.status(400).json({ error: "Bad cookie" });
  }
});

app.listen(3000, () => console.log("Toyhou auth server running on port 3000"));
