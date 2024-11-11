# Build
FROM node:20 AS build

ENV TERM=xterm
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build


# Production
FROM node:20 AS production

ENV TERM=xterm
WORKDIR /app
COPY --from=build /app . 
RUN npm install --production
EXPOSE 3000
CMD ["npm", "run", "start"]