const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.static('public'));

const users = new Map();

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    
    socket.on('join-room', () => {
        users.set(socket.id, socket);
        
        users.forEach((_, userId) => {
            if (userId !== socket.id) {
                socket.emit('user-connected', userId);
                io.to(userId).emit('user-connected', socket.id);
            }
        });
        
        console.log('User joined room:', socket.id);
        console.log('Total users:', users.size);
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
        users.forEach((_, userId) => {
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
