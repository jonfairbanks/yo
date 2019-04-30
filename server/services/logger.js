var winston = require('winston');
var config = require('../config/config');

const logger = winston.createLogger({
  transports: [
    new winston.transports.File({ filename: config.logLocation })
  ]
});

module.exports = logger;