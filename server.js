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

// Roz ka DDMMYY token (IST Indian timezone ke anusar apne aap change)
function getTodayToken() {
  const d = new Date();
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  const istDate = new Date(utc + (3600000 * 5.5));
  const day = String(istDate.getDate()).padStart(2, '0');
  const month = String(istDate.getMonth() + 1).padStart(2, '0');
  const year = String(istDate.getFullYear()).slice(-2);
  return `${day}${month}${year}`;
}

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
    "⚡ आज का मेगा ड्रॉ! लकी टिकट और ऑफर की पूरी जानकारी के लिए लिंक पर क्लिक करें:"
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

// Daily Token Verify API (DDMMYY check)
app.post('/api/verify-daily', (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ success: false });

  if (token.trim() === "123456") {
    return res.json({ success: true, mode: "free_game" });
  }

  if (token.trim() === getTodayToken()) {
    return res.json({ success: true, mode: "secret_step" });
  }

  return res.status(401).json({ success: false });
});

// Gupt Password Verify API
app.post('/api/verify', async (req, res) => {
  const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const record = loginAttempts.get(ip) || { count: 0, resetTime: now + 60000 };

  if (now > record.resetTime) {
    record.count = 0;
    record.resetTime = now + 60000;
  }

  if (record.count >= 5) {
    return res.status(429).json({ success: false, message: "Too many attempts. Please try again later." });
  }

  const { code } = req.body;

  if (typeof code === 'string' && code.trim() === SECRET_PASS) {
    loginAttempts.delete(ip);
    await sendTelegramAlert(ip);

    const token = crypto.randomBytes(32).toString('hex');
    validTokens.add(token);

    setTimeout(() => validTokens.delete(token), 60000);

    return res.json({ success: true, token });
  } else {
    record.count += 1;
    loginAttempts.set(ip, record);
    return res.status(401).json({ success: false });
  }
});

let clients = new Set();

// WebSocket Gatekeeper
server.on('upgrade', (request, socket, head) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);
    const token = url.searchParams.get('token');

    if (!token || !validTokens.has(token)) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    validTokens.delete(token);

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } catch (err) {
    socket.destroy();
  }
});

wss.on('connection', (ws) => {
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

      // End All: sabhi active clients ko close code 4001 bhejkar connection terminate karein
      if (parsed.type === 'force-logout-all') {
        const activeClients = [...clients];
        clients.clear();
        for (const client of activeClients) {
          try {
            client.send(JSON.stringify({ type: 'end-all-now' }));
            client.close(4001, 'end-all');
          } catch (_) {
            client.terminate();
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

// Heartbeat interval
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
