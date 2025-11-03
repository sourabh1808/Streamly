import { useEffect, useRef } from 'react';
import { Mic, MicOff } from 'lucide-react';
import socketService from '../utils/socket';

function VideoTile({ participant, stream, isLocal = false }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative bg-gray-800 rounded-lg overflow-hidden aspect-video">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className="w-full h-full object-cover"
      />
      
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {participant.participantName} {isLocal && '(You)'}
            </span>
          </div>
          
          {participant.audioMuted && (
            <div className="bg-red-600 rounded-full p-1">
              <MicOff className="w-4 h-4" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VideoGrid({ participants, localStream, peers }) {
  const socket = socketService.getSocket();
  const localParticipant = participants.find(p => p.socketId === socket?.id);

  const getGridClass = () => {
    const count = participants.length;
    if (count === 1) return 'grid-cols-1';
    if (count === 2) return 'grid-cols-2';
    if (count <= 4) return 'grid-cols-2 grid-rows-2';
    if (count <= 6) return 'grid-cols-3 grid-rows-2';
    return 'grid-cols-3 grid-rows-3';
  };

  return (
    <div className={`grid ${getGridClass()} gap-4 h-full`}>
      {localParticipant && (
        <VideoTile
          key="local"
          participant={localParticipant}
          stream={localStream}
          isLocal={true}
        />
      )}

      {participants
        .filter(p => p.socketId !== socket?.id)
        .map(participant => {
          const peer = peers.get(participant.socketId);
          const stream = peer?.getRemoteStream();

          return (
            <VideoTile
              key={participant.socketId}
              participant={participant}
              stream={stream}
            />
          );
        })}
    </div>
  );
}
