var winston = require('winston');

const logger = winston.createLogger({
  transports: [
    new winston.transports.File({ filename: process.env.LOG_LOCATION })
  ]
});

module.exports = logger;