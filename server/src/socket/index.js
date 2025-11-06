import { Server } from 'socket.io';
import Recording from '../models/Recording.js';
import Studio from '../models/Studio.js';
import { v4 as uuidv4 } from 'uuid';

const studios = new Map();

export const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL,
      methods: ['GET', 'POST']
    },
    maxHttpBufferSize: 1e8
  });

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join-studio', async ({ studioId, inviteCode, participantName, userId }) => {
      try {
        let studio;
        
        if (studioId) {
          studio = await Studio.findById(studioId);
        } else if (inviteCode) {
          studio = await Studio.findOne({ inviteCode });
        }

        if (!studio) {
          socket.emit('error', { message: 'Studio not found' });
          return;
        }

        const roomId = studio._id.toString();
        socket.join(roomId);

        if (!studios.has(roomId)) {
          studios.set(roomId, {
            participants: [],
            isRecording: false,
            currentSession: null
          });
        }

        const studioData = studios.get(roomId);
        const participant = {
          socketId: socket.id,
          participantId: socket.id,
          participantName,
          userId,
          isHost: studio.owner.toString() === userId,
          audioMuted: false,
          videoMuted: false,
          joinedAt: Date.now()
        };

        studioData.participants.push(participant);

        socket.emit('joined-studio', {
          studioId: studio._id,
          studioName: studio.name,
          participant,
          participants: studioData.participants,
          isRecording: studioData.isRecording,
          sessionId: studioData.currentSession
        });

        socket.to(roomId).emit('participant-joined', participant);

        console.log(`${participantName} joined studio ${studio.name}`);
      } catch (error) {
        console.error('Join studio error:', error);
        socket.emit('error', { message: 'Failed to join studio' });
      }
    });

    socket.on('start-recording', async ({ studioId, hostId }) => {
      try {
        const studio = await Studio.findById(studioId);
        
        if (!studio || studio.owner.toString() !== hostId) {
          socket.emit('error', { message: 'Not authorized to start recording' });
          return;
        }

        const roomId = studio._id.toString();
        const studioData = studios.get(roomId);

        if (!studioData) {
          socket.emit('error', { message: 'Studio session not found' });
          return;
        }

        const sessionId = uuidv4();
        
        const recording = await Recording.create({
          studio: studio._id,
          sessionId,
          host: hostId,
          participants: studioData.participants.map(p => ({
            participantId: p.participantId,
            participantName: p.participantName
          })),
          status: 'recording'
        });

        studioData.isRecording = true;
        studioData.currentSession = sessionId;

        io.to(roomId).emit('recording-started', {
          sessionId,
          recordingId: recording._id,
          startedAt: recording.startedAt
        });

        console.log(`Recording started in studio ${studio.name}, session: ${sessionId}`);
      } catch (error) {
        console.error('Start recording error:', error);
        socket.emit('error', { message: 'Failed to start recording' });
      }
    });

    socket.on('stop-recording', async ({ studioId, sessionId }) => {
      try {
        const studio = await Studio.findById(studioId);
        
        if (!studio) {
          socket.emit('error', { message: 'Studio not found' });
          return;
        }

        const recording = await Recording.findOne({ sessionId });
        
        if (!recording) {
          socket.emit('error', { message: 'Recording not found' });
          return;
        }

        recording.endedAt = new Date();
        recording.duration = Math.floor((recording.endedAt - recording.startedAt) / 1000);
        recording.status = 'uploading';
        await recording.save();

        const roomId = studio._id.toString();
        const studioData = studios.get(roomId);
        
        if (studioData) {
          studioData.isRecording = false;
        }

        io.to(roomId).emit('recording-stopped', {
          sessionId,
          endedAt: recording.endedAt,
          duration: recording.duration
        });

        console.log(`Recording stopped in studio ${studio.name}, session: ${sessionId}`);
      } catch (error) {
        console.error('Stop recording error:', error);
        socket.emit('error', { message: 'Failed to stop recording' });
      }
    });

    socket.on('toggle-audio', ({ studioId, muted }) => {
      const roomId = studioId;
      const studioData = studios.get(roomId);
      
      if (studioData) {
        const participant = studioData.participants.find(p => p.socketId === socket.id);
        if (participant) {
          participant.audioMuted = muted;
          socket.to(roomId).emit('participant-audio-toggled', {
            participantId: participant.participantId,
            muted
          });
        }
      }
    });

    socket.on('toggle-video', ({ studioId, muted }) => {
      const roomId = studioId;
      const studioData = studios.get(roomId);
      
      if (studioData) {
        const participant = studioData.participants.find(p => p.socketId === socket.id);
        if (participant) {
          participant.videoMuted = muted;
          socket.to(roomId).emit('participant-video-toggled', {
            participantId: participant.participantId,
            muted
          });
        }
      }
    });

    socket.on('chat-message', ({ studioId, message, senderName }) => {
      const roomId = studioId;
      io.to(roomId).emit('chat-message', {
        message,
        senderName,
        senderId: socket.id,
        timestamp: Date.now()
      });
    });

    socket.on('webrtc-offer', ({ to, offer }) => {
      socket.to(to).emit('webrtc-offer', {
        from: socket.id,
        offer
      });
    });

    socket.on('webrtc-answer', ({ to, answer }) => {
      socket.to(to).emit('webrtc-answer', {
        from: socket.id,
        answer
      });
    });

    socket.on('webrtc-ice-candidate', ({ to, candidate }) => {
      socket.to(to).emit('webrtc-ice-candidate', {
        from: socket.id,
        candidate
      });
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);

      studios.forEach((studioData, roomId) => {
        const participantIndex = studioData.participants.findIndex(
          p => p.socketId === socket.id
        );

        if (participantIndex !== -1) {
          const participant = studioData.participants[participantIndex];
          studioData.participants.splice(participantIndex, 1);

          socket.to(roomId).emit('participant-left', {
            participantId: participant.participantId,
            participantName: participant.participantName
          });

          if (studioData.participants.length === 0) {
            studios.delete(roomId);
          }
        }
      });
    });
  });

  return io;
};

export default initializeSocket;
