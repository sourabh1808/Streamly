import { useState, useEffect, useRef } from 'react';
import { getDevices, getMediaStream } from '../utils/webrtc';
import { Camera, Mic, Video, Settings } from 'lucide-react';
import toast from 'react-hot-toast';

export default function GreenRoom({ onReady, participantName, setParticipantName }) {
  const [cameras, setCameras] = useState([]);
  const [microphones, setMicrophones] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState('');
  const [selectedMicrophone, setSelectedMicrophone] = useState('');
  const [stream, setStream] = useState(null);
  const [loading, setLoading] = useState(true);
  const videoRef = useRef(null);

  useEffect(() => {
    initDevices();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (selectedCamera || selectedMicrophone) {
      updateStream();
    }
  }, [selectedCamera, selectedMicrophone]);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const initDevices = async () => {
    try {
      const tempStream = await getMediaStream();
      tempStream.getTracks().forEach(track => track.stop());

      const devices = await getDevices();
      setCameras(devices.cameras);
      setMicrophones(devices.microphones);

      if (devices.cameras.length > 0) {
        setSelectedCamera(devices.cameras[0].deviceId);
      }
      if (devices.microphones.length > 0) {
        setSelectedMicrophone(devices.microphones[0].deviceId);
      }
    } catch (error) {
      console.error('Error initializing devices:', error);
      toast.error('Failed to access camera/microphone. Please grant permissions.');
    } finally {
      setLoading(false);
    }
  };

  const updateStream = async () => {
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      const constraints = {
        video: selectedCamera ? { deviceId: { exact: selectedCamera } } : true,
        audio: selectedMicrophone ? { deviceId: { exact: selectedMicrophone } } : true
      };

      const newStream = await getMediaStream(constraints);
      setStream(newStream);
    } catch (error) {
      console.error('Error updating stream:', error);
      toast.error('Failed to update media devices');
    }
  };

  const handleJoin = () => {
    if (!participantName.trim()) {
      toast.error('Please enter your name');
      return;
    }

    if (!stream) {
      toast.error('Please allow camera and microphone access');
      return;
    }

    onReady(stream);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Setting up your devices...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Green Room</h1>
          <p className="text-gray-400">Check your setup before joining</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Video className="w-5 h-5" />
              Video Preview
            </h3>
            <div className="bg-gray-900 rounded-lg overflow-hidden aspect-video mb-4">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <Camera className="w-4 h-4" />
                  Camera
                </label>
                <select
                  value={selectedCamera}
                  onChange={(e) => setSelectedCamera(e.target.value)}
                  className="input-field"
                >
                  {cameras.map((camera) => (
                    <option key={camera.deviceId} value={camera.deviceId}>
                      {camera.label || `Camera ${camera.deviceId.slice(0, 5)}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <Mic className="w-4 h-4" />
                  Microphone
                </label>
                <select
                  value={selectedMicrophone}
                  onChange={(e) => setSelectedMicrophone(e.target.value)}
                  className="input-field"
                >
                  {microphones.map((mic) => (
                    <option key={mic.deviceId} value={mic.deviceId}>
                      {mic.label || `Microphone ${mic.deviceId.slice(0, 5)}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Your Details
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Your Name</label>
                <input
                  type="text"
                  value={participantName}
                  onChange={(e) => setParticipantName(e.target.value)}
                  className="input-field"
                  placeholder="Enter your name"
                />
              </div>

              <div className="bg-gray-900 rounded-lg p-4 space-y-2">
                <h4 className="font-medium text-sm">Setup Checklist</h4>
                <div className="space-y-1 text-sm">
                  <div className={`flex items-center gap-2 ${stream ? 'text-green-400' : 'text-gray-400'}`}>
                    <div className={`w-2 h-2 rounded-full ${stream ? 'bg-green-400' : 'bg-gray-600'}`} />
                    Camera & Microphone Access
                  </div>
                  <div className={`flex items-center gap-2 ${participantName ? 'text-green-400' : 'text-gray-400'}`}>
                    <div className={`w-2 h-2 rounded-full ${participantName ? 'bg-green-400' : 'bg-gray-600'}`} />
                    Name Entered
                  </div>
                </div>
              </div>

              <div className="bg-primary-900 bg-opacity-20 border border-primary-500 rounded-lg p-4">
                <h4 className="font-medium text-sm mb-2 text-primary-400">Recording Notice</h4>
                <p className="text-xs text-gray-300">
                  When recording starts, high-quality video and audio will be captured locally on your device and uploaded to the cloud. Please don't close your browser until the upload completes.
                </p>
              </div>

              <button
                onClick={handleJoin}
                disabled={!stream || !participantName}
                className="btn-primary w-full text-lg py-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Join Studio
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
