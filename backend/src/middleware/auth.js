import { verifyAccessToken } from '../auth/tokens.js';
import { getUserById } from '../services/userService.js';
import { unauthorized } from '../utils/errors.js';
import { asyncHandler } from './errorHandler.js';

// Schützt Routen: erwartet einen "Authorization: Bearer <token>" Header,
// verifiziert den Access Token und lädt den User in req.user.
export const requireAuth = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    throw unauthorized('Authorization-Header mit Bearer Token erforderlich.');
  }

  const payload = verifyAccessToken(token);
  const user = await getUserById(payload.sub);
  if (!user) {
    throw unauthorized('Benutzer existiert nicht mehr.');
  }

  req.user = user;
  next();
});
