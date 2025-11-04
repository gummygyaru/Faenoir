const express = require('express');
const router = express.Router();
const axios = require('axios');

const {
  TOYHOUSE_CLIENT_ID,
  TOYHOUSE_CLIENT_SECRET,
  TOYHOUSE_AUTH_URL,
  TOYHOUSE_TOKEN_URL,
  TOYHOUSE_USERINFO_URL,
  BACKEND_BASE_URL,
  FRONTEND_ORIGIN
} = process.env;

// start auth: redirect user to Toyhou's authorize endpoint
router.get('/toyhou', (req, res) => {
  const redirect_uri = `${BACKEND_BASE_URL}/auth/callback/toyhou`;
  // standard OAuth2 query: response_type=code
  const params = new URLSearchParams({
    client_id: TOYHOUSE_CLIENT_ID,
    redirect_uri,
    response_type: 'code',
    // scope: add if Toyhou requires scopes; else remove
    // scope: 'basic',
    state: 'faenoir-optional-csrf' // production: generate per-session random state
  }).toString();

  res.redirect(`${TOYHOUSE_AUTH_URL}?${params}`);
});

// callback: Toyhou redirects here with ?code=...
router.get('/callback/toyhou', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send('Missing code');

  try {
    // exchange code for access token - standard OAuth2 token request
    const tokenResp = await axios.post(TOYHOUSE_TOKEN_URL, new URLSearchParams({
      client_id: TOYHOUSE_CLIENT_ID,
      client_secret: TOYHOUSE_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: `${BACKEND_BASE_URL}/auth/callback/toyhou`
    }).toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const tokenData = tokenResp.data;

    // tokenData may contain access_token and maybe user info.
    // If Toyhou provides a userinfo endpoint, call it:
    let userInfo = null;
    if (TOYHOUSE_USERINFO_URL && tokenData.access_token) {
      const u = await axios.get(TOYHOUSE_USERINFO_URL, {
        headers: { Authorization: `Bearer ${tokenData.access_token}` }
      });
      userInfo = u.data;
    } else {
      // fallback: some OAuth servers return identifying fields in token response
      userInfo = tokenData.user || tokenData;
    }

    // Save minimal session (example)
    req.session.toyhou = {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      user: userInfo
    };

    // Redirect back to your frontend. You can choose to send an opaque session id instead.
    // Avoid stuffing access tokens into query strings in production.
    res.redirect(`${FRONTEND_ORIGIN}/?toyhou_callback=success`);
  } catch (err) {
    console.error('Token exchange error', err.response ? err.response.data : err.message);
    return res.redirect(`${FRONTEND_ORIGIN}/?toyhou_callback=error`);
  }
});

module.exports = router;

