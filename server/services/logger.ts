import winston from 'winston';

const logger = winston.createLogger({
  transports: [
    new winston.transports.File({ filename: process.env.LOG_LOCATION || 'yo.log' }),
  ],
});

export default logger;