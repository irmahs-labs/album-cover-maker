# Putting Album Cover Maker on your own domain (Cloudflare)

The site is a static app. Cloudflare serves it as a Worker with static assets
(`wrangler.jsonc`), which is free on the Workers free plan. Replace
`yourdomain.com` below with your real domain.

## 1. Get the domain onto Cloudflare

**Buying a new domain?** In the Cloudflare dashboard go to
**Domain Registration → Register Domains**, search, and buy it. It's added to
your account automatically, so skip to step 2.

**Already own it somewhere else (GoDaddy, Namecheap, …)?**

1. Dashboard → **Add a domain** (top of Account Home). Enter `yourdomain.com`.
2. Pick the **Free** plan. Cloudflare scans your existing DNS records; keep
   anything you still use (email MX records especially).
3. Cloudflare shows two nameservers, like `ada.ns.cloudflare.com` and
   `bob.ns.cloudflare.com`.
4. At your registrar, replace the domain's nameservers with those two. Turn off
   DNSSEC at the registrar first if it's on.
5. Wait for the email saying the domain is **Active** (minutes to a few hours).

## 2. Deploy the site from GitHub

1. Dashboard → **Workers & Pages → Create → Import a repository**.
2. Connect GitHub and pick `irmahs-labs/album-cover-maker`.
3. Settings:
   - Project name: `album-cover-maker` (must match `name` in `wrangler.jsonc`)
   - Build command: `npm run build`
   - Deploy command: `npx wrangler deploy`
   - Production branch: `main`
4. **Save and Deploy**. You get a free `album-cover-maker.<you>.workers.dev`
   address. Open it and check the landing page and `/make`.

Every push to `main` now redeploys automatically.

## 3. Point your domain at it

1. Open the Worker → **Settings → Domains & Routes → Add → Custom domain**.
2. Enter `yourdomain.com`, then add `www.yourdomain.com` the same way.
3. Cloudflare creates the DNS records and the HTTPS certificate for you.

Prefer keeping it in code? Uncomment the `routes` block in `wrangler.jsonc`,
put your hostnames in, and push; the next deploy attaches them.

## 4. Optional: send `www` to the bare domain

Dashboard → your domain → **Rules → Redirect Rules → Create rule** →
"Redirect from WWW to root" template.

## Deploying from your own computer instead

```sh
npm install
npx wrangler login
npm run deploy
```
