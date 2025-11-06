import { Worker } from 'bullmq';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { downloadFile, uploadChunkToB2 } from '../config/b2.js';
import Recording from '../models/Recording.js';
import connectDB from '../config/database.js';
import dotenv from 'dotenv';

dotenv.config();

const TEMP_DIR = path.join(process.cwd(), 'temp');

const ensureTempDir = async () => {
  try {
    await fs.access(TEMP_DIR);
  } catch {
    await fs.mkdir(TEMP_DIR, { recursive: true });
  }
};

const concatenateChunks = async (sessionId, participantId, trackType, totalChunks) => {
  const tempDir = path.join(TEMP_DIR, sessionId, participantId);
  await fs.mkdir(tempDir, { recursive: true });

  const chunkPaths = [];
  
  for (let i = 0; i < totalChunks; i++) {
    const chunkIndex = String(i).padStart(5, '0');
    const key = `recordings/${sessionId}/${participantId}/${trackType}_chunk_${chunkIndex}.webm`;
    const localPath = path.join(tempDir, `${trackType}_chunk_${chunkIndex}.webm`);
    
    try {
      const file = await downloadFile(key);
      await fs.writeFile(localPath, file.Body);
      chunkPaths.push(localPath);
    } catch (error) {
      console.error(`Error downloading chunk ${i}:`, error);
      throw error;
    }
  }

  const listFile = path.join(tempDir, `${trackType}_chunks.txt`);
  const listContent = chunkPaths.map(p => `file '${p.replace(/\\/g, '/')}'`).join('\n');
  await fs.writeFile(listFile, listContent);

  const outputPath = path.join(tempDir, `${trackType}_concatenated.webm`);

  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', [
      '-f', 'concat',
      '-safe', '0',
      '-i', listFile,
      '-c', 'copy',
      outputPath
    ]);

    ffmpeg.stderr.on('data', (data) => {
      console.log(`FFmpeg: ${data}`);
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve(outputPath);
      } else {
        reject(new Error(`FFmpeg process exited with code ${code}`));
      }
    });
  });
};

const transcodeVideo = async (inputPath, sessionId, participantId) => {
  const tempDir = path.dirname(inputPath);
  const outputPath = path.join(tempDir, 'video_final.mp4');

  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', [
      '-i', inputPath,
      '-c:v', 'libx264',
      '-preset', 'medium',
      '-crf', '23',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-movflags', '+faststart',
      outputPath
    ]);

    ffmpeg.stderr.on('data', (data) => {
      console.log(`FFmpeg: ${data}`);
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve(outputPath);
      } else {
        reject(new Error(`FFmpeg transcode exited with code ${code}`));
      }
    });
  });
};

const extractAudio = async (inputPath, sessionId, participantId) => {
  const tempDir = path.dirname(inputPath);
  const outputPath = path.join(tempDir, 'audio_final.wav');

  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', [
      '-i', inputPath,
      '-vn',
      '-acodec', 'pcm_s16le',
      '-ar', '48000',
      '-ac', '2',
      outputPath
    ]);

    ffmpeg.stderr.on('data', (data) => {
      console.log(`FFmpeg: ${data}`);
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve(outputPath);
      } else {
        reject(new Error(`FFmpeg audio extraction exited with code ${code}`));
      }
    });
  });
};

const processRecording = async (job) => {
  const { sessionId, participantId, participantName, videoChunks, audioChunks } = job.data;

  try {
    await ensureTempDir();

    console.log(`Processing recording for ${participantName} (${participantId})`);

    const concatenatedVideo = await concatenateChunks(sessionId, participantId, 'video', videoChunks);
    console.log('Video chunks concatenated');

    const finalVideo = await transcodeVideo(concatenatedVideo, sessionId, participantId);
    console.log('Video transcoded to MP4');

    const finalAudio = await extractAudio(concatenatedVideo, sessionId, participantId);
    console.log('Audio extracted to WAV');

    const videoBuffer = await fs.readFile(finalVideo);
    const audioBuffer = await fs.readFile(finalAudio);

    const videoKey = `recordings/${sessionId}/${participantId}/final_video.mp4`;
    const audioKey = `recordings/${sessionId}/${participantId}/final_audio.wav`;

    await uploadChunkToB2(videoKey, videoBuffer, 'video/mp4');
    await uploadChunkToB2(audioKey, audioBuffer, 'audio/wav');

    console.log('Final files uploaded to B2');

    const recording = await Recording.findOne({ sessionId });
    const participantIndex = recording.participants.findIndex(p => p.participantId === participantId);

    if (participantIndex !== -1) {
      recording.participants[participantIndex].videoPath = videoKey;
      recording.participants[participantIndex].audioPath = audioKey;
      recording.participants[participantIndex].videoProcessed = true;
      recording.participants[participantIndex].audioProcessed = true;
    }

    const allProcessed = recording.participants.every(
      p => p.videoProcessed && p.audioProcessed
    );

    if (allProcessed) {
      recording.status = 'completed';
    }

    await recording.save();

    const tempDir = path.join(TEMP_DIR, sessionId, participantId);
    await fs.rm(tempDir, { recursive: true, force: true });

    console.log(`Processing complete for ${participantName}`);

    return { success: true, videoKey, audioKey };
  } catch (error) {
    console.error('Processing error:', error);
    throw error;
  }
};

connectDB().then(() => {
  const worker = new Worker('media-processing', processRecording, {
    connection: {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379
    }
  });

  worker.on('completed', (job) => {
    console.log(`Job ${job.id} completed successfully`);
  });

  worker.on('failed', (job, err) => {
    console.error(`Job ${job.id} failed:`, err);
  });

  console.log('Media worker started and listening for jobs...');
});
