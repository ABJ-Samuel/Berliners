import crypto from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { config, SUPPORTED_PROVIDERS } from '../config.js';
import { getProvider } from '../auth/providers/google.js';
import {
  signAccessToken,
  issueRefreshToken,
  verifyRefreshToken,
  revokeRefreshToken,
  revokeAllRefreshTokens,
  signStateToken,
  verifyStateToken,
} from '../auth/tokens.js';
import { upsertOAuthUser, toUserDto } from '../services/userService.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { badRequest, unauthorized } from '../utils/errors.js';

const router = Router();

const STATE_COOKIE = 'oauth_state';
const stateCookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: config.isProd,
  signed: true,
  maxAge: 10 * 60 * 1000,
  path: '/',
};

function resolveProviderOr400(name) {
  if (!SUPPORTED_PROVIDERS.includes(name)) {
    throw badRequest(`Nicht unterstützter OAuth Provider: ${name}`);
  }
  const provider = getProvider(name);
  if (!provider || !provider.isConfigured()) {
    throw badRequest(`OAuth Provider "${name}" ist nicht konfiguriert.`);
  }
  return provider;
}

// GET /auth/oauth/:provider/login  -> Redirect zum OAuth Provider
router.get(
  '/oauth/:provider/login',
  asyncHandler(async (req, res) => {
    const provider = resolveProviderOr400(req.params.provider);

    // CSRF-Schutz: nonce im signierten Cookie, signiertes state-Token an den Provider.
    const nonce = crypto.randomBytes(16).toString('hex');
    const redirectUri = typeof req.query.redirectUri === 'string' ? req.query.redirectUri : null;
    const state = signStateToken({ nonce, provider: provider.name, redirectUri });

    res.cookie(STATE_COOKIE, nonce, stateCookieOptions);
    res.redirect(302, provider.getAuthorizationUrl(state));
  }),
);

// GET /auth/oauth/:provider/callback -> Code tauschen, User upserten, Tokens ausgeben
router.get(
  '/oauth/:provider/callback',
  asyncHandler(async (req, res) => {
    const provider = resolveProviderOr400(req.params.provider);

    const { code, state, error: providerError } = req.query;
    if (providerError) {
      throw unauthorized(`OAuth Provider hat den Login abgelehnt: ${providerError}`);
    }
    if (typeof code !== 'string' || typeof state !== 'string') {
      throw badRequest('Parameter "code" und "state" sind erforderlich.');
    }

    // State prüfen (Signatur + nonce-Abgleich mit Cookie).
    const decoded = verifyStateToken(state);
    const cookieNonce = req.signedCookies?.[STATE_COOKIE];
    res.clearCookie(STATE_COOKIE, { ...stateCookieOptions, maxAge: undefined });

    if (!decoded || !cookieNonce || decoded.nonce !== cookieNonce || decoded.provider !== provider.name) {
      throw badRequest('Ungültiger oder abgelaufener State (möglicher CSRF-Versuch).');
    }

    const profile = await provider.exchangeCodeForProfile(code);
    const userRow = await upsertOAuthUser(profile);

    const accessToken = signAccessToken(userRow.id);
    const refreshToken = await issueRefreshToken(userRow.id);

    const authResponse = {
      user: toUserDto(userRow),
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: config.jwt.accessTtl,
    };

    // Standardfall: Redirect zur Testseite mit Tokens im URL-Fragment
    // (Fragmente landen nicht in Server-Logs). Mit ?format=json gibt es JSON.
    const wantsJson =
      req.query.format === 'json' || (req.headers.accept || '').includes('application/json');

    if (wantsJson) {
      return res.status(200).json(authResponse);
    }

    const target = decoded.redirectUri || config.oauth.postLoginRedirect;
    const fragment = new URLSearchParams({
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: String(config.jwt.accessTtl),
    }).toString();
    return res.redirect(302, `${target}#${fragment}`);
  }),
);

// POST /auth/refresh -> neuen Access Token (mit Rotation des Refresh Tokens)
const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'refreshToken ist erforderlich'),
});

router.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const { refreshToken } = validate(refreshSchema, req.body);
    const { userId, jti } = await verifyRefreshToken(refreshToken);

    // Rotation: alten Token widerrufen, neuen ausstellen.
    await revokeRefreshToken(jti);
    const newAccessToken = signAccessToken(userId);
    const newRefreshToken = await issueRefreshToken(userId);

    res.status(200).json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      tokenType: 'Bearer',
      expiresIn: config.jwt.accessTtl,
    });
  }),
);

// POST /auth/logout -> alle Refresh Tokens des Users widerrufen
router.post(
  '/logout',
  requireAuth,
  asyncHandler(async (req, res) => {
    await revokeAllRefreshTokens(req.user.id);
    res.status(204).send();
  }),
);

// GET /auth/me -> aktuelle Session
router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.status(200).json({ authenticated: true, user: toUserDto(req.user) });
  }),
);

export default router;
