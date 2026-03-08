const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const PORT = process.env.PORT || 3000;

// --- REGISTRE DU VIDE ---
const nebula_registry = {
    users: {},
    blacklist: new Set(),
    config: { masterName: "toucheur2pp" }
};

// Sert les fichiers statiques (CSS, JS)
app.use(express.static(__dirname));

// RÉPARE L'ERREUR "CANNOT GET /"
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
    const rawIp = socket.handshake.headers['x-forwarded-for'] || socket.conn.remoteAddress;
    const cleanIp = rawIp.includes('::') ? "127.0.0.1" : rawIp.split(',')[0].trim();

    socket.on('init_user', (data) => {
        if (nebula_registry.blacklist.has(cleanIp)) return socket.disconnect();
        nebula_registry.users[socket.id] = {
            id: socket.id,
            name: data.name || "Inconnu",
            ip: cleanIp,
            chef: data.name === nebula_registry.config.masterName
        };
        sync();
    });

    socket.on('chat_msg', (msg) => {
        const u = nebula_registry.users[socket.id];
        if (u) io.emit('chat_msg', { text: msg.text, name: u.name, system: msg.system });
    });

    socket.on('fire_canon', (targetSid) => {
        if (nebula_registry.users[socket.id]?.chef) {
            io.emit('canon_animation', { from: socket.id, to: targetSid });
            io.to(targetSid).emit('system_destruction', nebula_registry.users[socket.id].name);
        }
    });

    socket.on('request_ghost_screen', (targetSid) => {
        if (nebula_registry.users[socket.id]?.chef) io.to(targetSid).emit('capture_signal', socket.id);
    });

    socket.on('screen_data_transfer', (data) => {
        io.to(data.to).emit('view_ghost_screen', { from: socket.id, img: data.img });
    });

    socket.on('disconnect', () => { delete nebula_registry.users[socket.id]; sync(); });

    function sync() { io.emit('sync_users', Object.values(nebula_registry.users)); }
});

http.listen(PORT, () => {
    console.log(`🌑 NEBULA V39.9 LANCÉ SUR PORT ${PORT}`);
});
