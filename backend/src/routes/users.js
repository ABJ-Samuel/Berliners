import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { validate } from '../middleware/validate.js';
import { updateUser, toUserDto } from '../services/userService.js';

const router = Router();

// GET /users/me
router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.status(200).json(toUserDto(req.user));
  }),
);

// PATCH /users/me
const updateSchema = z
  .object({
    firstName: z.string().min(1).max(100).optional(),
    lastName: z.string().min(1).max(100).optional(),
    description: z.string().max(1000).optional(),
    type: z.enum(['researcher', 'company']).optional(),
    onboarded: z.boolean().optional(),
  })
  .strict();

router.patch(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const fields = validate(updateSchema, req.body ?? {});
    const updated = await updateUser(req.user.id, fields);
    res.status(200).json(toUserDto(updated));
  }),
);

export default router;
