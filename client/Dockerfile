# Stage 1 - build process
FROM node:12 as build-deps

# Run as Non-Root
RUN mkdir -p /app && chown -R node:node /app
WORKDIR /app
USER node

# Quietly Install Dependencies
COPY --chown=node:node package*.json yarn*.* ./
RUN  yarn install --production --silent && yarn cache clean

# Bundle App Source
COPY --chown=node:node . ./
RUN yarn build

# Stage 2 - production environment
FROM nginx:1.16-alpine
COPY --from=build-deps /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]