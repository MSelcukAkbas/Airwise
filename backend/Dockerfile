# Build stage
FROM node:20-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run server:build
RUN mkdir -p static-build
# For Expo static build if needed, though here we focus on the server
# RUN npm run expo:static:build 

# Production stage
FROM node:20-slim

WORKDIR /app

COPY --from=builder /app/package*.json ./
RUN npm install --omit=dev --no-scripts

COPY --from=builder /app/server_dist ./server_dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/static-build ./static-build
COPY --from=builder /app/assets ./assets
COPY --from=builder /app/server/templates ./server/templates

# Install prisma client
RUN npx prisma generate

EXPOSE 5000

CMD ["npm", "run", "server:prod"]
