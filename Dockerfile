FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=3666
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY bin ./bin
COPY src ./src
COPY public ./public
USER node
EXPOSE 3666
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://127.0.0.1:3666/healthz || exit 1
CMD ["node", "src/server.js"]
