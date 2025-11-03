import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { recordingAPI, studioAPI } from '../utils/api';
import toast from 'react-hot-toast';
import { ArrowLeft, Download, Calendar, Clock, Users, Trash2 } from 'lucide-react';

export default function Recordings() {
  const { studioId } = useParams();
  const [studio, setStudio] = useState(null);
  const [recordings, setRecordings] = useState([]);
  const [selectedRecording, setSelectedRecording] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, [studioId]);

  const fetchData = async () => {
    try {
      const [studioRes, recordingsRes] = await Promise.all([
        studioAPI.getById(studioId),
        recordingAPI.getByStudio(studioId)
      ]);
      
      setStudio(studioRes.data);
      setRecordings(recordingsRes.data);
    } catch (error) {
      toast.error('Failed to load recordings');
    } finally {
      setLoading(false);
    }
  };

  const handleViewRecording = async (recordingId) => {
    try {
      const { data } = await recordingAPI.getById(recordingId);
      setSelectedRecording(data);
    } catch (error) {
      toast.error('Failed to load recording details');
    }
  };

  const handleDeleteRecording = async (recordingId) => {
    if (!confirm('Are you sure you want to delete this recording?')) return;

    try {
      await recordingAPI.delete(recordingId);
      setRecordings(recordings.filter(r => r._id !== recordingId));
      setSelectedRecording(null);
      toast.success('Recording deleted');
    } catch (error) {
      toast.error('Failed to delete recording');
    }
  };

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    }
    return `${minutes}m ${secs}s`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-green-400 bg-green-900';
      case 'processing': return 'text-yellow-400 bg-yellow-900';
      case 'uploading': return 'text-blue-400 bg-blue-900';
      case 'recording': return 'text-red-400 bg-red-900';
      default: return 'text-gray-400 bg-gray-900';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading recordings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-4">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-gray-400 hover:text-white mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </button>
          <h1 className="text-2xl font-bold">{studio?.name} - Recordings</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {recordings.length === 0 ? (
          <div className="card text-center py-12">
            <Clock className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No recordings yet</h3>
            <p className="text-gray-400">Start a recording session to see it here</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h2 className="text-xl font-bold">All Recordings</h2>
              {recordings.map((recording) => (
                <div
                  key={recording._id}
                  className={`card cursor-pointer transition-all ${
                    selectedRecording?._id === recording._id 
                      ? 'border-primary-500' 
                      : 'hover:border-gray-600'
                  }`}
                  onClick={() => handleViewRecording(recording._id)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className={`inline-block px-2 py-1 rounded text-xs font-medium mb-2 ${getStatusColor(recording.status)}`}>
                        {recording.status.toUpperCase()}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(recording.startedAt).toLocaleDateString()}
                        </div>
                        {recording.duration && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {formatDuration(recording.duration)}
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteRecording(recording._id);
                      }}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-300">
                      {recording.participants.length} participant{recording.participants.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {selectedRecording && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold">Recording Details</h2>
                <div className="card">
                  <div className="mb-4">
                    <div className={`inline-block px-2 py-1 rounded text-xs font-medium mb-3 ${getStatusColor(selectedRecording.status)}`}>
                      {selectedRecording.status.toUpperCase()}
                    </div>
                    <div className="space-y-2 text-sm text-gray-400">
                      <div>Started: {new Date(selectedRecording.startedAt).toLocaleString()}</div>
                      {selectedRecording.endedAt && (
                        <div>Ended: {new Date(selectedRecording.endedAt).toLocaleString()}</div>
                      )}
                      {selectedRecording.duration && (
                        <div>Duration: {formatDuration(selectedRecording.duration)}</div>
                      )}
                    </div>
                  </div>

                  <h3 className="font-semibold mb-3">Participants & Downloads</h3>
                  <div className="space-y-3">
                    {selectedRecording.participants.map((participant, index) => (
                      <div key={index} className="bg-gray-900 rounded-lg p-4">
                        <h4 className="font-medium mb-3">{participant.participantName}</h4>
                        
                        {selectedRecording.status === 'completed' ? (
                          <div className="space-y-2">
                            {participant.videoDownloadUrl && (
                              <a
                                href={participant.videoDownloadUrl}
                                download
                                className="flex items-center justify-between bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded transition-colors"
                              >
                                <span className="text-sm">Video (MP4)</span>
                                <Download className="w-4 h-4" />
                              </a>
                            )}
                            {participant.audioDownloadUrl && (
                              <a
                                href={participant.audioDownloadUrl}
                                download
                                className="flex items-center justify-between bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded transition-colors"
                              >
                                <span className="text-sm">Audio (WAV)</span>
                                <Download className="w-4 h-4" />
                              </a>
                            )}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-400">
                            {selectedRecording.status === 'processing' && 'Processing files...'}
                            {selectedRecording.status === 'uploading' && 'Uploading...'}
                            {selectedRecording.status === 'recording' && 'Recording in progress...'}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
