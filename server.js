const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static(__dirname));

io.on('connection', (socket) => {
    // Quand le client envoie son rapport de scan
    socket.on('check_device', (info) => {
        console.log(`
        ╔════════ TRANSMISSION REÇUE ════════╗
        ║ NOM    : ${info.name}
        ║ VILLE  : ${info.city} (${info.country})
        ║ IP     : ${info.ip}
        ║ RÉSEAU : ${info.isp}
        ║ MATOS  : ${info.ram}GB RAM | ${info.cores} Cores
        ╚════════════════════════════════════╝
        `);
    });

    socket.on('chat message', (data) => {
        io.emit('chat message', data);
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`🚀 SERVEUR GALAXY ACTIF SUR LE PORT ${PORT}`);
});
