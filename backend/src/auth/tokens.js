import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { query } from '../db.js';
import { unauthorized } from '../utils/errors.js';

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

// --- Access Token (stateless JWT) --------------------------------------------

export function signAccessToken(userId) {
  return jwt.sign({ type: 'access' }, config.jwt.accessSecret, {
    subject: userId,
    expiresIn: config.jwt.accessTtl,
  });
}

export function verifyAccessToken(token) {
  try {
    const payload = jwt.verify(token, config.jwt.accessSecret);
    if (payload.type !== 'access') throw new Error('wrong token type');
    return payload;
  } catch {
    throw unauthorized('Access Token ist ungültig oder abgelaufen.');
  }
}

// --- Refresh Token (JWT + DB-Eintrag zur Revokation/Rotation) ----------------

// Erstellt einen Refresh Token und speichert seinen Hash in der DB.
export async function issueRefreshToken(userId) {
  const expiresAt = new Date(Date.now() + config.jwt.refreshTtl * 1000);
  const { rows } = await query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3) RETURNING id`,
    [userId, 'pending', expiresAt],
  );
  const jti = rows[0].id;
  const token = jwt.sign({ type: 'refresh' }, config.jwt.refreshSecret, {
    subject: userId,
    jwtid: jti,
    expiresIn: config.jwt.refreshTtl,
  });
  // Hash erst jetzt setzen (Token enthält die jti, daher zweistufig).
  await query(`UPDATE refresh_tokens SET token_hash = $1 WHERE id = $2`, [sha256(token), jti]);
  return token;
}

// Prüft einen Refresh Token (Signatur + DB-Status) und gibt userId + jti zurück.
export async function verifyRefreshToken(token) {
  let payload;
  try {
    payload = jwt.verify(token, config.jwt.refreshSecret);
    if (payload.type !== 'refresh') throw new Error('wrong token type');
  } catch {
    throw unauthorized('Refresh Token ist ungültig oder abgelaufen.');
  }

  const { rows } = await query(
    `SELECT id, user_id, token_hash, revoked, expires_at
     FROM refresh_tokens WHERE id = $1`,
    [payload.jti],
  );
  const record = rows[0];
  if (
    !record ||
    record.revoked ||
    record.token_hash !== sha256(token) ||
    new Date(record.expires_at).getTime() < Date.now()
  ) {
    throw unauthorized('Refresh Token ist ungültig oder wurde widerrufen.');
  }
  return { userId: record.user_id, jti: record.id };
}

export async function revokeRefreshToken(jti) {
  await query(`UPDATE refresh_tokens SET revoked = TRUE WHERE id = $1`, [jti]);
}

// Beim Logout: alle Refresh Tokens eines Users widerrufen.
export async function revokeAllRefreshTokens(userId) {
  await query(`UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = $1 AND revoked = FALSE`, [
    userId,
  ]);
}

// --- State Token (CSRF-Schutz im OAuth-Flow) ---------------------------------

export function signStateToken(payload) {
  return jwt.sign(payload, config.jwt.stateSecret, { expiresIn: 600 });
}

export function verifyStateToken(token) {
  try {
    return jwt.verify(token, config.jwt.stateSecret);
  } catch {
    return null;
  }
}
