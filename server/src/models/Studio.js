import mongoose from 'mongoose';
import { nanoid } from 'nanoid';

const studioSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  inviteCode: {
    type: String,
    unique: true,
    default: () => nanoid(10)
  },
  inviteLink: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  settings: {
    maxParticipants: {
      type: Number,
      default: 10
    },
    autoRecord: {
      type: Boolean,
      default: false
    }
  }
});

studioSchema.pre('save', function(next) {
  if (!this.inviteLink) {
    this.inviteLink = `${process.env.CLIENT_URL}/studio/${this.inviteCode}`;
  }
  next();
});

const Studio = mongoose.model('Studio', studioSchema);

export default Studio;
