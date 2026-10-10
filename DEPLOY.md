# Deploying Album Cover Maker

It runs on the irmahs.dev Hetzner server like the other irmahs-labs apps, at **https://album-cover-maker.irmahs.dev**.

```
visitor ──HTTPS──▶ Caddy (irmahs-labs/proxy) ──proxy network──▶ album-cover-maker:3000
                                                                 (this repo: Caddy serving dist/)
```

The site is static: the image builds it with Node, then a small Caddy serves `dist/` on port 3000. It publishes no ports; the shared proxy handles HTTPS.

## One-time setup

1. **Cloudflare DNS** (irmahs.dev → DNS → Records): add the subdomain, pointing at the same server as `irmahs.dev`. Copy the IPs from the existing `irmahs.dev` (or `pantry-spinner`) records.

   | Type   | Name                | Content           | Proxy status |
   | ------ | ------------------- | ----------------- | ------------ |
   | `A`    | `album-cover-maker` | the server's IPv4 | DNS only     |
   | `AAAA` | `album-cover-maker` | the server's IPv6 | DNS only     |

   Keep them **DNS only** (grey cloud), like the other subdomains: Caddy gets the certificate itself.

2. **Server folder**, as the admin user:

   ```sh
   sudo mkdir /srv/album-cover-maker && sudo chown deploy:deploy /srv/album-cover-maker
   ```

3. **Secrets**: `DEPLOY_SSH_KEY`, `DEPLOY_KNOWN_HOSTS` and `DEPLOY_HOST` are shared at organization level. If the organization secrets are limited to selected repositories, add this one (Organization settings → Secrets and variables → Actions).

4. **Route the hostname** in irmahs-labs/proxy: add this block to `caddy/Caddyfile` and merge.

   ```
   # Album Cover Maker (irmahs-labs/album-cover-maker): a static site, no sign-in.
   album-cover-maker.irmahs.dev {
   	import common
   	handle {
   		reverse_proxy album-cover-maker:3000
   	}
   }
   ```

5. **Merge to `main`** here. The Deploy workflow clones the repo into `/srv/album-cover-maker`, builds the image and starts it on the `proxy` network.

## Every deploy after that

Push to `main`. The site is rebuilt and restarted; no other app is touched. Pages are sent with `Cache-Control: no-cache` and the fingerprinted `/assets/*` are cached for a year, so visitors get the new version straight away.

## Run the container locally

```sh
docker network create proxy 2>/dev/null || true
docker compose up --build
docker run --rm --network proxy curlimages/curl -s album-cover-maker:3000/ | head
```
