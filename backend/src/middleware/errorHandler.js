import multer from 'multer';
import { ApiError, payloadTooLarge, badRequest } from '../utils/errors.js';

// Wrapper, damit async Route-Handler Fehler an next() weiterreichen.
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// 404 für unbekannte Routen.
export function notFoundHandler(req, res) {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} existiert nicht.`,
    statusCode: 404,
  });
}

// Zentrales Error-Handling. Erzeugt immer das ErrorResponse-Schema.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  let apiError;

  if (err instanceof ApiError) {
    apiError = err;
  } else if (err instanceof multer.MulterError) {
    // Datei-Upload-Fehler von multer in passende HTTP-Codes übersetzen.
    apiError =
      err.code === 'LIMIT_FILE_SIZE'
        ? payloadTooLarge('Die hochgeladene Datei überschreitet die maximale Größe.')
        : badRequest(`Upload-Fehler: ${err.message}`);
  } else {
    apiError = new ApiError(500, 'Internal Server Error', 'Ein unerwarteter Fehler ist aufgetreten.');
  }

  if (apiError.statusCode >= 500) {
    // Interne Fehler vollständig loggen, aber dem Client keine Details zeigen.
    // eslint-disable-next-line no-console
    console.error('Unhandled error:', err);
  }

  res.status(apiError.statusCode).json({
    error: apiError.error,
    message: apiError.message,
    statusCode: apiError.statusCode,
  });
}
