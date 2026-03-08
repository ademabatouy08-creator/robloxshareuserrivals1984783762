const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static(__dirname));

const users = {}; 
const rooms = { "Général": { creator: "System", premium: false } };
const MASTER_NAME = "toucheur2pp"; // Ton trône

io.on('connection', (socket) => {
    const ip = (socket.handshake.headers['x-forwarded-for'] || socket.conn.remoteAddress || "0.0.0.0").split(',')[0].trim();

    socket.on('init_user', (data) => {
        const isMaster = (data.name === MASTER_NAME);
        users[socket.id] = { 
            ...data, 
            ip, 
            sid: socket.id, 
            isPremium: isMaster, // Toi tu l'es d'office
            isMaster: isMaster,
            currentRoom: "Général"
        };
        sync();
    });

    // --- POUVOIR DE TOUCHEUR2PP ---
    socket.on('make_premium', (targetSid) => {
        if (users[socket.id]?.isMaster && users[targetSid]) {
            users[targetSid].isPremium = true;
            io.to(targetSid).emit('UPGRADED');
            sync();
        }
    });

    // --- GESTION DES SALONS (PREMIUM ONLY) ---
    socket.on('create_room', (roomName) => {
        if (users[socket.id]?.isPremium) {
            rooms[roomName] = { creator: users[socket.id].name, premium: true };
            io.emit('sync_rooms', rooms);
        }
    });
    // État global du serveur
let currentNebulaBG = "https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHJpZzR4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1n/l0HlMG1W8f2U08I5G/giphy.gif";
io.on('connection', (socket) => {
    // Envoyer le fond actuel à la connexion
    socket.emit('change_bg', currentNebulaBG);

    // Commande exclusive au Chef
    socket.on('update_global_bg', (newUrl) => {
        if (users[socket.id]?.name === "toucheur2pp") {
            currentNebulaBG = newUrl;
            io.emit('change_bg', newUrl); // Change le fond pour TOUT LE MONDE instantanément
        }
    });
    
    // --- ATTAQUE BOMB ---
    socket.on('bomb_target', (targetSid) => {
        if (users[socket.id]?.isPremium && !users[targetSid]?.isPremium) {
            io.to(targetSid).emit('BOMBED', users[socket.id].name);
        }
    });

    function sync() {
        Object.keys(users).forEach(sid => {
            const req = users[sid];
            const list = Object.values(users).map(u => ({
                name: u.name, pp: u.pp, sid: u.sid, 
                isPremium: u.isPremium, isMaster: u.isMaster,
                ip: (req.isPremium) ? u.ip : "SÉCURISÉ"
            }));
            io.to(sid).emit('sync_users', list);
        });
        io.to(socket.id).emit('sync_rooms', rooms);
    }

    // --- VOIP & CHAT ---
    socket.on('chat_msg', (d) => io.emit('chat_msg', d));
    socket.on('call_req', (d) => io.to(d.to).emit('call_req', { ...d, from: socket.id, name: users[socket.id].name }));
    socket.on('call_res', (d) => io.to(d.to).emit('call_res', d.signal));
    
    socket.on('disconnect', () => { delete users[socket.id]; sync(); });
});

http.listen(3000, () => console.log("NEBULA_ZZ_ULTIMATE_READY"));


