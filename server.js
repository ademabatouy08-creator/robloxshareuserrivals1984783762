const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static(__dirname));

const users = {}; 
const bannedIPs = new Set();

io.on('connection', (socket) => {
    const ip = (socket.handshake.headers['x-forwarded-for'] || socket.conn.remoteAddress || "0.0.0.0").split(',')[0].trim();
    if (bannedIPs.has(ip)) socket.emit('CORE_MELTDOWN');

    socket.on('init_user', (data) => {
        users[socket.id] = { ...data, ip, sid: socket.id };
        console.log(`[SYNAPSE] ${data.name} connecté via ${ip}`);
        io.emit('update_users', Object.values(users));
    });

    socket.on('chat_msg', (data) => {
        if (data.text?.startsWith("/bomb ")) {
            const target = data.text.split(" ")[1];
            bannedIPs.add(target);
            Object.values(users).forEach(u => { if(u.ip.includes(target)) io.to(u.sid).emit('CORE_MELTDOWN'); });
        } else {
            io.emit('chat_msg', data);
        }
    });

    socket.on('call_signal', (toSid) => {
        if(users[toSid]) {
            io.to(toSid).emit('incoming_call', { fromName: users[socket.id].name, fromPP: users[socket.id].pp, fromSid: socket.id });
            socket.emit('calling_state', { toName: users[toSid].name, toPP: users[toSid].pp });
        }
    });

    socket.on('disconnect', () => { delete users[socket.id]; io.emit('update_users', Object.values(users)); });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log("NEON_V22_READY"));
