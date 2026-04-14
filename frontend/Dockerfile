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

# Copy built React app
COPY --from=builder /app/dist /usr/share/nginx/html

# Ensure permissions
RUN chmod -R 755 /usr/share/nginx/html

EXPOSE 80

# Run nginx in foreground
CMD ["nginx", "-g", "daemon off;"]

