const socket = io();

const DEBUG = true;
function log(...args) {
    if (DEBUG) console.log('[WebRTC]', new Date().toISOString(), ...args);
}

const config = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' }
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
const nameInput = document.getElementById('nameInput');
const localVideo = document.getElementById('localVideo');
const remoteVideos = document.getElementById('remoteVideos');
const status = document.getElementById('status');
const localLabel = document.getElementById('localLabel');
const debugPanel = document.getElementById('debugPanel');
const setupOverlay = document.getElementById('setupOverlay');
const meetingContainer = document.getElementById('meetingContainer');

let userName = 'Anonymous';
let users = {}; // Store user names
let statusTimeout = null;

nameInput.addEventListener('input', (e) => {
    userName = e.target.value.trim() || 'Anonymous';
});

connectBtn.addEventListener('click', connect);
disconnectBtn.addEventListener('click', disconnect);
toggleAudioBtn.addEventListener('click', toggleAudio);
toggleVideoBtn.addEventListener('click', toggleVideo);

socket.on('connect', () => {
    log('Socket connected:', socket.id);
    addDebug('Socket connected: ' + socket.id);
});

socket.on('user-connected', async (userId) => {
    log('User connected:', userId);
    addDebug('User connected: ' + userId);
    updateStatus(`User connected`);
    await createPeerConnection(userId, true);
});

socket.on('user-disconnected', (userId) => {
    log('User disconnected:', userId);
    addDebug('User disconnected: ' + userId);
    updateStatus(`User ${userId.substring(0, 8)} disconnected`);
    if (peerConnections[userId]) {
        peerConnections[userId].close();
        delete peerConnections[userId];
    }
    const container = document.getElementById(`container-${userId}`);
    if (container) {
        container.remove();
    }
});

socket.on('offer', async (data) => {
    log('Received offer from:', data.from);
    addDebug('Received offer from: ' + data.from);
    try {
        await createPeerConnection(data.from, false);
        await peerConnections[data.from].setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await peerConnections[data.from].createAnswer();
        await peerConnections[data.from].setLocalDescription(answer);
        socket.emit('answer', { to: data.from, answer });
        log('Sent answer to:', data.from);
        addDebug('Sent answer to: ' + data.from);
    } catch (error) {
        log('Error handling offer:', error);
        addDebug('ERROR offer: ' + error.message);
    }
});

socket.on('answer', async (data) => {
    log('Received answer from:', data.from);
    addDebug('Received answer from: ' + data.from);
    try {
        await peerConnections[data.from].setRemoteDescription(new RTCSessionDescription(data.answer));
    } catch (error) {
        log('Error handling answer:', error);
        addDebug('ERROR answer: ' + error.message);
    }
});

socket.on('ice-candidate', async (data) => {
    log('Received ICE candidate from:', data.from);
    if (peerConnections[data.from]) {
        try {
            await peerConnections[data.from].addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (error) {
            log('Error adding ICE candidate:', error);
        }
    }
});

function addDebug(message) {
    if (debugPanel) {
        const time = new Date().toLocaleTimeString();
        debugPanel.innerHTML += `<div>[${time}] ${message}</div>`;
        debugPanel.scrollTop = debugPanel.scrollHeight;
    }
}

async function connect() {
    try {
        log('Requesting media devices...');
        addDebug('Requesting camera and microphone...');
        
        localStream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 640 }, height: { ideal: 480 } },
            audio: { echoCancellation: true, noiseSuppression: true }
        });
        
        log('Got local stream:', localStream.getTracks().map(t => t.kind + ':' + t.enabled));
        addDebug('Got stream: ' + localStream.getTracks().length + ' tracks');
        
        localVideo.srcObject = localStream;
        localLabel.textContent = userName;
        
        // Hide setup, show meeting
        setupOverlay.style.display = 'none';
        meetingContainer.style.display = 'block';
        
        socket.emit('join-room');

        disconnectBtn.disabled = false;
        toggleAudioBtn.disabled = false;
        toggleVideoBtn.disabled = false;
        toggleAudioBtn.classList.add('active');
        toggleVideoBtn.classList.add('active');
        
        // Send user info to other participants
        socket.emit('user-info', { name: userName });
        
        showStatus('Waiting for others to join...');
        addDebug('Joined room, waiting for peers...');
    } catch (error) {
        log('Error accessing media devices:', error);
        addDebug('ERROR: ' + error.message);
        alert('Could not access camera/microphone: ' + error.message);
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
    
    // Return to setup
    meetingContainer.style.display = 'none';
    setupOverlay.style.display = 'flex';
    
    disconnectBtn.disabled = true;
    toggleAudioBtn.disabled = true;
    toggleVideoBtn.disabled = true;
    
    showStatus('Disconnected');
}

function toggleAudio() {
    if (localStream) {
        isAudioEnabled = !isAudioEnabled;
        localStream.getAudioTracks().forEach(track => {
            track.enabled = isAudioEnabled;
        });
        
        if (isAudioEnabled) {
            toggleAudioBtn.classList.remove('inactive');
            toggleAudioBtn.classList.add('active');
        } else {
            toggleAudioBtn.classList.remove('active');
            toggleAudioBtn.classList.add('inactive');
        }
        
        showStatus(isAudioEnabled ? 'Microphone on' : 'Microphone off');
    }
}

function toggleVideo() {
    if (localStream) {
        isVideoEnabled = !isVideoEnabled;
        localStream.getVideoTracks().forEach(track => {
            track.enabled = isVideoEnabled;
        });
        
        if (isVideoEnabled) {
            toggleVideoBtn.classList.remove('inactive');
            toggleVideoBtn.classList.add('active');
        } else {
            toggleVideoBtn.classList.remove('active');
            toggleVideoBtn.classList.add('inactive');
        }
        
        showStatus(isVideoEnabled ? 'Camera on' : 'Camera off');
    }
}

async function createPeerConnection(userId, isInitiator) {
    log('Creating peer connection for:', userId, 'isInitiator:', isInitiator);
    addDebug('Creating connection to: ' + userId.substring(0, 8));
    
    const peerConnection = new RTCPeerConnection(config);
    peerConnections[userId] = peerConnection;
    
    peerConnection.onconnectionstatechange = () => {
        log('Connection state:', peerConnection.connectionState, 'for:', userId);
        addDebug('Connection: ' + peerConnection.connectionState);
    };
    
    peerConnection.oniceconnectionstatechange = () => {
        log('ICE state:', peerConnection.iceConnectionState, 'for:', userId);
        addDebug('ICE: ' + peerConnection.iceConnectionState);
    };
    
    peerConnection.onicegatheringstatechange = () => {
        log('ICE gathering state:', peerConnection.iceGatheringState);
    };
    
    localStream.getTracks().forEach(track => {
        log('Adding track:', track.kind, 'enabled:', track.enabled);
        peerConnection.addTrack(track, localStream);
    });
    
    peerConnection.ontrack = (event) => {
        log('Received remote track:', event.track.kind, 'streams:', event.streams.length);
        addDebug('Got remote ' + event.track.kind + ' track');
        
        if (!event.streams || !event.streams[0]) {
            log('No streams in track event');
            return;
        }
        
        let videoElement = document.getElementById(`video-${userId}`);
        let container = document.getElementById(`container-${userId}`);
        
        if (!container) {
            container = document.createElement('div');
            container.id = `container-${userId}`;
            container.className = 'video-container';
            
            videoElement = document.createElement('video');
            videoElement.id = `video-${userId}`;
            videoElement.setAttribute('autoplay', '');
            videoElement.setAttribute('playsinline', '');
            videoElement.setAttribute('webkit-playsinline', '');
            videoElement.playsInline = true;
            videoElement.muted = false;
            
            const label = document.createElement('div');
            label.className = 'video-label';
            label.textContent = `User ${userId.substring(0, 8)}`;
            
            container.appendChild(videoElement);
            container.appendChild(label);
            remoteVideos.appendChild(container);
        }
        
        // Always update srcObject when we get a new stream
        const stream = event.streams[0];
        if (videoElement.srcObject !== stream) {
            videoElement.srcObject = stream;
            log('Set remote stream on video element');
            addDebug('Stream attached to video');
            
            // iOS requires explicit play() call after user interaction
            const playPromise = videoElement.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    log('Video playing successfully');
                    addDebug('Video playing');
                }).catch(error => {
                    log('Autoplay prevented:', error);
                    addDebug('Tap video to play');
                    // Add click handler for iOS
                    videoElement.onclick = () => {
                        videoElement.play();
                        videoElement.onclick = null;
                    };
                });
            }
        }
    };
    
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            log('Sending ICE candidate to:', userId);
            socket.emit('ice-candidate', { to: userId, candidate: event.candidate });
        }
    };
    
    if (isInitiator) {
        try {
            const offer = await peerConnection.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true
            });
            await peerConnection.setLocalDescription(offer);
            socket.emit('offer', { to: userId, offer });
            log('Sent offer to:', userId);
            addDebug('Sent offer to: ' + userId.substring(0, 8));
        } catch (error) {
            log('Error creating offer:', error);
            addDebug('ERROR creating offer: ' + error.message);
        }
    }
}

function updateUserLabels() {
    // Update local label
    localLabel.textContent = userName;
    
    // Update remote user labels
    Object.keys(users).forEach(userId => {
        const label = document.querySelector(`#container-${userId} .video-label`);
        if (label) {
            label.textContent = users[userId];
        }
    });
}

function showStatus(message) {
    status.textContent = message;
    status.classList.add('show');
    
    if (statusTimeout) clearTimeout(statusTimeout);
    statusTimeout = setTimeout(() => {
        status.classList.remove('show');
    }, 3000);
}

function updateStatus(message) {
    showStatus(message);
}
