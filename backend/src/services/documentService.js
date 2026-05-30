import fs from 'node:fs/promises';
import path from 'node:path';
import { query } from '../db.js';
import { config } from '../config.js';

// Wandelt eine DB-Zeile in das Document-Schema der API um.
export function toDocumentDto(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    description: row.description,
    fileName: row.file_name,
    mimeType: row.mime_type,
    size: Number(row.size),
    storageKey: row.storage_key,
    // Convenience-Download-URL (Erweiterung über die Spec hinaus; geschützt + ownership-geprüft).
    url: `${config.publicBaseUrl}${config.apiBasePath}/documents/${row.id}/download`,
    createdAt: row.created_at.toISOString(),
  };
}

export async function createDocument({ userId, title, description, fileName, mimeType, size, storageKey }) {
  const { rows } = await query(
    `INSERT INTO documents (user_id, title, description, file_name, mime_type, size, storage_key)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [userId, title ?? null, description ?? null, fileName, mimeType, size, storageKey],
  );
  return rows[0];
}

export async function listDocuments(userId) {
  const { rows } = await query(
    `SELECT * FROM documents WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId],
  );
  return rows;
}

// Holt ein Dokument anhand der ID (ohne Ownership-Prüfung – die erfolgt im Handler).
export async function getDocumentById(id) {
  const { rows } = await query(`SELECT * FROM documents WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

export async function deleteDocument(id) {
  await query(`DELETE FROM documents WHERE id = $1`, [id]);
}

// Absoluter Pfad zur gespeicherten Datei (für Download/Löschen auf dem Filesystem).
export function resolveStoragePath(storageKey) {
  return path.join(config.uploads.dir, storageKey);
}

export async function deleteStoredFile(storageKey) {
  try {
    await fs.unlink(resolveStoragePath(storageKey));
  } catch (err) {
    // Datei evtl. schon weg – nicht kritisch, aber loggen.
    if (err.code !== 'ENOENT') {
      // eslint-disable-next-line no-console
      console.warn(`Datei konnte nicht gelöscht werden (${storageKey}):`, err.message);
    }
  }
}
