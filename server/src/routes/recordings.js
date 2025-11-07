import express from 'express';
import { protect } from '../middleware/auth.js';
import {getRecordingById, getRecordingsByStudio, deleteRecording} from '../controllers/recordings.controller.js';

const router = express.Router();

router.get('/studio/:studioId', protect, getRecordingsByStudio);
router.get('/:id', protect, getRecordingById);
router.delete('/:id', protect, deleteRecording);

export default router;
