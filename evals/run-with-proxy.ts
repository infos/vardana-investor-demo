// Wrapper that loads .env.local and enables HTTP proxy for Node's built-in fetch
// Uses EnvHttpProxyAgent which respects NO_PROXY to avoid proxying localhost requests
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { EnvHttpProxyAgent, setGlobalDispatcher } from 'undici';

// Load .env.local from project root
const envPath = join(process.cwd(), '.env.local');
if (existsSync(envPath)) {
  readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const eq = line.indexOf('=');
    if (eq > 0 && !line.startsWith('#')) {
      const key = line.slice(0, eq).trim();
      if (!process.env[key]) {
        process.env[key] = line.slice(eq + 1).trim();
      }
    }
  });
}

const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
if (proxyUrl) {
  // Ensure localhost requests bypass the proxy
  if (!process.env.NO_PROXY) {
    process.env.NO_PROXY = 'localhost,127.0.0.1';
  }
  setGlobalDispatcher(new EnvHttpProxyAgent({
    httpProxy: proxyUrl,
    httpsProxy: proxyUrl,
    noProxy: process.env.NO_PROXY,
  }));
}

// Now dynamically import the eval runner (must be dynamic, not static,
// so env vars and proxy are set before the runner module executes)
import('./run-evals.js');
