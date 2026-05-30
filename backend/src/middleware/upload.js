import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { config } from '../config.js';
import { badRequest } from '../utils/errors.js';

// Stellt sicher, dass das Upload-Verzeichnis existiert.
fs.mkdirSync(config.uploads.dir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, config.uploads.dir),
  filename: (req, file, cb) => {
    // Eigener, kollisionsfreier Dateiname -> kein Path-Traversal über den Originalnamen.
    const ext = path.extname(file.originalname).slice(0, 16).replace(/[^.a-zA-Z0-9]/g, '');
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

function fileFilter(req, file, cb) {
  if (!config.uploads.allowedMimeTypes.includes(file.mimetype)) {
    cb(badRequest(`Dateityp nicht erlaubt: ${file.mimetype}`));
    return;
  }
  cb(null, true);
}

// Single-File-Upload unter dem Feldnamen "file" (siehe UploadDocumentRequest).
export const uploadSingle = multer({
  storage,
  fileFilter,
  limits: { fileSize: config.uploads.maxSizeBytes, files: 1 },
}).single('file');
