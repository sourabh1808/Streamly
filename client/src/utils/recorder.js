import { uploadAPI } from './api';

const CHUNK_DURATION = 30000;

export class LocalRecorder {
  constructor(stream, sessionId, participantId, participantName) {
    this.stream = stream;
    this.sessionId = sessionId;
    this.participantId = participantId;
    this.participantName = participantName;
    this.videoRecorder = null;
    this.audioRecorder = null;
    this.videoChunks = [];
    this.audioChunks = [];
    this.chunkIndex = 0;
    this.isRecording = false;
    this.uploadQueue = [];
    this.isUploading = false;
  }

  async start() {
    try {
      const videoStream = new MediaStream(
        this.stream.getVideoTracks()
      );
      
      const audioStream = new MediaStream(
        this.stream.getAudioTracks()
      );

      const videoOptions = {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 8000000
      };

      const audioOptions = {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 256000
      };

      this.videoRecorder = new MediaRecorder(videoStream, videoOptions);
      this.audioRecorder = new MediaRecorder(audioStream, audioOptions);

      this.videoRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.handleVideoChunk(event.data);
        }
      };

      this.audioRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.handleAudioChunk(event.data);
        }
      };

      this.videoRecorder.start(CHUNK_DURATION);
      this.audioRecorder.start(CHUNK_DURATION);

      this.isRecording = true;

      console.log('Local recording started');
    } catch (error) {
      console.error('Error starting recorder:', error);
      throw error;
    }
  }

  async stop() {
    return new Promise((resolve) => {
      this.isRecording = false;

      if (this.videoRecorder && this.videoRecorder.state !== 'inactive') {
        this.videoRecorder.stop();
      }

      if (this.audioRecorder && this.audioRecorder.state !== 'inactive') {
        this.audioRecorder.stop();
      }

      const checkUploadComplete = setInterval(() => {
        if (this.uploadQueue.length === 0 && !this.isUploading) {
          clearInterval(checkUploadComplete);
          resolve();
        }
      }, 500);
    });
  }

  handleVideoChunk(blob) {
    this.uploadChunk(blob, 'video', this.chunkIndex);
    this.chunkIndex++;
  }

  handleAudioChunk(blob) {
    this.uploadChunk(blob, 'audio', this.chunkIndex - 1);
  }

  async uploadChunk(blob, trackType, index) {
    const formData = new FormData();
    formData.append('chunk', blob);
    formData.append('sessionId', this.sessionId);
    formData.append('participantId', this.participantId);
    formData.append('participantName', this.participantName);
    formData.append('chunkIndex', index);
    formData.append('trackType', trackType);

    this.uploadQueue.push({ formData, trackType, index });

    if (!this.isUploading) {
      this.processUploadQueue();
    }
  }

  async processUploadQueue() {
    if (this.uploadQueue.length === 0) {
      this.isUploading = false;
      return;
    }

    this.isUploading = true;

    const { formData, trackType, index } = this.uploadQueue.shift();

    try {
      await uploadAPI.uploadChunk(formData);
      console.log(`${trackType} chunk ${index} uploaded successfully`);
    } catch (error) {
      console.error(`Error uploading ${trackType} chunk ${index}:`, error);
      this.uploadQueue.unshift({ formData, trackType, index });
      
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    this.processUploadQueue();
  }

  async finalize() {
    try {
      await uploadAPI.finalize({
        sessionId: this.sessionId,
        participantId: this.participantId,
        trackType: 'video',
        totalChunks: this.chunkIndex
      });

      console.log('Upload finalized');
    } catch (error) {
      console.error('Error finalizing upload:', error);
      throw error;
    }
  }

  getProgress() {
    const total = this.chunkIndex * 2;
    const uploaded = total - this.uploadQueue.length;
    return total > 0 ? (uploaded / total) * 100 : 0;
  }
}
