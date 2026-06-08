# --- Build: gera o bundle SSR (browser + server) ---
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
# `npm install` (em vez de `npm ci`) reconcilia o lockfile, tolerando dependências opcionais
# específicas de plataforma (ex.: @emnapi/*) ausentes do lock gerado no Windows.
RUN npm install --no-audit --no-fund

COPY . .
RUN npm run build

# --- Runtime: Node servindo o SSR (Express) ---
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000

# Apenas o artefato de build é necessário em runtime.
COPY --from=build /app/dist ./dist

EXPOSE 4000
CMD ["node", "dist/frontend/server/server.mjs"]
