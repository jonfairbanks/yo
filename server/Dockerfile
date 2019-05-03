FROM node:12

# Internal Application Port
EXPOSE 7000

# Run as Non-Root
RUN mkdir -p /app && chown -R node:node /app
WORKDIR /app
USER node

# Quietly Install Dependencies
COPY --chown=node:node package*.json yarn*.* ./
RUN  yarn install --production --silent && yarn cache clean

# Bundle App Source
COPY --chown=node:node . .

CMD [ "node", "index.js" ]