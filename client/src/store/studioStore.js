import { create } from 'zustand';

export const useStudioStore = create((set) => ({
  currentStudio: null,
  participants: [],
  isRecording: false,
  sessionId: null,
  localStream: null,
  mediaRecorder: null,
  uploadProgress: 0,
  
  setCurrentStudio: (studio) => set({ currentStudio: studio }),
  
  setParticipants: (participants) => set({ participants }),
  
  addParticipant: (participant) => set((state) => ({
    participants: [...state.participants, participant]
  })),
  
  removeParticipant: (participantId) => set((state) => ({
    participants: state.participants.filter(p => p.participantId !== participantId)
  })),
  
  setRecording: (isRecording, sessionId = null) => set({ isRecording, sessionId }),
  
  setLocalStream: (stream) => set({ localStream: stream }),
  
  setMediaRecorder: (recorder) => set({ mediaRecorder: recorder }),
  
  setUploadProgress: (progress) => set({ uploadProgress: progress }),
  
  reset: () => set({
    currentStudio: null,
    participants: [],
    isRecording: false,
    sessionId: null,
    localStream: null,
    mediaRecorder: null,
    uploadProgress: 0
  })
}));
