// Einheitliche Fehlerklasse. Das zentrale Error-Handling-Middleware wandelt
// diese in das ErrorResponse-Schema der Swagger-Spec um.

export class ApiError extends Error {
  constructor(statusCode, error, message) {
    super(message);
    this.statusCode = statusCode;
    this.error = error;
    this.expose = true;
  }
}

export const badRequest = (msg = 'Die Anfrage enthält ungültige Daten.') =>
  new ApiError(400, 'Bad Request', msg);

export const unauthorized = (msg = 'Nicht authentifiziert.') =>
  new ApiError(401, 'Unauthorized', msg);

export const forbidden = (msg = 'Kein Zugriff auf diese Ressource.') =>
  new ApiError(403, 'Forbidden', msg);

export const notFound = (msg = 'Ressource nicht gefunden.') =>
  new ApiError(404, 'Not Found', msg);

export const payloadTooLarge = (msg = 'Datei ist zu groß.') =>
  new ApiError(413, 'Payload Too Large', msg);
