const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const SECRET_PASS = process.env.SECRET_PASS || "301225";
const BOT_TOKEN = process.env.BOT_TOKEN || "8285782232:AAH9s0SKOxi1LDFYtK2jO-4Y3AQ4fD6Vm80";
const CHAT_ID = process.env.CHAT_ID || "6304737764";

function getRandomLotteryAlert() {
  const messages = [
    "🎁 बधाई हो! आपका लकी ड्रॉ कूपन सक्रिय हो गया है। इनाम देखने के लिए नीचे दिए गए लिंक पर तुरंत क्लिक करें:",
    "⚡ बम्पर जैकपॉट अलर्ट! आज का स्पेशल लकी टिकट तैयार है। रिवॉर्ड का दावा करने के लिए लिंक पर क्लिक करें:",
    "🎉 शानदार मौका! आपके लिए फ्री लकी ऑफर अनलॉक हुआ है। नीचे दिए लिंक पर क्लिक करके टिकट चेक करें:",
    "🔥 स्पेशल ड्रॉ विनर ऑफर! अपना लॉटरी बोनस प्राप्त करने के लिए नीचे दिए गए लिंक पर जाएं:"
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

async function sendTelegramAlert() {
  const text = encodeURIComponent(getRandomLotteryAlert());
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage?chat_id=${CHAT_ID}&text=${text}`;
  try {
    const fetch = (await import('node-fetch')).default;
    await fetch(url);
  } catch (_) {}
}

app.post('/api/verify', async (req, res) => {
  const { code } = req.body;
  if (code === SECRET_PASS) {
    sendTelegramAlert();
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false });
  }
});

let clients = new Set();

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

      if (parsed.type === 'force-logout-all') {
        for (let client of clients) {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'force-logout' }));
            client.close();
          }
        }
        clients.clear();
        return;
      }
    } catch (_) {}

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
server.listen(PORT, () => console.log(`Server started on port ${PORT}`));
