# Stage 1: Build React app with Vite
FROM node:18-alpine AS builder

ARG VITE_BACKEND_URL
ARG VITE_ENV
ENV VITE_BACKEND_URL=${VITE_BACKEND_URL}
ENV VITE_ENV=${VITE_ENV:-production}

WORKDIR /app

COPY package.json ./
RUN npm install --prefer-offline --no-audit

COPY . ./
RUN npm run build

# Stage 2: Serve with nginx - reverse proxy to backend
FROM nginx:alpine

# Remove default nginx config to avoid conflicts
RUN rm -f /etc/nginx/conf.d/default.conf

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf
COPY nginx-default.conf /etc/nginx/templates/default.conf.template
COPY docker-entrypoint.d/05-default-backend.envsh /docker-entrypoint.d/05-default-backend.envsh
COPY docker-entrypoint.d/10-runtime-config.sh /docker-entrypoint.d/10-runtime-config.sh

# Ensure the nginx entrypoint actually executes the fallback and runtime config scripts.
RUN chmod +x /docker-entrypoint.d/05-default-backend.envsh /docker-entrypoint.d/10-runtime-config.sh

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

