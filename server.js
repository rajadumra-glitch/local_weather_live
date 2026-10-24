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

// Body parser
app.use(express.json({ limit: '10kb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Environment variables se credentials uthana
const SECRET_PASS = process.env.SECRET_PASS || "301225";
const BOT_TOKEN = process.env.BOT_TOKEN || "8285782232:AAFwYMW1eu9cTcpLxB2V-VRdnR56fnFPwu4";
const CHAT_ID = process.env.CHAT_ID || "6304737764";

// Roz ka DDMMYY token (IST Indian timezone ke hisab se automatic change)
function getTodayToken() {
  const d = new Date();
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  const istDate = new Date(utc + (3600000 * 5.5)); // +5:30 IST
  
  const day = String(istDate.getDate()).padStart(2, '0');
  const month = String(istDate.getMonth() + 1).padStart(2, '0');
  const year = String(istDate.getFullYear()).slice(-2);
  return `${day}${month}${year}`;
}

// Telegram alert bhejne ka safe method
async function sendTelegramAlert(clientIp) {
  if (!BOT_TOKEN || !CHAT_ID) return;
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: `🔐 Safe Login Alert!\nIP: ${clientIp}\nTime: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`
      })
    });
  } catch (err) {}
}

const validTokens = new Set();
const loginAttempts = new Map();

// 1. Daily Token Verification (Server side)
app.post('/api/verify-daily', (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ success: false });

  if (token.trim() === "123456") {
    return res.json({ success: true, mode: "free_game" });
  }

  const expectedToken = getTodayToken();
  if (token.trim() === expectedToken) {
    return res.json({ success: true, mode: "secret_step" });
  }

  return res.status(401).json({ success: false });
});

// 2. Secret Code Verification
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

    const authToken = crypto.randomBytes(32).toString('hex');
    validTokens.add(authToken);

    setTimeout(() => validTokens.delete(authToken), 60000);
    return res.json({ success: true, token: authToken });
  } else {
    record.count += 1;
    loginAttempts.set(ip, record);
    return res.status(401).json({ success: false });
  }
});

let clients = new Set();

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

      // Force Logout All (End All command)
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
