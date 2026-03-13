// Local API server for testing — serves all /api/* routes
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

// Set up proxy so fetch() to external APIs works
const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
if (proxyUrl) {
  if (!process.env.NO_PROXY) process.env.NO_PROXY = 'localhost,127.0.0.1';
  setGlobalDispatcher(new EnvHttpProxyAgent({
    httpProxy: proxyUrl,
    httpsProxy: proxyUrl,
    noProxy: process.env.NO_PROXY,
  }));
}

// Import API handlers
const handlers = {};
async function loadHandler(name) {
  try {
    const mod = await import(`../api/${name}.js`);
    handlers[name] = mod.default;
  } catch (e) {
    console.warn(`Could not load /api/${name}:`, e.message);
  }
}

await Promise.all([
  loadHandler('voice-chat'),
  loadHandler('elevenlabs-tts'),
  loadHandler('medplum-fhir'),
  loadHandler('epic-fhir'),
]);

function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(body)); } catch { resolve({}); }
    });
  });
}

const server = http.createServer(async (req, res) => {
  const match = req.url?.match(/^\/api\/([^?]+)/);
  if (!match) {
    res.writeHead(404);
    return res.end('Not found');
  }

  const handlerName = match[1];
  const handler = handlers[handlerName];
  if (!handler) {
    res.writeHead(404);
    return res.end(`No handler for /api/${handlerName}`);
  }

  const body = await parseBody(req);
  const mockReq = { method: req.method, body, headers: req.headers };
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
    },
    // Support streaming responses (for TTS which returns audio blobs)
    write(chunk) { res.write(chunk); },
    setStatusCode(code) { this._status = code; },
  };

  try {
    await handler(mockReq, mockRes);
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  }
});

const PORT = process.env.API_PORT || 3002;
server.listen(PORT, () => {
  console.log(`Local API server running on http://localhost:${PORT}`);
});
