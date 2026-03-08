const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static(__dirname));

const users = {}; 
const ADMIN_NAME = "TonPseudo"; // ⚠️ CHANGE-LE ICI

io.on('connection', (socket) => {
    const ip = (socket.handshake.headers['x-forwarded-for'] || socket.conn.remoteAddress || "0.0.0.0").split(',')[0].trim();

    socket.on('init_user', (data) => {
        users[socket.id] = { 
            ...data, 
            ip, 
            sid: socket.id, 
            isAdmin: (data.name === ADMIN_NAME) 
        };
        sync();
    });

    function sync() {
        Object.keys(users).forEach(sid => {
            const requester = users[sid];
            const list = Object.values(users).map(u => ({
                name: u.name, pp: u.pp, sid: u.sid,
                ip: requester.isAdmin ? u.ip : "HIDDEN"
            }));
            io.to(sid).emit('update_users', list);
        });
    }

    // --- VOIP SIGNALING ---
    socket.on('call_request', (d) => {
        io.to(d.to).emit('incoming_call', { signal: d.signal, from: socket.id, name: users[socket.id].name, pp: users[socket.id].pp });
    });

    socket.on('call_accept', (d) => {
        io.to(d.to).emit('call_finalized', d.signal);
    });

    socket.on('ice_candidate', (d) => {
        io.to(d.to).emit('ice_candidate', d.candidate);
    });

    socket.on('chat_msg', (d) => io.emit('chat_msg', d));
    socket.on('disconnect', () => { delete users[socket.id]; sync(); });
});

http.listen(3000, () => console.log("GLASS_OS_ONLINE"));
