# Stage 1: Build React app with Vite
FROM node:18-alpine AS builder

WORKDIR /app

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --prefer-offline --no-audit

COPY frontend/ ./
RUN npm run build

# Stage 2: Serve with nginx - reverse proxy to backend
FROM nginx:alpine

# Remove default nginx config to avoid conflicts
RUN rm -f /etc/nginx/conf.d/default.conf

# Copy nginx configuration
COPY frontend/nginx.conf /etc/nginx/nginx.conf
COPY frontend/nginx-default.conf /etc/nginx/templates/default.conf.template
COPY frontend/docker-entrypoint.d/05-default-backend.envsh /docker-entrypoint.d/05-default-backend.envsh

# Ensure the nginx entrypoint actually executes the fallback script.
RUN chmod +x /docker-entrypoint.d/05-default-backend.envsh

# Safe deployment defaults; Render can override these with real environment values.
ENV BACKEND_BASE_URL=https://backend-service-production-08d5.up.railway.app
ENV NGINX_RESOLVER="1.1.1.1 8.8.8.8 ipv6=off valid=30s"

# Copy built React app
COPY --from=builder /app/dist /usr/share/nginx/html

# Ensure permissions
RUN chmod -R 755 /usr/share/nginx/html

EXPOSE 80

# Run nginx in foreground
CMD ["nginx", "-g", "daemon off;"]

