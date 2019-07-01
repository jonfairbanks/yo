const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const compression = require('compression');
const helmet = require('helmet');
const cors = require('cors');
const stoppable = require('stoppable');

require('dotenv').config();

mongoose.Promise = global.Promise;
mongoose.connect(
  process.env.MONGO_URI || 'mongodb://localhost/yo',
  {
    keepAlive: true,
    reconnectTries: 5,
    useNewUrlParser: true,
    useFindAndModify: false,
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
  if (req.method === 'OPTIONS') {
    res.status(200).end();
  } else {
    next();
  }
});

const PORT = process.env.PORT || 7000;
const server = app.listen(PORT);
stoppable(server, 30000); // Properly handle SIGTERM and SIGKILL
const io = require('socket.io').listen(server);

app.io = io;

console.log(`Yo server running on Port ${PORT}`); // eslint-disable-line
console.log(`\nApp logs are available at: \n${process.env.LOG_LOCATION}` || 'yo.log'); // eslint-disable-line

require('./routes/yo')(app);
