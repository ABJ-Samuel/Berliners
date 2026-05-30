import { config } from '../../config.js';
import { ApiError } from '../../utils/errors.js';

// Google OAuth 2.0 / OpenID Connect Provider.
// Kapselt: Authorization-URL bauen, Code gegen Tokens tauschen, Profil holen.
// Weitere Provider (github, microsoft) lassen sich nach demselben Interface
// ergänzen: { name, isConfigured, getAuthorizationUrl, exchangeCodeForProfile }.

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';

export const googleProvider = {
  name: 'google',

  isConfigured() {
    return Boolean(config.oauth.google.clientId && config.oauth.google.clientSecret);
  },

  getAuthorizationUrl(state) {
    const params = new URLSearchParams({
      client_id: config.oauth.google.clientId,
      redirect_uri: config.oauth.google.redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      access_type: 'offline',
      prompt: 'select_account',
    });
    return `${AUTH_URL}?${params.toString()}`;
  },

  // Tauscht den Authorization Code gegen Tokens und liefert ein normalisiertes Profil.
  async exchangeCodeForProfile(code) {
    const tokenRes = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: config.oauth.google.clientId,
        client_secret: config.oauth.google.clientSecret,
        redirect_uri: config.oauth.google.redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      throw new ApiError(401, 'Unauthorized', 'Token-Austausch mit Google fehlgeschlagen.');
    }
    const tokens = await tokenRes.json();

    const userRes = await fetch(USERINFO_URL, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (!userRes.ok) {
      throw new ApiError(401, 'Unauthorized', 'Profil konnte nicht von Google abgerufen werden.');
    }
    const info = await userRes.json();

    if (!info.email) {
      throw new ApiError(401, 'Unauthorized', 'Google hat keine E-Mail-Adresse zurückgegeben.');
    }

    return {
      provider: 'google',
      providerId: info.sub,
      email: info.email,
      firstName: info.given_name ?? '',
      lastName: info.family_name ?? '',
      avatarUrl: info.picture ?? null,
    };
  },
};

const providers = {
  google: googleProvider,
};

export function getProvider(name) {
  return providers[name] ?? null;
}
