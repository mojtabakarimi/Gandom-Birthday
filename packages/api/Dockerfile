FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package.json ./
COPY packages/api/package.json packages/api/

# Install dependencies
RUN npm install -w packages/api --ignore-scripts

# Copy API source
COPY packages/api/ packages/api/

# Create uploads directory
RUN mkdir -p /data/uploads

EXPOSE 8787

# Run migration then start server
CMD ["sh", "-c", "cd packages/api && node --import tsx src/db/migrate.ts && node --import tsx src/index.ts"]
