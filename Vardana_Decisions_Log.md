# Vardana Decisions Log

Architecture, infrastructure, and product-scope decisions worth preserving across sessions. Append new entries at the top. Each entry is a date, one-line headline, and a paragraph of context. Reversible decisions still get logged so we know what was rolled back and why.

## 2026-04-29 — Re-enabled Bedrock as primary on investor demo

Original Apr 22 decision restored after [reason TBD — Atma to fill in from Vercel env var history]. Production now routes `/api/voice-chat` through AWS Bedrock (`us.anthropic.claude-sonnet-4-6`, `us-east-1`); the direct Anthropic API path is retained as a fallback toggle (`USE_BEDROCK=false`).

Same-day work:
- Rotated AWS IAM access key for the Vercel-attached user. Old key (`AKIAXV4RWIWEHABY5NS4`) deactivated in IAM after new key verified working in production. Old key is in deactivated state for ~24h before deletion.
- Added `console.warn('[BEDROCK-FALLBACK] …')` at the top of the direct-Anthropic branch in `api/voice-chat.js` so any silent fallback to Anthropic surfaces in Vercel function logs. No PHI logged — only env state and timestamp.
- Direct Anthropic fallback retained per Apr 22 dual-path design. Decision to remove the fallback is gated on two weeks of clean Bedrock production traffic.

Out of scope today:
- The `vardana-voice` EC2 repo (separate decision, gated on Anthropic BAA submission).
- Removal of the direct Anthropic fallback path.
