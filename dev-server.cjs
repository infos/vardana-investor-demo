const http = require('http');
const fs = require('fs');
const path = require('path');

// Load .env.local
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const eq = line.indexOf('=');
    if (eq > 0 && !line.startsWith('#')) {
      process.env[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
    }
  });
}

// Enable proxy support for Node's built-in fetch
if (process.env.HTTPS_PROXY || process.env.HTTP_PROXY) {
  const { ProxyAgent, setGlobalDispatcher } = require('undici');
  setGlobalDispatcher(new ProxyAgent(process.env.HTTPS_PROXY || process.env.HTTP_PROXY));
}

(async () => {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({ server: { middlewareMode: true } });

  // Shim Vercel's res.status().json()/end() onto raw Node response
  function shimRes(res) {
    res.status = (code) => { res.statusCode = code; return res; };
    const origEnd = res.end.bind(res);
    res.json = (data) => {
      res.setHeader('Content-Type', 'application/json');
      origEnd(JSON.stringify(data));
    };
    return res;
  }

  const server = http.createServer(async (req, res) => {
    if (req.url && req.url.startsWith('/api/voice-chat') && req.method === 'POST') {
      let body = '';
      req.on('data', c => body += c);
      req.on('end', async () => {
        try {
          req.body = JSON.parse(body);
          const mod = await vite.ssrLoadModule('/api/voice-chat.js');
          await mod.default(req, shimRes(res));
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: e.message }));
        }
      });
    } else {
      vite.middlewares(req, res);
    }
  });

  server.listen(3000, () => console.log('Dev+API server on http://localhost:3000'));
})();
