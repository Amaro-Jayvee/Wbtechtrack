# Stage 1: Build React app with Vite
FROM node:18-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --prefer-offline --no-audit

COPY . .
RUN npm run build

# Stage 2: Serve with nginx - reverse proxy to backend
FROM nginx:alpine

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf
COPY nginx-default.conf /etc/nginx/conf.d/default.conf

# Copy built React app
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

# Run nginx in foreground (required for Docker)
CMD ["nginx", "-g", "daemon off;"]

