const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ noServer: true });

// Render ya reverse proxy ke peeche asli client IP paane ke liye
app.set('trust proxy', 1);

// DoS attack bachane ke liye body size limit
app.use(express.json({ limit: '10kb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Environment variables se credentials uthana
const SECRET_PASS = process.env.SECRET_PASS || "301225";
const BOT_TOKEN = process.env.BOT_TOKEN || "8285782232:AAFwYMW1eu9cTcpLxB2V-VRdnR56fnFPwu4";
const CHAT_ID = process.env.CHAT_ID || "6304737764";

function getRandomLotteryAlert() {
  const messages = [
    "🎁 बधाई हो! आपका लकी ड्रॉ कूपन सक्रिय हो गया है। इनाम देखने के लिए नीचे दिए गए लिंक पर तुरंत क्लिक करें:",
    "⚡ बम्पर जैकपॉट अलर्ट! आज का स्पेशल लकी टिकट तैयार है। रिवॉर्ड का दावा करने के लिए लिंक पर क्लिक करें:",
    "🎉 शानदार मौका! आपके लिए फ्री लकी ऑफर अनलॉक हुआ है। नीचे दिए लिंक पर क्लिक करके टिकट चेक करें:",
    "🔥 स्पेशल ड्रॉ विनर ऑफर! अपना लॉटरी बोनस प्राप्त करने के लिए नीचे दिए गए लिंक पर जाएं:",
    "🎊 खुशखबरी! आपका स्पेशल लकी ऑफर तैयार है। पूरी जानकारी देखने के लिए नीचे दिए गए लिंक पर क्लिक करें:",
    "💥 मेगा जैकपॉट अलर्ट! आज के खास लकी ड्रॉ की जानकारी पाने के लिए नीचे दिए गए लिंक पर जाएं:",
    "🌟 शानदार ऑफर! नया लकी टिकट उपलब्ध है। टिकट और रिवॉर्ड की जानकारी के लिए लिंक खोलें:",
    "🏆 लकी ड्रॉ अपडेट! विजेताओं की सूची और ड्रॉ के नतीजे देखने के लिए नीचे दिए गए लिंक पर क्लिक करें:",
    "🎁 स्पेशल रिवॉर्ड अलर्ट! उपलब्ध ऑफर की जानकारी प्राप्त करने के लिए नीचे दिए गए लिंक पर जाएं:",
    "⚡ आज का मेगा ड्रॉ! लकी टिकट और ऑफर की पूरी जानकारी के लिए लिंक पर क्लिक करें:",
    "🎉 नया लकी ऑफर! ड्रॉ में भाग लेने के नियम जानने के लिए नीचे दिए गए लिंक को खोलें:",
    "🔥 जैकपॉट स्पेशल! आज के लकी ड्रॉ की जानकारी देखने के लिए नीचे दिए गए लिंक पर क्लिक करें:",
    "💎 रिवॉर्ड अपडेट! नए ऑफर और टिकट की जानकारी प्राप्त करने के लिए लिंक खोलें:",
    "🎯 लकी चांस अलर्ट! ड्रॉ की तारीख और भागीदारी की जानकारी के लिए नीचे दिए गए लिंक पर जाएं:",
    "🎊 फेस्टिवल लकी ऑफर! स्पेशल ड्रॉ की जानकारी पाने के लिए नीचे दिए गए लिंक पर क्लिक करें:",
    "🚀 मेगा रिवॉर्ड ऑफर! नए लकी ड्रॉ के नियम और जानकारी देखने के लिए लिंक खोलें:",
    "✨ स्पेशल टिकट अपडेट! अपने टिकट और ड्रॉ की जानकारी चेक करने के लिए नीचे दिए गए लिंक पर जाएं:",
    "🎁 बोनस ड्रॉ अलर्ट! उपलब्ध ऑफर की शर्तें जानने के लिए नीचे दिए गए लिंक पर क्लिक करें:",
    "🏅 लकी विनर अपडेट! घोषित विजेताओं की जानकारी देखने के लिए लिंक खोलें:",
    "💥 बम्पर ऑफर अलर्ट! आज के स्पेशल ड्रॉ की डिटेल्स पाने के लिए नीचे दिए गए लिंक पर जाएं:",
    "🌈 नया लकी चांस! उपलब्ध ड्रॉ और रिवॉर्ड की जानकारी देखने के लिए लिंक पर क्लिक करें:",
    "🎉 मेगा लकी ड्रॉ! टिकट और भागीदारी से जुड़ी जानकारी प्राप्त करने के लिए नीचे दिए गए लिंक को खोलें:",
    "⚡ जैकपॉट न्यूज़! नए लकी ऑफर की जानकारी पाने के लिए नीचे दिए गए लिंक पर क्लिक करें:",
    "🎁 स्पेशल बोनस अपडेट! ऑफर की पात्रता और नियम जानने के लिए लिंक खोलें:",
    "🔥 लकी टिकट अलर्ट! ड्रॉ की तारीख और टिकट की जानकारी देखने के लिए नीचे दिए गए लिंक पर जाएं:",
    "🎊 आज का खास ऑफर! लकी ड्रॉ के नियम और जानकारी प्राप्त करने के लिए लिंक पर क्लिक करें:",
    "💫 रिवॉर्ड स्पेशल! नए लकी ड्रॉ की पूरी जानकारी के लिए नीचे दिए गए लिंक को खोलें:",
    "🏆 मेगा विनर ड्रॉ! आधिकारिक नतीजे और विजेताओं की सूची देखने के लिए लिंक पर जाएं:",
    "🎯 लकी टिकट अपडेट! अपने टिकट की स्थिति जानने के लिए नीचे दिए गए लिंक पर क्लिक करें:",
    "🎉 स्पेशल जैकपॉट ऑफर! आज के ड्रॉ की जानकारी पाने के लिए लिंक खोलें:",
    "🎁 फ्री लकी ऑफर! उपलब्ध ऑफर की शर्तें और विवरण देखने के लिए नीचे दिए गए लिंक पर जाएं:",
    "⚡ नया ड्रॉ अलर्ट! लकी टिकट से जुड़ी जानकारी प्राप्त करने के लिए नीचे दिए गए लिंक पर क्लिक करें:",
    "💎 मेगा रिवॉर्ड अपडेट! नए ऑफर और ड्रॉ का विवरण देखने के लिए लिंक खोलें:",
    "🔥 स्पेशल लॉटरी अपडेट! ड्रॉ के नियम और नतीजों की जानकारी के लिए नीचे दिए गए लिंक पर जाएं:",
    "🎊 लकी ड्रॉ फेस्टिवल! आज के खास ऑफर की जानकारी प्राप्त करने के लिए लिंक पर क्लिक करें:",
    "🌟 रिवॉर्ड अलर्ट! नए लकी टिकट और ड्रॉ शेड्यूल की जानकारी यहां देखें:",
    "🚀 बम्पर ड्रॉ अपडेट! भागीदारी की शर्तें जानने के लिए नीचे दिए गए लिंक को खोलें:",
    "🎁 स्पेशल लकी टिकट! ड्रॉ और ऑफर की पूरी जानकारी पाने के लिए लिंक पर क्लिक करें:",
    "💥 जैकपॉट ऑफर लाइव! आधिकारिक ऑफर की जानकारी देखने के लिए नीचे दिए गए लिंक पर जाएं:",
    "🎉 लकी ड्रॉ न्यूज़! आज के ड्रॉ से संबंधित अपडेट पाने के लिए लिंक खोलें:",
    "🏆 विनर लिस्ट अलर्ट! घोषित परिणाम देखने के लिए नीचे दिए गए लिंक पर क्लिक करें:",
    "⚡ मेगा लकी चांस! नए ऑफर और ड्रॉ की जानकारी प्राप्त करने के लिए लिंक पर जाएं:",
    "🎊 स्पेशल रिवॉर्ड ऑफर! उपलब्ध इनाम और नियमों का विवरण देखने के लिए लिंक खोलें:",
    "✨ लकी ड्रॉ स्पेशल! टिकट और ऑफर से जुड़ी जानकारी पाने के लिए नीचे दिए गए लिंक पर क्लिक करें:",
    "🎁 बोनस टिकट अपडेट! ड्रॉ में भाग लेने की प्रक्रिया जानने के लिए लिंक खोलें:",
    "🔥 आज का जैकपॉट अलर्ट! आधिकारिक ड्रॉ की जानकारी देखने के लिए नीचे दिए गए लिंक पर जाएं:",
    "🌟 लकी ऑफर अपडेट! नए टिकट और ड्रॉ की तारीख चेक करने के लिए लिंक पर क्लिक करें:",
    "💫 मेगा ड्रॉ स्पेशल! उपलब्ध ऑफर के नियम जानने के लिए नीचे दिए गए लिंक को खोलें:",
    "🎯 रिवॉर्ड चेक अलर्ट! अपने टिकट और ड्रॉ की स्थिति देखने के लिए लिंक पर जाएं:",
    "🎉 स्पेशल लकी ड्रॉ! ऑफर, नियम और परिणाम की जानकारी प्राप्त करने के लिए नीचे दिए गए लिंक पर क्लिक करें:"
];
  const links = [
    "https://example.com/lucky-draw",
    "https://example.com/jackpot-claim",
    "https://example.com/reward-spin",
    "https://example.com/daily-prize"
  ];
  const prefixes = ["WIN", "LUCKY", "PRIZE", "DRAW", "JACKPOT"];
  const code = prefixes[Math.floor(Math.random() * prefixes.length)] + "-" + Math.floor(10000 + Math.random() * 90000);
  const msg = messages[Math.floor(Math.random() * messages.length)];
  const link = links[Math.floor(Math.random() * links.length)];

  return `${msg}\nकूपन कोड: ${code}\n👉 लिंक: ${link}`;
}

// Telegram alert bhejne ka safe POST method
async function sendTelegramAlert(clientIp) {
  if (!BOT_TOKEN || !CHAT_ID) {
    console.warn("Telegram BOT_TOKEN ya CHAT_ID set nahi hai.");
    return;
  }

  const text = getRandomLotteryAlert();
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: text
      })
    });

    const data = await res.json();
    if (!data.ok) {
      console.error("Telegram error:", data.description);
    } else {
      console.log(`Alert sent for IP: ${clientIp}`);
    }
  } catch (err) {
    console.error("Telegram alert failed:", err.message);
  }
}

// Temporary Valid Tokens Store (Valid for 60 seconds)
const validTokens = new Set();

// In-memory Rate Limiting (Brute-force attack rokne ke liye)
const loginAttempts = new Map();

app.post('/api/verify', async (req, res) => {
  const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const record = loginAttempts.get(ip) || { count: 0, resetTime: now + 60000 };

  // 1 minute ke andar 5 baar se zyada attempt hone par block
  if (now > record.resetTime) {
    record.count = 0;
    record.resetTime = now + 60000;
  }

  if (record.count >= 5) {
    return res.status(429).json({ success: false, message: "Too many attempts. Please try again later." });
  }

  const { code } = req.body;

  if (typeof code === 'string' && code.trim() === SECRET_PASS) {
    loginAttempts.delete(ip); // Success par count reset

    // Telegram notification trigger
    await sendTelegramAlert(ip);

    // Single-use cryptographically strong token
    const token = crypto.randomBytes(32).toString('hex');
    validTokens.add(token);

    // 60 second validity
    setTimeout(() => validTokens.delete(token), 60000);

    return res.json({ success: true, token });
  } else {
    record.count += 1;
    loginAttempts.set(ip, record);
    return res.status(401).json({ success: false });
  }
});

let clients = new Set();

// WebSocket Gatekeeper: Bina valid one-time token ke reject
server.on('upgrade', (request, socket, head) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);
    const token = url.searchParams.get('token');

    if (!token || !validTokens.has(token)) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    // Token consume hote hi delete taaki repeat use na ho
    validTokens.delete(token);

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } catch (err) {
    socket.destroy();
  }
});

wss.on('connection', (ws) => {
  // Max 2 active devices
  if (clients.size >= 2) {
    const oldestClient = clients.values().next().value;
    if (oldestClient) {
      oldestClient.terminate();
      clients.delete(oldestClient);
    }
  }

  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  clients.add(ws);

  if (clients.size === 2) {
    for (let client of clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type: 'presence-ready' }));
      }
    }
  }

  ws.on('message', (rawMessage) => {
    try {
      const parsed = JSON.parse(rawMessage);

      // End All: no chat message is sent. Close every active chat socket with a
      // dedicated close code so clients can return to the game page automatically.
      if (parsed.type === 'force-logout-all') {
        const activeClients = [...clients];
        clients.clear();
        for (const client of activeClients) {
          if (client.readyState === WebSocket.OPEN || client.readyState === WebSocket.CONNECTING) {
            try { client.close(4001, 'end-all'); } catch (_) { client.terminate(); }
          }
        }
        return;
      }
    } catch (_) {}

    // Relay messages to partner
    for (let client of clients) {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(rawMessage.toString());
      }
    }
  });

  const handleDisconnect = () => {
    clients.delete(ws);
    for (let client of clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type: 'presence-left' }));
      }
    }
  };

  ws.on('close', handleDisconnect);
  ws.on('error', handleDisconnect);
});

// Heartbeat interval: Inactive connections terminate karna
const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      clients.delete(ws);
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });
}, 10000);

wss.on('close', () => clearInterval(interval));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running securely on port ${PORT}`));
