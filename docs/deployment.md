# Deployment Configuration

## Repos

| App | GitHub Repo | Branch |
|-----|------------|--------|
| Public site | `github.com/infos/vardana-website` | `master` |
| Investor demo | `github.com/infos/vardana-investor-demo` | `master` |

## Vercel Projects

| Vercel Project | Production URL | Custom Domain |
|---------------|---------------|---------------|
| `vardana-website` | `vardana-website-murex.vercel.app` | `vardana.ai`, `www.vardana.ai` |
| `vardana-investor-demo` | `vardana-investor-demo.vercel.app` | — |

## DNS (vardana.ai)

- Registrar: third-party, DNS managed via **Cloudflare**
- Cloudflare nameservers: `jaime.ns.cloudflare.com`, `lilyana.ns.cloudflare.com`
- A record points to Vercel IP `76.76.21.21`
- Vercel shows nameserver mismatch warning but domain works fine via Cloudflare proxy
- HTTPS works, HTTP/2 enabled

## Deploy Commands

```bash
# Public site
cd vardana-website
git push origin master          # May auto-deploy via Vercel GitHub integration
npx vercel --prod               # Manual deploy fallback

# Investor demo
cd vardana-investor-demo
git push origin master
npx vercel --prod               # Manual deploy fallback
```

## Vercel Account

- Scope: `atmashetty-5185s-projects`
- Other projects (older/unused): `vardana`, `vardana-demo`
