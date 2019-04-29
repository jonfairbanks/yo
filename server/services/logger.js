var winston = require('winston');

const logger = winston.createLogger({
  transports: [
    new winston.transports.File({ filename: 'yo.log' })
  ]
});

module.exports = logger;