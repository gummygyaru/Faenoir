import express from "express";

const router = express.Router();

// /me endpoint to get logged-in user
router.get("/", (req, res) => {
  if (!req.session || !req.session.toyhou) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  // Return only user info — never send access_token to browser in production
  res.json({ user: req.session.toyhou.user });
});

export default router;
