const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static(__dirname));

const WHITELIST = ["TonPseudo"];
const users = {};

io.on('connection', (socket) => {
    const ip = (socket.handshake.headers['x-forwarded-for'] || socket.conn.remoteAddress || "0.0.0.0").split(',')[0].trim();

    socket.on('init_user', (data) => {
        users[socket.id] = { 
            ...data, 
            ip, 
            sid: socket.id, 
            elite: WHITELIST.includes(data.name),
            lastSeen: Date.now()
        };
        updateAll();
    });

    function updateAll() {
        Object.keys(users).forEach(sid => {
            const req = users[sid];
            const list = Object.values(users).map(u => ({
                name: u.name, pp: u.pp, sid: u.sid, elite: u.elite,
                aura: u.aura || "#8e2de2", bio: u.bio || "",
                ip: req.elite ? u.ip : "HIDDEN"
            }));
            io.to(sid).emit('sync_users', list);
        });
    }

    socket.on('chat_global', (d) => io.emit('msg_global', { ...d, from: socket.id }));
    
    socket.on('chat_private', (d) => {
        const payload = { ...d, from: socket.id, name: users[socket.id].name };
        io.to(d.to).emit('msg_private', payload);
        socket.emit('msg_private', payload);
    });

    socket.on('call_offer', (d) => io.to(d.to).emit('call_offer', { signal: d.signal, from: socket.id, name: users[socket.id].name, pp: users[socket.id].pp }));
    socket.on('call_answer', (d) => io.to(d.to).emit('call_answer', d.signal));
    socket.on('ice', (d) => io.to(d.to).emit('ice', d.candidate));

    socket.on('disconnect', () => { delete users[socket.id]; updateAll(); });
});

http.listen(3000, () => console.log("NEBULA_V30_ACTIVE"));
