FROM node:24-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:24-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/app/data

COPY server.js ./
COPY package.json ./
COPY --from=build /app/dist ./dist

VOLUME ["/app/data"]
EXPOSE 3000

CMD ["node", "server.js"]
