import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { studioAPI } from '../utils/api';
import { useAuthStore } from '../store/authStore';
import { useStudioStore } from '../store/studioStore';
import socketService from '../utils/socket';
import GreenRoom from '../components/GreenRoom';
import StudioRoom from '../components/StudioRoom';
import toast from 'react-hot-toast';

export default function Studio() {
  const { inviteCode } = useParams();
  const [studio, setStudio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [participantName, setParticipantName] = useState('');
  const [inGreenRoom, setInGreenRoom] = useState(true);
  const { user } = useAuthStore();
  const { setCurrentStudio, setLocalStream } = useStudioStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchStudio();
    socketService.connect();

    return () => {
      socketService.disconnect();
    };
  }, [inviteCode]);

  useEffect(() => {
    if (user) {
      setParticipantName(user.name);
    }
  }, [user]);

  const fetchStudio = async () => {
    try {
      const { data } = await studioAPI.getByInviteCode(inviteCode);
      setStudio(data);
      setCurrentStudio(data);
    } catch (error) {
      toast.error('Studio not found');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleReady = (stream) => {
    setLocalStream(stream);
    setInGreenRoom(false);

    socketService.emit('join-studio', {
      studioId: studio._id,
      inviteCode,
      participantName,
      userId: user?._id || null
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading studio...</p>
        </div>
      </div>
    );
  }

  if (inGreenRoom) {
    return (
      <GreenRoom
        onReady={handleReady}
        participantName={participantName}
        setParticipantName={setParticipantName}
      />
    );
  }

  return <StudioRoom studio={studio} participantName={participantName} />;
}
