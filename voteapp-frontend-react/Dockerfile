# syntax=docker/dockerfile:1.7
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund
COPY . .
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.27-alpine
COPY <<'EOF' /etc/nginx/conf.d/default.conf
server {
    listen 8080;
    root /usr/share/nginx/html;
    gzip on;
    gzip_types text/css application/javascript;

    location /assets/ {
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
    location = /env-config.js {
        add_header Cache-Control "no-store";
    }
    location / {
        add_header Cache-Control "no-cache";
        try_files $uri /index.html;
    }
}
EOF
COPY --from=build --chown=101:101 /app/dist /usr/share/nginx/html
EXPOSE 8080
