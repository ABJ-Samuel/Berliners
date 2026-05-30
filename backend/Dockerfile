# ---- Build/runtime image -----------------------------------------------------
FROM node:20-alpine

# Sicherheit: als non-root laufen.
ENV NODE_ENV=production
WORKDIR /app

# Nur Manifeste kopieren -> bessere Layer-Caches.
COPY package.json package-lock.json* ./
RUN npm install --omit=dev && npm cache clean --force

# App-Code.
COPY src ./src
COPY public ./public

# Upload-Verzeichnis anlegen und Rechte an den node-User geben.
RUN mkdir -p /app/uploads && chown -R node:node /app
USER node

EXPOSE 3000

# Einfacher Healthcheck gegen /health.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=5 \
  CMD node -e "fetch('http://localhost:'+(process.env.PORT||3000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "src/index.js"]
