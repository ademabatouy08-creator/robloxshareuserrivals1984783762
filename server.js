/**
 * NEBULA ZZ - SUPREME SERVER CORE V35.5
 * PROPRIÉTÉ EXCLUSIVE DE : toucheur2pp
 * CAPACITÉS : IP TRACING, SYSTEM BOMB, GLOBAL BG SYNC, SECRET LOGS, PROFILE EDIT
 */

const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: { origin: "*" },
    pingInterval: 10000,
    pingTimeout: 5000
});

const PORT = process.env.PORT || 3000;

// --- BASE DE DONNÉES EN MÉMOIRE ---
const nebula_registry = {
    users: {},      // Stocke les profils, IP, et grades
    rooms: {
        "CENTRAL": { id: "CENTRAL", creator: "SYSTEM", permanent: true },
        "VIP-LOUNGE": { id: "VIP-LOUNGE", creator: "toucheur2pp", premiumOnly: true }
    },
    config: {
        globalBG: "https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHJpZzR4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1n/l0HlMG1W8f2U08I5G/giphy.gif",
        masterName: "toucheur2pp",
        version: "35.5.0-ULTRA"
    },
    logs: [] // Stockage des messages pour le Chef
};

app.use(express.static(__dirname));

// --- LOGIQUE SOCKET INTERSTELLAIRE ---
io.on('connection', (socket) => {
    // Extraction de l'IP réelle
    const rawIp = socket.handshake.headers['x-forwarded-for'] || socket.conn.remoteAddress;
    const cleanIp = rawIp.includes('::') ? "127.0.0.1" : rawIp.split(',')[0].trim();

    console.log(`[+] Nouvelle connexion : ${socket.id} @ ${cleanIp}`);

    // 1. INITIALISATION DE L'UTILISATEUR
    socket.on('init_user', (data) => {
        const isMaster = (data.name === nebula_registry.config.masterName);
        
        nebula_registry.users[socket.id] = {
            sid: socket.id,
            name: data.name || "Inconnu",
            pp: data.pp || "https://api.dicebear.com/7.x/bottts/svg",
            ip: cleanIp,
            premium: isMaster ? true : (data.premium || false),
            chef: isMaster,
            connectedAt: new Date()
        };

        if (isMaster) socket.emit('secret_logs_sync', nebula_registry.logs);

        socket.emit('update_bg', nebula_registry.config.globalBG);
        syncAll();
    });

    // 2. CHANGER LA PHOTO DE PROFIL (NOUVEAU)
    socket.on('update_profile', (data) => {
        if (nebula_registry.users[socket.id]) {
            nebula_registry.users[socket.id].pp = data.pp;
            console.log(`[!] Profil mis à jour : ${nebula_registry.users[socket.id].name}`);
            syncAll(); // Synchronisation immédiate de la nouvelle image pour tous
        }
    });

    // 3. SYSTÈME DE CHAT & LOGS DIVINS
    socket.on('chat_msg', (msg) => {
        const sender = nebula_registry.users[socket.id];
        if (!sender) return;

        const payload = {
            text: msg.text,
            name: sender.name,
            premium: sender.premium,
            chef: sender.chef,
            time: new Date().toLocaleTimeString()
        };

        nebula_registry.logs.push({ ...payload, ip: sender.ip });
        if (nebula_registry.logs.length > 500) nebula_registry.logs.shift();

        io.emit('chat_msg', payload);

        const masterSid = Object.keys(nebula_registry.users).find(id => nebula_registry.users[id].chef);
        if (masterSid) io.to(masterSid).emit('secret_logs_update', payload);
    });

    // 4. POUVOIR DE TOUCHEUR2PP : CHANGER LE FOND MONDIAL
    socket.on('master_bg_change', (newUrl) => {
        if (nebula_registry.users[socket.id]?.chef) {
            nebula_registry.config.globalBG = newUrl;
            io.emit('update_bg', newUrl);
            console.log(`[!] Fond global changé par le Chef : ${newUrl}`);
        }
    });

    // 5. POUVOIR DE PROMOTION
    socket.on('admin_promote', (targetSid) => {
        if (nebula_registry.users[socket.id]?.chef && nebula_registry.users[targetSid]) {
            nebula_registry.users[targetSid].premium = true;
            io.to(targetSid).emit('rank_up');
            syncAll();
        }
    });

    // 6. NEBULA BOMB
    socket.on('nebula_bomb', (targetSid) => {
        const attacker = nebula_registry.users[socket.id];
        const target = nebula_registry.users[targetSid];

        if (attacker?.premium && target) {
            if (target.chef) return socket.emit('chat_msg', { name: "SYSTÈME", text: "⚠️ ERREUR : Le Créateur est immunisé." });
            
            console.log(`[!] ATTENTION : ${attacker.name} a bomb ${target.name}`);
            io.to(targetSid).emit('crash_now', attacker.name);
        }
    });

    // 7. GESTION DES SALONS VOCAUX
    socket.on('create_room', (roomName) => {
        if (nebula_registry.users[socket.id]?.premium) {
            const roomId = roomName.toUpperCase().replace(/\s+/g, '-');
            nebula_registry.rooms[roomId] = {
                id: roomId,
                creator: nebula_registry.users[socket.id].name,
                premiumOnly: true
            };
            io.emit('sync_rooms', Object.values(nebula_registry.rooms));
        }
    });

    // 8. DÉCONNEXION
    socket.on('disconnect', () => {
        if (nebula_registry.users[socket.id]) {
            console.log(`[-] Départ : ${nebula_registry.users[socket.id].name}`);
            delete nebula_registry.users[socket.id];
            syncAll();
        }
    });

    function syncAll() {
        const userList = Object.values(nebula_registry.users);
        Object.keys(nebula_registry.users).forEach(sid => {
            const viewer = nebula_registry.users[sid];
            const filteredList = userList.map(u => ({
                sid: u.sid,
                name: u.name,
                pp: u.pp,
                premium: u.premium,
                chef: u.chef,
                ip: viewer.premium ? u.ip : "SÉCURISÉ"
            }));
            io.to(sid).emit('sync_users', filteredList);
        });
        io.emit('sync_rooms', Object.values(nebula_registry.rooms));
    }
});

http.listen(PORT, () => {
    console.log(`
    ____________________________________________________
       NEBULA ZZ PREMIUM SERVER - ONLINE
       Version: ${nebula_registry.config.version}
       Master: ${nebula_registry.config.masterName}
       Port: ${PORT}
    ____________________________________________________
    `);
});
