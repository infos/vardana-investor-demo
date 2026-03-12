// Wrapper that enables HTTP proxy for Node's built-in fetch before running evals
// Uses EnvHttpProxyAgent which respects NO_PROXY to avoid proxying localhost requests
import { EnvHttpProxyAgent, setGlobalDispatcher } from 'undici';

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

// Now import and run the actual eval runner
import './run-evals.js';
