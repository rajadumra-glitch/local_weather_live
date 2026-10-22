const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Secret Passcode & Bot Credentials (Server me safe)
const SECRET_PASS = "301225";
const BOT_TOKEN = "8285782232:AAH9s0SKOxi1LDFYtK2jO-4Y3AQ4fD6Vm80";
const CHAT_ID = "6304737764";

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

// Passcode verify route
app.post('/api/verify', async (req, res) => {
  const { code } = req.body;
  if (code === SECRET_PASS) {
    // Sahi password aate hi lottery alert bhejo
    sendTelegramAlert();
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false });
  }
});

// Private WebRTC & Chat Signaling (Zero Logs)
let clients = new Set();
wss.on('connection', (ws) => {
  if (clients.size >= 2) {
    ws.close();
    return;
  }
  clients.add(ws);

  // Jab dono connect ho jayein
  if (clients.size === 2) {
    for (let client of clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type: 'presence-ready' }));
      }
    }
  }

  ws.on('message', (message) => {
    // Message/Call stream dusre partner ko forward karna
    for (let client of clients) {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(message.toString());
      }
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    for (let client of clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type: 'presence-left' }));
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server started on port ${PORT}`));