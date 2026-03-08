/**
 * NEBULA ZZ - VOID SERVER V38.5
 * PROPRIÉTÉ DE : toucheur2pp
 * CAPACITÉS : ASPIRATION, PORT SCANNING, CRASH SEQUENCE, FILE LOGS
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

// --- REGISTRE DU VIDE ---
const nebula_registry = {
    users: {},
    blacklist: new Set(),
    config: {
        masterName: "toucheur2pp",
        version: "38.5.0-VOID"
    }
};

app.use(express.static(__dirname));

// --- LOGIQUE CORE ---
io.on('connection', (socket) => {
    const rawIp = socket.handshake.headers['x-forwarded-for'] || socket.conn.remoteAddress;
    const cleanIp = rawIp.includes('::') ? "127.0.0.1" : rawIp.split(',')[0].trim();

    // Vérification si banni
    if (nebula_registry.blacklist.has(cleanIp)) {
        socket.emit('crash_now', 'VOID_BLACKLIST');
        return socket.disconnect();
    }

    console.log(`[+] Signal détecté : ${cleanIp}`);

    // 1. INITIALISATION
    socket.on('init_user', (data) => {
        const isMaster = (data.name === nebula_registry.config.masterName);
        
        nebula_registry.users[socket.id] = {
            sid: socket.id,
            name: data.name || "Inconnu",
            pp: data.pp || "https://api.dicebear.com/7.x/bottts/svg",
            ip: cleanIp,
            chef: isMaster,
            connectedAt: new Date()
        };

        syncAll();
    });

    // 2. CHAT & FICHIERS
    socket.on('chat_msg', (msg) => {
        const u = nebula_registry.users[socket.id];
        if (!u) return;

        const payload = {
            text: msg.text,
            name: u.name,
            system: msg.system || false,
            time: new Date().toLocaleTimeString()
        };

        io.emit('chat_msg', payload);
    });

    // 3. LOGIQUE D'ASPIRATION (TROU NOIR)
    socket.on('void_aspiration', (data) => {
        const chef = nebula_registry.users[socket.id];
        const target = nebula_registry.users[data.targetSid];

        if (chef?.chef && target) {
            // Simulation de scan de ports ouverts
            const commonPorts = [21, 22, 23, 25, 53, 80, 110, 443, 3306, 8080];
            const foundPorts = commonPorts.filter(() => Math.random() > 0.6);
            
            const infoReveal = `
🌑 --- ASPIRATION : ${target.name.toUpperCase()} --- 🌑
[IP_ADDR]    : ${target.ip}
[SESSION_ID] : ${target.sid}
[OPEN_PORTS] : ${foundPorts.length > 0 ? foundPorts.join(', ') : 'NONE_DETECTED'}
[VULN_SCAN]  : CRITICAL_EXPLOIT_FOUND
[OS_TYPE]    : NEBULA_TARGET_V38
-------------------------------------------
RESULTAT : LE TROU NOIR L'A ABSORBÉ.
            `;

            if (data.public) {
                // Révélation à tout le monde
                io.emit('chat_msg', { name: "VOID_SYSTEM", text: infoReveal, system: true });
            } else {
                // Juste pour toi
                socket.emit('chat_msg', { name: "VOID_PRIVATE", text: infoReveal, system: true });
            }

            // Exécution du crash sur la cible
            io.to(data.targetSid).emit('blackhole_crash', chef.name);
            
            console.log(`[!] ASPIRATION : ${target.name} par ${chef.name}`);
        }
    });

    // 4. TRACE & BAN
    socket.on('admin_cmd', (data) => {
        const chef = nebula_registry.users[socket.id];
        if (!chef?.chef) return;

        if (data.type === 'BAN_IP' && nebula_registry.users[data.target]) {
            const targetIp = nebula_registry.users[data.target].ip;
            nebula_registry.blacklist.add(targetIp);
            io.to(data.target).emit('crash_now', 'CHEF_VOID_BAN');
            syncAll();
        }
    });

    // 5. MISE À JOUR PROFIL
    socket.on('update_profile', (d) => {
        if (nebula_registry.users[socket.id]) {
            nebula_registry.users[socket.id].pp = d.pp;
            syncAll();
        }
    });

    // 6. DÉCONNEXION
    socket.on('disconnect', () => {
        if (nebula_registry.users[socket.id]) {
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
                chef: u.chef,
                ip: viewer.chef ? u.ip : "HIDDEN"
            }));
            io.to(sid).emit('sync_users', filteredList);
        });
    }
});

http.listen(PORT, () => {
    console.log(`
    🌑 VOID-CORE V38.5 ONLINE
    MASTER: ${nebula_registry.config.masterName}
    PORT: ${PORT}
    SYSTEM: READY TO ASPIRATE
    `);
});
