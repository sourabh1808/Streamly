import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { studioAPI, recordingAPI } from '../utils/api';
import toast from 'react-hot-toast';
import { Plus, Video, LogOut, Copy, Trash2, Calendar, Clock } from 'lucide-react';

export default function Dashboard() {
  const [studios, setStudios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newStudioName, setNewStudioName] = useState('');
  const [creating, setCreating] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchStudios();
  }, []);

  const fetchStudios = async () => {
    try {
      const { data } = await studioAPI.getAll();
      setStudios(data);
    } catch (error) {
      toast.error('Failed to load studios');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStudio = async (e) => {
    e.preventDefault();
    
    if (!newStudioName.trim()) {
      toast.error('Please enter a studio name');
      return;
    }

    setCreating(true);

    try {
      const { data } = await studioAPI.create({ name: newStudioName });
      setStudios([data, ...studios]);
      setNewStudioName('');
      setShowCreateModal(false);
      toast.success('Studio created successfully!');
    } catch (error) {
      toast.error('Failed to create studio');
    } finally {
      setCreating(false);
    }
  };

  const handleCopyLink = (inviteLink) => {
    navigator.clipboard.writeText(inviteLink);
    toast.success('Invite link copied!');
  };

  const handleDeleteStudio = async (studioId) => {
    if (!confirm('Are you sure you want to delete this studio?')) return;

    try {
      await studioAPI.delete(studioId);
      setStudios(studios.filter(s => s._id !== studioId));
      toast.success('Studio deleted');
    } catch (error) {
      toast.error('Failed to delete studio');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <nav className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Video className="w-8 h-8 text-primary-500" />
              <span className="ml-2 text-xl font-bold">Streamly</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-gray-400">Hello, {user?.name}</span>
              <button onClick={handleLogout} className="btn-secondary flex items-center gap-2">
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">My Studios</h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create Studio
          </button>
        </div>

        {studios.length === 0 ? (
          <div className="card text-center py-12">
            <Video className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No studios yet</h3>
            <p className="text-gray-400 mb-6">Create your first studio to start recording</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary mx-auto"
            >
              Create Your First Studio
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {studios.map((studio) => (
              <div key={studio._id} className="card hover:border-primary-500 transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-xl font-semibold">{studio.name}</h3>
                  <button
                    onClick={() => handleDeleteStudio(studio._id)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center text-sm text-gray-400">
                    <Calendar className="w-4 h-4 mr-2" />
                    Created {new Date(studio.createdAt).toLocaleDateString()}
                  </div>
                </div>

                <div className="bg-gray-900 rounded-lg p-3 mb-4">
                  <p className="text-xs text-gray-400 mb-1">Invite Link</p>
                  <div className="flex items-center gap-2">
                    <code className="text-sm text-primary-400 flex-1 truncate">
                      {studio.inviteLink}
                    </code>
                    <button
                      onClick={() => handleCopyLink(studio.inviteLink)}
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => navigate(`/studio/${studio.inviteCode}`)}
                    className="btn-primary flex-1"
                  >
                    Enter Studio
                  </button>
                  <button
                    onClick={() => navigate(`/recordings/${studio._id}`)}
                    className="btn-secondary"
                  >
                    Recordings
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full border border-gray-700">
            <h2 className="text-2xl font-bold mb-4">Create New Studio</h2>
            <form onSubmit={handleCreateStudio}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Studio Name</label>
                <input
                  type="text"
                  value={newStudioName}
                  onChange={(e) => setNewStudioName(e.target.value)}
                  className="input-field"
                  placeholder="My Podcast Studio"
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="btn-primary flex-1"
                >
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
