import mongoose from 'mongoose';

const participantTrackSchema = new mongoose.Schema({
  participantId: String,
  participantName: String,
  videoPath: String,
  audioPath: String,
  videoProcessed: { type: Boolean, default: false },
  audioProcessed: { type: Boolean, default: false },
  videoUrl: String,
  audioUrl: String,
  uploadComplete: { type: Boolean, default: false },
  chunkCount: { type: Number, default: 0 }
});

const recordingSchema = new mongoose.Schema({
  studio: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Studio',
    required: true
  },
  sessionId: {
    type: String,
    required: true,
    unique: true
  },
  host: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  participants: [participantTrackSchema],
  startedAt: {
    type: Date,
    default: Date.now
  },
  endedAt: {
    type: Date
  },
  duration: {
    type: Number
  },
  status: {
    type: String,
    enum: ['recording', 'uploading', 'processing', 'completed', 'failed'],
    default: 'recording'
  },
  processingProgress: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Recording = mongoose.model('Recording', recordingSchema);

export default Recording;
