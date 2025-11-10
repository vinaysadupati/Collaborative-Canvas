// Import necessary modules
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');

// Import the state manager
const drawingState = require('./drawing-state');

// Server Setup 
const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// User storage
const users = {};

// Helper function to generate a random HSL color
function getRandomColor() {
    const hue = Math.floor(Math.random() * 360);
    return `hsl(${hue}, 90%, 60%)`;
}

// Helper function to get users only for a specific room
function getUsersInRoom(roomName) {
    const usersInRoom = {};
    for (const id in users) {
        if (users[id].room === roomName) {
            usersInRoom[id] = users[id];
        }
    }
    return usersInRoom;
}

// Static File Serving 
const clientPath = path.join(__dirname, '../client');
app.use(express.static(clientPath));

//  WebSocket Connection 
io.on('connection', (socket) => {
    console.log(`A user connected: ${socket.id}`);

    //  Handling room joining
    socket.on('room:join', (data) => {
        const { roomName } = data;

        if (!roomName) {
            console.log("Invalid join attempt", data);
            return;
        }

        if (socket.roomName) {
            socket.leave(socket.roomName);
        }

        socket.join(roomName);
        socket.roomName = roomName;

        users[socket.id] = {
            id: socket.id,
            name: null,
            color: getRandomColor(),
            room: roomName
        };

        console.log(`User ${socket.id} joined room: ${roomName} (pending name)`);

        // Send user list so they see "Joining..."
        io.to(roomName).emit('users:update', getUsersInRoom(roomName));
    });

    // Handling username
    socket.on('user:set-name', (userName) => {
        const user = users[socket.id];
        if (!user || !socket.roomName) {
            console.log(`Invalid user:set-name attempt for socket ${socket.id}`);
            return;
        }

        const roomName = user.room;
        let validatedName = (userName || 'Unnamed').trim().substring(0, 20);
        const usersInRoom = getUsersInRoom(roomName);

        let counter = 1;
        const originalName = validatedName;
        while (Object.values(usersInRoom).some(u => u.id !== socket.id && u.name === validatedName)) {
            validatedName = `${originalName} (${counter})`;
            counter++;
        }

        user.name = validatedName;
        users[socket.id] = user;

        console.log(`User ${socket.id} set name to: ${validatedName}`);
        socket.emit('user:self', user);
        io.to(roomName).emit('users:update', getUsersInRoom(roomName));
    });

    // NEW HANDLER for sending history on request 
    socket.on('canvas:request-history', () => {
        if (socket.roomName) {
            console.log(`Sending history for room ${socket.roomName} to ${socket.id}`);
            socket.emit('canvas:load', drawingState.getHistory(socket.roomName));
        }
    });

    //  Handling drawing
    socket.on('draw:start', (data) => {
        const roomName = socket.roomName;
        if (!roomName) return;

        socket.currentPath = {
            id: `${socket.id}-${Date.now()}`,
            type: 'draw',
            tool: data.tool,
            color: data.color,
            width: data.width,
            points: [{ x: data.x, y: data.y }]
        };
    });

    socket.on('draw:move', (data) => {
        if (!socket.currentPath) return;
        socket.currentPath.points.push({ x: data.x, y: data.y });
    });

    socket.on('draw:end', () => {
        const roomName = socket.roomName;
        if (!roomName || !socket.currentPath) return;

        const operation = drawingState.addOperation(roomName, socket.currentPath);
        io.to(roomName).emit('operation:add', operation);
        socket.currentPath = null;
    });

    //  undo/redo/clear
    socket.on('operation:undo', () => {
        const roomName = socket.roomName;
        if (!roomName) return;
        const newHistory = drawingState.undoOperation(roomName);
        io.to(roomName).emit('canvas:redraw', newHistory);
    });

    socket.on('operation:redo', () => {
        const roomName = socket.roomName;
        if (!roomName) return;
        const newHistory = drawingState.redoOperation(roomName);
        io.to(roomName).emit('canvas:redraw', newHistory);
    });

    socket.on('operation:clear', () => {
        const roomName = socket.roomName;
        if (!roomName) return;

        const operation = {
            id: `${socket.id}-${Date.now()}`,
            type: 'clear'
        };
        drawingState.addOperation(roomName, operation);
        io.to(roomName).emit('operation:add', operation);
    });


    //  Handling cursor
    socket.on('cursor:move', (data) => {
        const roomName = socket.roomName;
        const userData = users[socket.id];
        if (!roomName || !userData) return;

        socket.broadcast.to(roomName).emit('cursor:update', {
            id: socket.id,
            x: data.x,
            y: data.y,
            color: userData.color
        });
    });

    //  disconnection
    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
        const userData = users[socket.id];

        if (userData) {
            const roomName = userData.room;
            delete users[socket.id];

            const usersLeftInRoom = getUsersInRoom(roomName);
            io.to(roomName).emit('users:update', usersLeftInRoom);

            if (Object.keys(usersLeftInRoom).length === 0) {
                drawingState.deleteRoom(roomName);
            }
        }
    });
});

//  Start the Server 
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
