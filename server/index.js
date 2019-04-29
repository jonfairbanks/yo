const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const config = require('./config/config');
const helmet = require('helmet');
const axios = require('axios');

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

app.use(helmet());
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
const io = require('socket.io').listen(server);

require('./routes/yo')(app, io);
require('./services/cache');

io.on("connection", socket => {
  setInterval(
    () => {
      getPopYosAndEmit(socket),
      getLiveYosAndEmit(socket)
    },
    3000
  );
});

const getPopYosAndEmit = async socket => {
  try {
    const res = await axios.get(config.apiUrl + "popular");
    socket.emit("popYos", res.data);
  } catch (error) {
    console.error(`Socket Error: ${error}`);
  }
};

const getLiveYosAndEmit = async socket => {
  try {
    const res = await axios.get(config.apiUrl + "recent");
    socket.emit("liveYos", res.data);
  } catch (error) {
    console.error(`Socket Error: ${error}`);
  }
};

console.log("Yo server running on Port " + PORT);
