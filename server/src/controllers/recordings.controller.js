import Recording from '../models/Recording.js';
import { getSignedUrl } from '../config/b2.js';

export const getRecordingsByStudio = async (req, res) => {
  try {
    const recordings = await Recording.find({ studio: req.params.studioId })
      .sort({ createdAt: -1 })
      .populate('studio', 'name');

    res.json(recordings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching recordings' });
  }
};

export const getRecordingById = async (req, res) => {
  try {
    const recording = await Recording.findById(req.params.id)
      .populate('studio', 'name');

    if (!recording) {
      return res.status(404).json({ message: 'Recording not found' });
    }

    const recordingWithUrls = recording.toObject();
    recordingWithUrls.participants = recording.participants.map(p => {
      const participant = p.toObject();
      if (participant.videoPath) {
        participant.videoDownloadUrl = getSignedUrl(participant.videoPath, 3600);
      }
      if (participant.audioPath) {
        participant.audioDownloadUrl = getSignedUrl(participant.audioPath, 3600);
      }
      return participant;
    });

    res.json(recordingWithUrls);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching recording' });
  }
};

export const deleteRecording = async (req, res) => {
  try {
    const recording = await Recording.findById(req.params.id).populate('studio');

    if (!recording) {
      return res.status(404).json({ message: 'Recording not found' });
    }

    if (recording.studio.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this recording' });
    }

    await recording.deleteOne();
    res.json({ message: 'Recording deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error deleting recording' });
  }
};
