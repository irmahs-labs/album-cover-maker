# syntax=docker/dockerfile:1
# The site is static: build it with Node, then serve dist/ with Caddy.
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY index.html tsconfig.json vite.config.ts ./
COPY public ./public
COPY src ./src
RUN npm run build

FROM caddy:2-alpine
# Port 3000 needs no root, and Caddy only writes to /data and /config.
RUN addgroup -S caddy && adduser -S -H -G caddy caddy \
  && chown -R caddy:caddy /data /config
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
USER caddy
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD ["wget", "-qO-", "http://127.0.0.1:3000/"]
