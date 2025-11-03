import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use((config) => {
  const token = JSON.parse(localStorage.getItem('streamly-auth'))?.state?.token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me')
};

export const studioAPI = {
  getAll: () => api.get('/studios'),
  create: (data) => api.post('/studios', data),
  getById: (id) => api.get(`/studios/${id}`),
  getByInviteCode: (code) => api.get(`/studios/join/${code}`),
  delete: (id) => api.delete(`/studios/${id}`)
};

export const recordingAPI = {
  getByStudio: (studioId) => api.get(`/recordings/studio/${studioId}`),
  getById: (id) => api.get(`/recordings/${id}`),
  delete: (id) => api.delete(`/recordings/${id}`)
};

export const uploadAPI = {
  uploadChunk: (formData) => {
    return axios.post(`${API_URL}/upload/chunk`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },
  finalize: (data) => api.post('/upload/finalize', data)
};

export default api;
