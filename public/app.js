const socket = io();

const config = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

let localStream = null;
let peerConnections = {};
let isAudioEnabled = true;
let isVideoEnabled = true;

const connectBtn = document.getElementById('connectBtn');
const disconnectBtn = document.getElementById('disconnectBtn');
const toggleAudioBtn = document.getElementById('toggleAudio');
const toggleVideoBtn = document.getElementById('toggleVideo');
const localVideo = document.getElementById('localVideo');
const remoteVideos = document.getElementById('remoteVideos');
const status = document.getElementById('status');

connectBtn.addEventListener('click', connect);
disconnectBtn.addEventListener('click', disconnect);
toggleAudioBtn.addEventListener('click', toggleAudio);
toggleVideoBtn.addEventListener('click', toggleVideo);

socket.on('user-connected', async (userId) => {
    updateStatus(`Användare ${userId} anslöt`);
    await createPeerConnection(userId, true);
});

socket.on('user-disconnected', (userId) => {
    updateStatus(`Användare ${userId} kopplade från`);
    if (peerConnections[userId]) {
        peerConnections[userId].close();
        delete peerConnections[userId];
    }
    const videoElement = document.getElementById(`video-${userId}`);
    if (videoElement) {
        videoElement.parentElement.remove();
    }
});

socket.on('offer', async (data) => {
    await createPeerConnection(data.from, false);
    await peerConnections[data.from].setRemoteDescription(new RTCSessionDescription(data.offer));
    const answer = await peerConnections[data.from].createAnswer();
    await peerConnections[data.from].setLocalDescription(answer);
    socket.emit('answer', { to: data.from, answer });
});

socket.on('answer', async (data) => {
    await peerConnections[data.from].setRemoteDescription(new RTCSessionDescription(data.answer));
});

socket.on('ice-candidate', async (data) => {
    if (peerConnections[data.from]) {
        await peerConnections[data.from].addIceCandidate(new RTCIceCandidate(data.candidate));
    }
});

async function connect() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        });
        
        localVideo.srcObject = localStream;
        
        socket.emit('join-room');
        
        connectBtn.disabled = true;
        disconnectBtn.disabled = false;
        toggleAudioBtn.disabled = false;
        toggleVideoBtn.disabled = false;
        
        updateStatus('Ansluten! Väntar på andra användare...');
    } catch (error) {
        console.error('Error accessing media devices:', error);
        updateStatus('Kunde inte få åtkomst till kamera/mikrofon');
    }
}

function disconnect() {
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }
    
    Object.values(peerConnections).forEach(pc => pc.close());
    peerConnections = {};
    
    localVideo.srcObject = null;
    remoteVideos.innerHTML = '';
    
    socket.emit('leave-room');
    
    connectBtn.disabled = false;
    disconnectBtn.disabled = true;
    toggleAudioBtn.disabled = true;
    toggleVideoBtn.disabled = true;
    
    updateStatus('Frånkopplad');
}

function toggleAudio() {
    if (localStream) {
        isAudioEnabled = !isAudioEnabled;
        localStream.getAudioTracks().forEach(track => {
            track.enabled = isAudioEnabled;
        });
        toggleAudioBtn.textContent = isAudioEnabled ? '🎤 Mikrofon På' : '🎤 Mikrofon Av';
        toggleAudioBtn.style.background = isAudioEnabled ? 'white' : '#ef4444';
        toggleAudioBtn.style.color = isAudioEnabled ? '#333' : 'white';
    }
}

function toggleVideo() {
    if (localStream) {
        isVideoEnabled = !isVideoEnabled;
        localStream.getVideoTracks().forEach(track => {
            track.enabled = isVideoEnabled;
        });
        toggleVideoBtn.textContent = isVideoEnabled ? '📹 Kamera På' : '📹 Kamera Av';
        toggleVideoBtn.style.background = isVideoEnabled ? 'white' : '#ef4444';
        toggleVideoBtn.style.color = isVideoEnabled ? '#333' : 'white';
    }
}

async function createPeerConnection(userId, isInitiator) {
    const peerConnection = new RTCPeerConnection(config);
    peerConnections[userId] = peerConnection;
    
    localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
    });
    
    peerConnection.ontrack = (event) => {
        let videoElement = document.getElementById(`video-${userId}`);
        if (!videoElement) {
            const container = document.createElement('div');
            container.className = 'video-container';
            
            videoElement = document.createElement('video');
            videoElement.id = `video-${userId}`;
            videoElement.autoplay = true;
            videoElement.playsinline = true;
            
            const label = document.createElement('div');
            label.className = 'video-label';
            label.textContent = `Användare ${userId.substring(0, 8)}`;
            
            container.appendChild(videoElement);
            container.appendChild(label);
            remoteVideos.appendChild(container);
        }
        videoElement.srcObject = event.streams[0];
    };
    
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('ice-candidate', { to: userId, candidate: event.candidate });
        }
    };
    
    if (isInitiator) {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socket.emit('offer', { to: userId, offer });
    }
}

function updateStatus(message) {
    status.textContent = message;
}
