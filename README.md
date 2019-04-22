<h1 align="center">
  Yo - The URL Shortener
</h1>

Yo Dawg, heard you're tired of remembering URLs

<img src="images/architecture.png" alt="architecture" />

## Dependencies

- ### Server

  - [Express](https://expressjs.com/)- Nodejs framwork for building the REST Apis
  - [Mongodb](http://mongodb.com/)- Document oriented NoSQL database
  - [Mongoose](https://http://mongoosejs.com)- MongoDB object modeling tool
  - [Short-id](https://github.com/dylang/shortid)- Short id generator
  - [Valid-url](https://github.com/ogt/valid-url)- URI validation functions
  - [Nginx](https://www.nginx.com)- Nginx is event-based and asynchronous web server.

- ### Client

  - [React](https://reactjs.org/) - JavaScript library for building user interfaces.
  - [React-router](https://github.com/ReactTraining/react-router)- Complete routing library for React
  - [Materialize css](http://materializecss.com/)- Responsive front-end framework based on Material Design
  - [React Semantic UI](https://react.semantic-ui.com/) - Front end UI Framework

## Getting Started

#### Clone the project

```sh
# Clone it
git clone https://github.com/jonfairbanks/yo.git
cd yo
```

#### Run Backend

```
# Move to server folder
cd server/

# Install dependencies
yarn install

# Start server
yarn start
```

#### Run Front End

```
# Move to client folder
cd client/

# Install dependencies
yarn install

# Start client
yarn start
```

#### Configure Nginx

Client:
```
location / {
    proxy_pass http://127.0.0.1:3000/;
    # Upgrade for Websockets
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
location ~* "^/[0-9a-z@]{1,99}$"  {
    rewrite ^/(.*)$ https://localhost:7000/api/item/$1 redirect;
}
```

Server:
```
location / {
    proxy_pass http://127.0.0.1:7000;
    # Upgrade for Websockets
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

## ☑ TODO

- [ ] Complete Semantic UI Migration
- [ ] Usage Graphs

## Contributers
Jon Fairbanks - Maintainer
