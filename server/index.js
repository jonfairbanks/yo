const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const compression = require('compression');
const helmet = require('helmet');
const cors = require('cors');
const stoppable = require('stoppable');

require('dotenv').config();

mongoose.Promise = global.Promise;

function connectToDB() {
  mongoose.connect(
    process.env.MONGO_URI || 'mongodb://localhost/yo',
    {
      useNewUrlParser: true,
      useCreateIndex: true,
      useFindAndModify: false,
      useUnifiedTopology: true,
    },
  ).catch(
    err => console.warn(`MongoDB connect error: ${err}`), // eslint-disable-line no-console
  );
}

connectToDB();

mongoose.connection.on('connected', () => {
  console.log('Yo is now connected to MongoDB...'); // eslint-disable-line no-console
});

mongoose.connection.on('disconnected', (err) => {
  console.warn(`MongoDB disconnected: ${err}`); // eslint-disable-line no-console
  setTimeout(() => { connectToDB(); }, 3000);
});

mongoose.connection.on('error', (err) => {
  console.warn(`MongoDB error: ${err}`); // eslint-disable-line no-console
  setTimeout(() => { connectToDB(); }, 3000);
});

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
const server = stoppable(app.listen(PORT), 10000); // Properly handle SIGTERM and SIGKILL
const io = require('socket.io')(server)

app.io = io;

console.log(`Yo server running on Port ${PORT}`); // eslint-disable-line
console.log(`\nApp logs are available at: \n${process.env.LOG_LOCATION}` || 'yo.log'); // eslint-disable-line

require('./routes/yo')(app);

module.exports = server;