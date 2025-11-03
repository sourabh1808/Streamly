import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useStudioStore } from '../store/studioStore';
import socketService from '../utils/socket';
import { LocalRecorder } from '../utils/recorder';
import { WebRTCPeer } from '../utils/webrtc';
import VideoGrid from './VideoGrid';
import Chat from './Chat';
import toast from 'react-hot-toast';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Circle, Square, MessageSquare, X } from 'lucide-react';

export default function StudioRoom({ studio, participantName }) {
  const [audioMuted, setAudioMuted] = useState(false);
  const [videoMuted, setVideoMuted] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  
  const { user } = useAuthStore();
  const {
    participants,
    setParticipants,
    addParticipant,
    removeParticipant,
    isRecording,
    setRecording,
    sessionId,
    localStream
  } = useStudioStore();

  const navigate = useNavigate();
  const recorderRef = useRef(null);
  const peersRef = useRef(new Map());
  const isHost = user && studio && user._id === studio.owner;

  useEffect(() => {
    const socket = socketService.getSocket();

    socket.on('joined-studio', (data) => {
      console.log('Joined studio:', data);
      setParticipants(data.participants);
      
      if (data.isRecording) {
        setRecording(true, data.sessionId);
      }

      data.participants.forEach(p => {
        if (p.socketId !== socket.id) {
          const peer = new WebRTCPeer(p.socketId, socket, localStream);
          peer.createOffer();
          peersRef.current.set(p.socketId, peer);
        }
      });
    });

    socket.on('participant-joined', (participant) => {
      console.log('Participant joined:', participant);
      addParticipant(participant);
      toast.success(`${participant.participantName} joined`);
    });

    socket.on('participant-left', (data) => {
      console.log('Participant left:', data);
      removeParticipant(data.participantId);
      toast(`${data.participantName} left`);
      
      const peer = peersRef.current.get(data.participantId);
      if (peer) {
        peer.close();
        peersRef.current.delete(data.participantId);
      }
    });

    socket.on('recording-started', async (data) => {
      console.log('Recording started:', data);
      setRecording(true, data.sessionId);
      toast.success('Recording started!');

      recorderRef.current = new LocalRecorder(
        localStream,
        data.sessionId,
        socket.id,
        participantName
      );

      await recorderRef.current.start();
    });

    socket.on('recording-stopped', async (data) => {
      console.log('Recording stopped:', data);
      toast('Recording stopped. Finalizing upload...');
      setIsUploading(true);

      if (recorderRef.current) {
        await recorderRef.current.stop();
        
        const progressInterval = setInterval(() => {
          const progress = recorderRef.current.getProgress();
          setUploadProgress(progress);
          
          if (progress >= 100) {
            clearInterval(progressInterval);
          }
        }, 500);

        await recorderRef.current.finalize();
        setIsUploading(false);
        setRecording(false, null);
        toast.success('Upload complete!');
      }
    });

    socket.on('webrtc-offer', async ({ from, offer }) => {
      const peer = new WebRTCPeer(from, socket, localStream);
      await peer.handleOffer(offer);
      peersRef.current.set(from, peer);
    });

    socket.on('webrtc-answer', async ({ from, answer }) => {
      const peer = peersRef.current.get(from);
      if (peer) {
        await peer.handleAnswer(answer);
      }
    });

    socket.on('webrtc-ice-candidate', async ({ from, candidate }) => {
      const peer = peersRef.current.get(from);
      if (peer) {
        await peer.handleIceCandidate(candidate);
      }
    });

    return () => {
      socket.off('joined-studio');
      socket.off('participant-joined');
      socket.off('participant-left');
      socket.off('recording-started');
      socket.off('recording-stopped');
      socket.off('webrtc-offer');
      socket.off('webrtc-answer');
      socket.off('webrtc-ice-candidate');
    };
  }, [localStream, participantName]);

  const handleStartRecording = () => {
    if (!isHost) {
      toast.error('Only the host can start recording');
      return;
    }

    socketService.emit('start-recording', {
      studioId: studio._id,
      hostId: user._id
    });
  };

  const handleStopRecording = () => {
    if (!isHost) {
      toast.error('Only the host can stop recording');
      return;
    }

    socketService.emit('stop-recording', {
      studioId: studio._id,
      sessionId
    });
  };

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setAudioMuted(!audioTrack.enabled);
        
        socketService.emit('toggle-audio', {
          studioId: studio._id,
          muted: !audioTrack.enabled
        });
      }
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setVideoMuted(!videoTrack.enabled);
        
        socketService.emit('toggle-video', {
          studioId: studio._id,
          muted: !videoTrack.enabled
        });
      }
    }
  };

  const handleLeave = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }

    peersRef.current.forEach(peer => peer.close());
    peersRef.current.clear();

    socketService.disconnect();
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">{studio.name}</h1>
            <p className="text-sm text-gray-400">{participants.length} participant{participants.length !== 1 ? 's' : ''}</p>
          </div>
          
          {isRecording && (
            <div className="flex items-center gap-2 bg-red-900 bg-opacity-20 border border-red-500 px-4 py-2 rounded-lg">
              <Circle className="w-3 h-3 fill-red-500 text-red-500 animate-pulse" />
              <span className="text-red-400 font-medium">Recording</span>
            </div>
          )}

          {isUploading && (
            <div className="bg-primary-900 bg-opacity-20 border border-primary-500 px-4 py-2 rounded-lg">
              <p className="text-sm text-primary-400">Uploading: {uploadProgress.toFixed(0)}%</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 p-4">
          <VideoGrid 
            participants={participants}
            localStream={localStream}
            peers={peersRef.current}
          />
        </div>

        {showChat && (
          <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h3 className="font-semibold">Chat</h3>
              <button onClick={() => setShowChat(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <Chat studioId={studio._id} participantName={participantName} />
          </div>
        )}
      </div>

      <div className="bg-gray-800 border-t border-gray-700 px-4 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-4">
          <button
            onClick={toggleAudio}
            className={`p-4 rounded-full transition-colors ${
              audioMuted ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            {audioMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>

          <button
            onClick={toggleVideo}
            className={`p-4 rounded-full transition-colors ${
              videoMuted ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            {videoMuted ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
          </button>

          {isHost && (
            <button
              onClick={isRecording ? handleStopRecording : handleStartRecording}
              disabled={isUploading}
              className={`px-6 py-4 rounded-full font-medium transition-colors ${
                isRecording 
                  ? 'bg-red-600 hover:bg-red-700' 
                  : 'bg-primary-600 hover:bg-primary-700'
              } disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2`}
            >
              {isRecording ? (
                <>
                  <Square className="w-5 h-5" />
                  Stop Recording
                </>
              ) : (
                <>
                  <Circle className="w-5 h-5" />
                  Start Recording
                </>
              )}
            </button>
          )}

          <button
            onClick={() => setShowChat(!showChat)}
            className="p-4 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors relative"
          >
            <MessageSquare className="w-6 h-6" />
          </button>

          <button
            onClick={handleLeave}
            className="p-4 rounded-full bg-red-600 hover:bg-red-700 transition-colors"
          >
            <PhoneOff className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
}
