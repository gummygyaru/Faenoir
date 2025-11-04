const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  if (!req.session || !req.session.toyhou) return res.status(401).json({ error: 'not authenticated' });
  // DO NOT return access_token to browser in production unless necessary.
  res.json({ user: req.session.toyhou.user });
});

module.exports = router;

