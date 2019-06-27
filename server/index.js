const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const compression = require('compression')
const helmet = require('helmet');
const cors = require('cors');

require('dotenv').config()

mongoose.Promise = global.Promise;
mongoose.connect(
  process.env.MONGO_URI,
  {
    keepAlive: true,
    reconnectTries: Number.MAX_VALUE,
    useNewUrlParser: true,
    useFindAndModify: false
  },
);

require('./models/yo');

const app = express();
app.set('trust proxy', true);
app.use(helmet());
app.use(compression());
app.use(bodyParser.json());
app.use(cors());
app.use((req, res, next) => {
  // Required to prevent CORS issues
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-type,Accept,x-access-token,X-Key');
  if (req.method == 'OPTIONS') {
    res.status(200).end();
  } else {
    next();
  }
});

const PORT = process.env.PORT || 7000;
const server = app.listen(PORT);
const io = require('socket.io').listen(server, {pingTimeout: 60000});
app.io = io

console.log("Yo server running on Port " + PORT);
console.log("\nApp logs are available at: \n" + process.env.LOG_LOCATION);

require('./routes/yo')(app);
require('./services/cache');