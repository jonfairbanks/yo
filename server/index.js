const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const compression = require('compression')
const logger = require('./services/logger');
const helmet = require('helmet');
const axios = require('axios');

const config = require('./config/config');
const PORT = process.env.PORT || 7000;

// Connect to MongoDB
mongoose.Promise = global.Promise;
mongoose.connect(
  config.mongoURI,
  {
    keepAlive: true,
    reconnectTries: Number.MAX_VALUE,
    useNewUrlParser: true,
    useFindAndModify: false
  },
);

require('./models/yo');
const app = express();

app.set('trust proxy',true);
app.use(helmet());
app.use(compression());
app.use(bodyParser.json());

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-type,Accept,x-access-token,X-Key');
  if (req.method == 'OPTIONS') {
    res.status(200).end();
  } else {
    next();
  }
});

const server = app.listen(PORT);
const io = require('socket.io').listen(server, {pingTimeout: 60000});

app.use(require('express-status-monitor')({ websocket: io, title: "API Status | Yo - The URL Shortener"}));

require('./routes/yo')(app, io);
require('./services/cache');

io.on("connection", socket => {
  var interval = setInterval(
    () => {
      getPopYosAndEmit(socket),
      getLiveYosAndEmit(socket),
      getAllYosAndEmit(socket)
    },
    2000
  );
  io.on('disconnect', () => {
    clearInterval(interval);
  });
});

const getPopYosAndEmit = socket => {
  axios.get(config.apiUrl + "popular", {headers: {"Content-Encoding": "gzip"}})
    .then(res => { socket.emit("popYos", res.data) })
    .catch(e => { logger.error(`popYos Socket Error: ${e}`) })
};

const getLiveYosAndEmit = socket => {
  axios.get(config.apiUrl + "recent", {headers: {"Content-Encoding": "gzip"}})
    .then(res => { socket.emit("liveYos", res.data) })
    .catch(e => { logger.error(`liveYos Socket Error: ${e}`) })
};

const getAllYosAndEmit = socket => {
  axios.get(config.apiUrl, {headers: {"Content-Encoding": "gzip"}})
    .then(res => { socket.emit("allYos", res.data) })
    .catch(e => { logger.error(`allYos Socket Error: ${e}`) })
};

console.log("Yo server running on Port " + PORT);
console.log("\nApp logs are available at: \n" + config.logLocation);