# Stupid-Simple-Meet

A simple audio and video conference application where users only need to click "Connect" to participate.

## Features

- ✅ Simple connection with one button press
- ✅ Audio and video streaming
- ✅ Support for multiple participants
- ✅ Toggle microphone and camera on/off
- ✅ WebRTC with STUN server for NAT traversal
- ✅ Responsive design

## Technology

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Backend**: Node.js, Express, Socket.IO
- **WebRTC**: Peer-to-peer audio/video
- **STUN Server**: Google's public STUN servers

## Installation

### Local Development

```bash
npm install
npm start
```

Open `http://localhost:3000` in your browser.

### Docker

```bash
docker build -t stupid-simple-meet .
docker run -p 3000:3000 stupid-simple-meet
```

### Docker Compose

```bash
docker-compose up -d
```

## Easypanel Deployment

### Step 1: Create a new project in Easypanel

1. Log in to your Easypanel dashboard
2. Click on "Create" → "App"
3. Choose "GitHub" or "Docker Image"

### Step 2: Configure the application

**If using GitHub:**
- Connect your GitHub repository
- Select branch (e.g. `main`)
- Easypanel will automatically detect the Dockerfile

**If using Docker Image:**
- Build and push your image to Docker Hub first:
  ```bash
  docker build -t yourusername/webrtc-conference .
  docker push yourusername/webrtc-conference
  ```
- Use image: `yourusername/webrtc-conference:latest`

### Step 3: Configure ports

- **Container Port**: 3000
- **Public Port**: 80 or 443 (with SSL)

### Step 4: Environment variables (optional)

```
PORT=3000
```

### Step 5: Deploy

Click on "Deploy" and wait for the container to start.

### Step 6: Access

Your application will be available at:
- `http://your-domain.com` (if you configured a domain)
- `http://your-server-ip` (direct IP access)

## STUN/TURN Server

The application uses Google's public STUN servers:
- `stun:stun.l.google.com:19302`
- `stun:stun1.l.google.com:19302`

This is sufficient for most use cases. If you have issues with connections behind strict NAT/firewall, you may need a TURN server.

### Add your own TURN server (optional)

Edit `public/app.js` and update `config`:

```javascript
const config = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        {
            urls: 'turn:your-turn-server.com:3478',
            username: 'username',
            credential: 'password'
        }
    ]
};
```

## Usage

1. Open the application in your browser
2. Click "Connect"
3. Grant permission for camera and microphone
4. See yourself and other participants
5. All connected users will automatically see each other

## Security

For production, consider:
- Enable HTTPS (mandatory for WebRTC in modern browsers)
- Add authentication
- Limit the number of concurrent users
- Implement room functionality with unique IDs

## License

MIT License

Copyright (c) 2024 Stupid Simple Conference

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
