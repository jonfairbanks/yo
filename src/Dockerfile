FROM node:22 AS deps

ENV TERM=xterm
WORKDIR /app
COPY package*.json ./
RUN npm install

FROM node:22 AS build

ENV TERM=xterm
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22 AS production

ENV NODE_ENV=production
ENV TERM=xterm
WORKDIR /app
COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
