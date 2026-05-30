import { badRequest } from '../utils/errors.js';

// Validiert ein Objekt gegen ein Zod-Schema und gibt die geparsten Daten zurück.
// Bei Fehler wird ein 400 mit lesbarer Meldung geworfen.
export function validate(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) {
    const details = result.error.issues
      .map((i) => `${i.path.join('.') || 'body'}: ${i.message}`)
      .join('; ');
    throw badRequest(`Validierung fehlgeschlagen: ${details}`);
  }
  return result.data;
}
