const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

// ─── DEIN API KEY ───────────────────────────────
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || 'DEIN-API-KEY-HIER';
// ────────────────────────────────────────────────

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Serve the chatbot HTML
  if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
    const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }

  // API proxy endpoint with streaming
  if (req.method === 'POST' && req.url === '/api/chat') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { messages, system } = JSON.parse(body);

        const payload = JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 350,
          system,
          messages,
          stream: true
        });

        const options = {
          hostname: 'api.anthropic.com',
          path: '/v1/messages',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
            'Content-Length': Buffer.byteLength(payload)
          }
        };

        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        });

        const apiReq = https.request(options, apiRes => {
          apiRes.on('data', chunk => res.write(chunk));
          apiRes.on('end', () => res.end());
        });

        apiReq.on('error', err => {
          console.error('API error:', err);
          res.end();
        });

        apiReq.write(payload);
        apiReq.end();

      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`\n✅ Social Queens Club Chatbot läuft!`);
  console.log(`👉 Öffne im Browser: http://localhost:${PORT}\n`);
});
