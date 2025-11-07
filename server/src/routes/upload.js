import express from 'express';
import multer from 'multer';
import {uploadChunk, finalizeUpload} from '../controllers/upload.controller.js';

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }
});

router.post('/chunk', upload.single('chunk'), uploadChunk);
router.post('/finalize', finalizeUpload);

export default router;
