import { uploadChunkToB2 } from '../config/b2.js';
import Recording from '../models/Recording.js';

export const uploadChunk = async (req, res) => {
  try {
    const { sessionId, participantId, participantName, chunkIndex, trackType } = req.body;

    if (!req.file || !sessionId || !participantId || !chunkIndex || !trackType) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const fileExtension = trackType === 'video' ? 'webm' : 'webm';
    const key = `recordings/${sessionId}/${participantId}/${trackType}_chunk_${String(chunkIndex).padStart(5, '0')}.${fileExtension}`;

    await uploadChunkToB2(key, req.file.buffer, req.file.mimetype);

    let recording = await Recording.findOne({ sessionId });

    if (!recording) {
      return res.status(404).json({ message: 'Recording session not found' });
    }

    const participantIndex = recording.participants.findIndex(
      p => p.participantId === participantId
    );

    if (participantIndex !== -1) {
      recording.participants[participantIndex].chunkCount += 1;
    } else {
      recording.participants.push({
        participantId,
        participantName,
        chunkCount: 1
      });
    }

    await recording.save();

    res.json({ 
      message: 'Chunk uploaded successfully',
      key,
      chunkIndex: parseInt(chunkIndex)
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Server error uploading chunk' });
  }
};

export const finalizeUpload = async (req, res) => {
  try {
    const { sessionId, participantId, trackType, totalChunks } = req.body;

    if (!sessionId || !participantId || !trackType || totalChunks === undefined) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const recording = await Recording.findOne({ sessionId });

    if (!recording) {
      return res.status(404).json({ message: 'Recording session not found' });
    }

    const participantIndex = recording.participants.findIndex(
      p => p.participantId === participantId
    );

    if (participantIndex === -1) {
      return res.status(404).json({ message: 'Participant not found in recording' });
    }

    if (trackType === 'video') {
      recording.participants[participantIndex].uploadComplete = true;
    }

    await recording.save();

    res.json({ 
      message: 'Upload finalized successfully',
      sessionId,
      participantId,
      trackType
    });
  } catch (error) {
    console.error('Finalize error:', error);
    res.status(500).json({ message: 'Server error finalizing upload' });
  }
};
