import express from 'express';
import { protect } from '../middleware/auth.js';
import {getAllStudios, createStudio, getStudioById, getStudioByInviteCode, deleteStudio} from '../controllers/studios.controller.js';

const router = express.Router();

router.get('/', protect, getAllStudios);
router.post('/', protect, createStudio);
router.get('/:id', protect, getStudioById);
router.get('/join/:inviteCode', getStudioByInviteCode);
router.delete('/:id', protect, deleteStudio);

export default router;
