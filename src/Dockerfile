FROM node:22.21.1 AS deps

ENV TERM=xterm
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci

FROM node:22.21.1 AS build

ENV TERM=xterm
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG YO_BUILD_REVISION
ENV YO_BUILD_REVISION=$YO_BUILD_REVISION
ARG NEXT_PUBLIC_DASHBOARD_TIME_ZONE=America/Los_Angeles
ENV NEXT_PUBLIC_DASHBOARD_TIME_ZONE=$NEXT_PUBLIC_DASHBOARD_TIME_ZONE
RUN npm run build

FROM node:22.21.1 AS production

ENV NODE_ENV=production
ENV TERM=xterm
WORKDIR /app
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
RUN mkdir -p .next/cache/images && chown -R node:node .next/cache
USER node
EXPOSE 3000
CMD ["node", "server.js"]
