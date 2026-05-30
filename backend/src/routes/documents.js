import fs from 'node:fs/promises';
import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { uploadSingle } from '../middleware/upload.js';
import { validate } from '../middleware/validate.js';
import { badRequest, notFound, forbidden } from '../utils/errors.js';
import {
  createDocument,
  listDocuments,
  getDocumentById,
  deleteDocument,
  deleteStoredFile,
  resolveStoragePath,
  toDocumentDto,
} from '../services/documentService.js';

const router = Router();

const uuidParam = z.string().uuid('Ungültige documentId (UUID erwartet).');

const metadataSchema = z.object({
  title: z.string().max(255).optional(),
  description: z.string().max(1000).optional(),
});

// Lädt Dokument + prüft Ownership. Wirft 404 / 403 gemäß Spec.
async function loadOwnedDocument(documentId, userId) {
  const id = validate(uuidParam, documentId);
  const doc = await getDocumentById(id);
  if (!doc) throw notFound('Dokument nicht gefunden.');
  if (doc.user_id !== userId) throw forbidden('Kein Zugriff auf dieses Dokument.');
  return doc;
}

// GET /documents -> eigene Dokumente
router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const rows = await listDocuments(req.user.id);
    res.status(200).json({ documents: rows.map(toDocumentDto) });
  }),
);

// POST /documents -> Upload (multipart/form-data, Feld "file")
router.post(
  '/',
  requireAuth,
  uploadSingle,
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw badRequest('Es wurde keine Datei im Feld "file" übermittelt.');
    }

    let meta;
    try {
      meta = validate(metadataSchema, { title: req.body.title, description: req.body.description });
    } catch (err) {
      // Validierung der Metadaten fehlgeschlagen -> bereits gespeicherte Datei aufräumen.
      await deleteStoredFile(req.file.filename);
      throw err;
    }

    const doc = await createDocument({
      userId: req.user.id,
      title: meta.title,
      description: meta.description,
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      storageKey: req.file.filename,
    });

    res.status(201).json(toDocumentDto(doc));
  }),
);

// GET /documents/:documentId -> Metadaten eines eigenen Dokuments
router.get(
  '/:documentId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const doc = await loadOwnedDocument(req.params.documentId, req.user.id);
    res.status(200).json(toDocumentDto(doc));
  }),
);

// GET /documents/:documentId/download -> Datei-Download (Erweiterung über die Spec hinaus)
router.get(
  '/:documentId/download',
  requireAuth,
  asyncHandler(async (req, res) => {
    const doc = await loadOwnedDocument(req.params.documentId, req.user.id);
    const filePath = resolveStoragePath(doc.storage_key);
    try {
      await fs.access(filePath);
    } catch {
      throw notFound('Datei wurde im Storage nicht gefunden.');
    }
    res.type(doc.mime_type);
    res.download(filePath, doc.file_name);
  }),
);

// DELETE /documents/:documentId -> Dokument + Datei löschen
router.delete(
  '/:documentId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const doc = await loadOwnedDocument(req.params.documentId, req.user.id);
    await deleteDocument(doc.id);
    await deleteStoredFile(doc.storage_key);
    res.status(204).send();
  }),
);

export default router;
