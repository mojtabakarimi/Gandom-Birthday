FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json ./
COPY packages/web/package.json packages/web/

# Install dependencies
RUN npm install -w packages/web --ignore-scripts

# Copy web source
COPY packages/web/ packages/web/

# Build
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL
RUN cd packages/web && npx vite build

# Production image with nginx
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/packages/web/dist /usr/share/nginx/html

# Copy nginx config
COPY packages/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
