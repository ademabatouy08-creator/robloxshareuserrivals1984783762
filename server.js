const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

let db;

(async () => {
    db = await open({ filename: './securite.db', driver: sqlite3.Database });
    await db.exec("CREATE TABLE IF NOT EXISTS blacklist (ip TEXT PRIMARY KEY)");
    await db.exec("CREATE TABLE IF NOT EXISTS banned_devices (device_id TEXT PRIMARY KEY)");
    console.log(">>> BASE DE DONNÉES PRÊTE");
})();

app.get('/', (req, res) => { res.sendFile(__dirname + '/index.html'); });

io.on('connection', async (socket) => {
    const userIP = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address.split(':').pop();

    socket.on('check_device', async (data) => {
        socket.deviceId = data.id;

        // Récupération de l'Opérateur (ISP)
        let operator = "Recherche...";
        try {
            const res = await fetch(`http://ip-api.com/json/${userIP}`);
            const geo = await res.json();
            operator = geo.isp || "Inconnu";
        } catch (e) { operator = "Erreur API"; }

        // AFFICHAGE DU RAPPORT COMPLET DANS TES LOGS RENDER
        console.log("\x1b[35m%s\x1b[0m", "╔═══════════════ RAPPORT D'INTERCEPTION ═══════════════╗");
        console.log("\x1b[36m%s\x1b[0m", "  🌐 ADRESSE IP    : " + userIP);
        console.log("\x1b[36m%s\x1b[0m", "  📡 OPÉRATEUR     : " + operator);
        console.log("\x1b[33m%s\x1b[0m", "  🆔 SIGNATURE UID : " + data.id);
        console.log("\x1b[32m%s\x1b[0m", "  🔋 BATTERIE      : " + data.battery + " (" + data.charging + ")");
        console.log("\x1b[34m%s\x1b[0m", "  ⚙️  PROCESSEUR    : " + data.cores + " Coeurs");
        console.log("\x1b[34m%s\x1b[0m", "  📟 RAM ESTIMÉE   : " + data.ram + " GB");
        console.log("\x1b[34m%s\x1b[0m", "  🎮 CARTE GRAPHIQUE: " + data.gpu);
        console.log("\x1b[37m%s\x1b[0m", "  🖥️  RÉSOLUTION   : " + data.screen);
        console.log("\x1b[37m%s\x1b[0m", "  🌍 ZONE / UTC    : " + data.timezone + " (UTC" + (data.vpn_check >= 0 ? "+" : "") + data.vpn_check + ")");
        console.log("\x1b[35m%s\x1b[0m", "╚══════════════════════════════════════════════════════╝");

        const isBannedIP = await db.get("SELECT ip FROM blacklist WHERE ip = ?", [userIP]);
        const isBannedDevice = await db.get("SELECT device_id FROM banned_devices WHERE device_id = ?", [data.id]);

        if (isBannedIP || isBannedDevice) {
            socket.emit('erreur_critique', "ACCÈS RÉSEAU RÉVOQUÉ.");
            socket.disconnect();
        }
    });

    socket.on('chat message', (msg) => {
        io.emit('chat message', { text: msg, authorIP: userIP });
    });
});

http.listen(process.env.PORT || 3000, () => { 
    console.log("🚀 SPECTRE ONLINE - SURVEILLANCE ACTIVE"); 
});
