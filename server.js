const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static(__dirname));

const users = {}; 
const ADMIN_NAME = "toucheur2pp";

io.on('connection', (socket) => {
    const ip = (socket.handshake.headers['x-forwarded-for'] || socket.conn.remoteAddress || "0.0.0.0").split(',')[0].trim();

    socket.on('init_user', (data) => {
        users[socket.id] = { ...data, ip, sid: socket.id };
        
        // On envoie la liste. Si c'est l'admin, il reçoit les IPs, sinon on les masque.
        updateAllUsers();
    });

    function updateAllUsers() {
        Object.keys(users).forEach(sid => {
            const isTargetAdmin = users[sid].name === ADMIN_NAME;
            const userList = Object.values(users).map(u => ({
                name: u.name,
                pp: u.pp,
                sid: u.sid,
                theme: u.theme,
                // L'IP n'est envoyée que si le destinataire est l'Admin
                ip: isTargetAdmin ? u.ip : "SÉCURISÉ" 
            }));
            io.to(sid).emit('update_users', userList);
        });
    }

    // --- SIGNALING WEBRTC ---
    socket.on('call_user', (data) => {
        io.to(data.to).emit('incoming_call', { signal: data.signal, from: socket.id, name: users[socket.id].name, pp: users[socket.id].pp });
    });
    socket.on('accept_call', (data) => { io.to(data.to).emit('call_accepted', data.signal); });
    socket.on('ice_candidate', (data) => { io.to(data.to).emit('ice_candidate', data.candidate); });

    socket.on('chat_msg', (data) => io.emit('chat_msg', data));
    
    socket.on('disconnect', () => { delete users[socket.id]; updateAllUsers(); });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log("NEON_PREMIUM_V25_READY"));

