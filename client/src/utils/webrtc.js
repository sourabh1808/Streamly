const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

export class WebRTCPeer {
  constructor(participantId, socket, stream) {
    this.participantId = participantId;
    this.socket = socket;
    this.localStream = stream;
    this.peerConnection = null;
    this.remoteStream = null;
  }

  async createOffer() {
    this.peerConnection = new RTCPeerConnection(ICE_SERVERS);
    
    this.setupPeerConnection();
    
    this.localStream.getTracks().forEach(track => {
      this.peerConnection.addTrack(track, this.localStream);
    });

    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);

    this.socket.emit('webrtc-offer', {
      to: this.participantId,
      offer
    });
  }

  async handleOffer(offer) {
    this.peerConnection = new RTCPeerConnection(ICE_SERVERS);
    
    this.setupPeerConnection();
    
    this.localStream.getTracks().forEach(track => {
      this.peerConnection.addTrack(track, this.localStream);
    });

    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);

    this.socket.emit('webrtc-answer', {
      to: this.participantId,
      answer
    });
  }

  async handleAnswer(answer) {
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
  }

  async handleIceCandidate(candidate) {
    if (this.peerConnection) {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    }
  }

  setupPeerConnection() {
    this.remoteStream = new MediaStream();

    this.peerConnection.ontrack = (event) => {
      event.streams[0].getTracks().forEach(track => {
        this.remoteStream.addTrack(track);
      });
    };

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit('webrtc-ice-candidate', {
          to: this.participantId,
          candidate: event.candidate
        });
      }
    };

    this.peerConnection.onconnectionstatechange = () => {
      console.log('Connection state:', this.peerConnection.connectionState);
    };
  }

  close() {
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
  }

  getRemoteStream() {
    return this.remoteStream;
  }
}

export const getMediaStream = async (constraints = { video: true, audio: true }) => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    return stream;
  } catch (error) {
    console.error('Error accessing media devices:', error);
    throw error;
  }
};

export const getDevices = async () => {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return {
      cameras: devices.filter(d => d.kind === 'videoinput'),
      microphones: devices.filter(d => d.kind === 'audioinput'),
      speakers: devices.filter(d => d.kind === 'audiooutput')
    };
  } catch (error) {
    console.error('Error getting devices:', error);
    throw error;
  }
};
