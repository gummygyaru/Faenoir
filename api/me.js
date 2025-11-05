import cookie from "cookie";

export default function handler(req, res) {
  const cookies = cookie.parse(req.headers.cookie || "");
  if (!cookies.toyhou_user) return res.status(401).json({ error: "Not logged in" });

  const user = JSON.parse(cookies.toyhou_user);
  res.status(200).json({ user });
}

