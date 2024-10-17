import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json() // Log in JSON format for better structure in CloudWatch
  ),
  transports: [
    new winston.transports.Console(),
  ],
});

export default logger;