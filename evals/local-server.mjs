// Minimal local server to run the Vercel API function for evals
import http from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { EnvHttpProxyAgent, setGlobalDispatcher } from 'undici';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

// Load .env.local
const envPath = join(root, '.env.local');
if (existsSync(envPath)) {
  readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const eq = line.indexOf('=');
    if (eq > 0 && !line.startsWith('#')) {
      const key = line.slice(0, eq).trim();
      if (!process.env[key]) process.env[key] = line.slice(eq + 1).trim();
    }
  });
}

// Set up proxy so fetch() to api.anthropic.com works
const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
if (proxyUrl) {
  if (!process.env.NO_PROXY) process.env.NO_PROXY = 'localhost,127.0.0.1';
  setGlobalDispatcher(new EnvHttpProxyAgent({
    httpProxy: proxyUrl,
    httpsProxy: proxyUrl,
    noProxy: process.env.NO_PROXY,
  }));
}

const { default: handler } = await import('../api/voice-chat.js');

const server = http.createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/api/voice-chat') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const parsed = JSON.parse(body);
        // Create a mock req/res that matches Vercel's API
        const mockReq = { method: 'POST', body: parsed, headers: req.headers };
        const mockRes = {
          _status: 200,
          _headers: {},
          status(code) { this._status = code; return this; },
          setHeader(k, v) { this._headers[k] = v; return this; },
          json(data) {
            res.writeHead(this._status, { 'Content-Type': 'application/json', ...this._headers });
            res.end(JSON.stringify(data));
          },
          end(data) {
            res.writeHead(this._status, this._headers);
            res.end(data);
          }
        };
        await handler(mockReq, mockRes);
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(3000, () => {
  console.log('Local eval server running on http://localhost:3000');
});
