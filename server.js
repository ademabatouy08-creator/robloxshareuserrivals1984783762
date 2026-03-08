const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static(__dirname));

const users = {}; 
const groups = {}; 
const MY_NAME = "TonPseudo"; // ⚠️ METS TON PSEUDO ICI

io.on('connection', (socket) => {
    const ip = (socket.handshake.headers['x-forwarded-for'] || socket.conn.remoteAddress || "0.0.0.0").split(',')[0].trim();

    socket.on('init_user', (data) => {
        users[socket.id] = { ...data, ip, sid: socket.id, friends: [], isAdmin: (data.name === MY_NAME) };
        syncUsers();
    });

    function syncUsers() {
        Object.keys(users).forEach(sid => {
            const current = users[sid];
            const list = Object.values(users).map(u => ({
                name: u.name, pp: u.pp, sid: u.sid, 
                ip: current.isAdmin ? u.ip : "HIDDEN" // SEUL TOI VOIS LES IP
            }));
            io.to(sid).emit('update_users', list);
        });
    }

    // --- APPEL DISCORD-STYLE ---
    socket.on('call_start', (d) => {
        io.to(d.to).emit('incoming_call', { signal: d.signal, from: socket.id, name: users[socket.id].name, pp: users[socket.id].pp });
    });

    socket.on('call_answer', (d) => {
        io.to(d.to).emit('call_accepted', d.signal);
    });

    // --- GROUPES ---
    socket.on('create_group', (name) => {
        groups[name] = { members: [socket.id] };
        io.emit('new_group', name);
    });

    socket.on('chat_msg', (d) => io.emit('chat_msg', d));

    socket.on('disconnect', () => { delete users[socket.id]; syncUsers(); });
});

http.listen(3000, () => console.log("APEX_OMEGA_READY"));
