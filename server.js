const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.static('public'));

const users = new Map(); // userId -> { socket, name }

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    
    socket.on('join-room', () => {
        // Set default name
        users.set(socket.id, { socket, name: 'Anonymous' });
        
        // Notify existing users about new user
        users.forEach((userData, userId) => {
            if (userId !== socket.id) {
                socket.emit('user-connected', userId);
                socket.emit('user-info', { userId, name: userData.name });
                
                userData.socket.emit('user-connected', socket.id);
                userData.socket.emit('user-info', { userId: socket.id, name: users.get(socket.id).name });
            }
        });
        
        console.log('User joined room:', socket.id);
        console.log('Total users:', users.size);
    });
    
    socket.on('user-info', (data) => {
        if (users.has(socket.id)) {
            users.get(socket.id).name = data.name;
            
            // Broadcast updated name to all other users
            users.forEach((userData, userId) => {
                if (userId !== socket.id) {
                    userData.socket.emit('user-info', { userId: socket.id, name: data.name });
                }
            });
        }
    });
    
    socket.on('offer', (data) => {
        io.to(data.to).emit('offer', { from: socket.id, offer: data.offer });
    });
    
    socket.on('answer', (data) => {
        io.to(data.to).emit('answer', { from: socket.id, answer: data.answer });
    });
    
    socket.on('ice-candidate', (data) => {
        io.to(data.to).emit('ice-candidate', { from: socket.id, candidate: data.candidate });
    });
    
    socket.on('leave-room', () => {
        handleDisconnect(socket.id);
    });
    
    socket.on('disconnect', () => {
        handleDisconnect(socket.id);
        console.log('User disconnected:', socket.id);
    });
});

function handleDisconnect(socketId) {
    if (users.has(socketId)) {
        users.delete(socketId);
        
        // Notify remaining users
        users.forEach((userData, userId) => {
            io.to(userId).emit('user-disconnected', socketId);
        });
        
        console.log('User left room:', socketId);
        console.log('Total users:', users.size);
    }
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
