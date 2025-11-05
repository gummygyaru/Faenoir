import { URLSearchParams } from "url";

export default function handler(req, res) {
  const {
    TOYHOU_CLIENT_ID,
    BACKEND_BASE_URL
  } = process.env;

  const redirectUri = `${BACKEND_BASE_URL}/api/auth/callback`;

  const params = new URLSearchParams({
    client_id: TOYHOU_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    state: "faenoir-optional-csrf"
  }).toString();

  res.redirect(`https://toyhou.se/~oauth/authorize?${params}`);
}

