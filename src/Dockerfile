# Build
FROM node:22 AS build

ENV TERM=xterm
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build


# Production
FROM node:22 AS production

ENV TERM=xterm
WORKDIR /app
COPY --from=build /app . 
RUN npm install --omit=dev
EXPOSE 3000
CMD ["npm", "run", "start"]