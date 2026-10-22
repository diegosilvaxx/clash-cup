FROM node:24.21.0-bookworm-slim AS dependencies
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
COPY apps ./apps
COPY packages ./packages
RUN npm ci --include=dev

FROM dependencies AS build
COPY tooling ./tooling
COPY tsconfig.json ./
ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_AUTH_DOMAIN
ARG VITE_FIREBASE_PROJECT_ID
ARG VITE_FIREBASE_APP_ID
ARG VITE_SHELL_URL=http://127.0.0.1:5300
ARG VITE_VIP_SUPPORT_URL=https://patreon.com/clashcupbrasil
ENV CUP_CONTAINER_BUILD=true \
    VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY \
    VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN \
    VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID \
    VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID \
    VITE_SHELL_URL=$VITE_SHELL_URL \
    VITE_VIP_SUPPORT_URL=$VITE_VIP_SUPPORT_URL
RUN npm run build

FROM dependencies AS production-dependencies
RUN npm prune --omit=dev && mkdir -p apps/api/node_modules

FROM node:24.21.0-bookworm-slim AS api
WORKDIR /app
ENV NODE_ENV=production CUP_API_HOST=0.0.0.0 CUP_API_PORT=5400
COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=production-dependencies --chown=node:node /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build --chown=node:node /app/dist/api ./dist/api
COPY --chown=node:node package.json ./
COPY --chown=node:node docker/api-health.mjs ./docker/api-health.mjs
USER node
EXPOSE 5400
HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=6 CMD ["node", "docker/api-health.mjs"]
CMD ["node", "dist/api/server.js"]

FROM nginx:1.30.6-alpine AS frontend
ARG APP=shell
COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY docker/frontend.conf /etc/nginx/frontend.conf
COPY docker/gateway.conf /etc/nginx/gateway.conf
COPY --from=build /app/dist/${APP} /usr/share/nginx/html
RUN if [ "$APP" != "shell" ]; then : > /etc/nginx/gateway.conf; fi
USER nginx
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=5s --start-period=5s --retries=6 CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
ENTRYPOINT ["nginx"]
CMD ["-g", "daemon off;"]
