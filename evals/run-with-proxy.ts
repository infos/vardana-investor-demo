// Wrapper that enables HTTP proxy for Node's built-in fetch before running evals
import { ProxyAgent, setGlobalDispatcher } from 'undici';

const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
if (proxyUrl) {
  setGlobalDispatcher(new ProxyAgent({
    uri: proxyUrl,
    requestTls: { rejectUnauthorized: false },
  }));
}

// Now import and run the actual eval runner
import './run-evals.js';
