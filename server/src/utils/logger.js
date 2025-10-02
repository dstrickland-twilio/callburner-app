import pino from 'pino';

const isDevelopment = process.env.NODE_ENV !== 'production';

/**
 * Create a logger instance with appropriate configuration
 */
const logger = pino({
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
  transport: isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          ignore: 'pid,hostname',
          translateTime: 'HH:MM:ss',
          singleLine: false
        }
      }
    : undefined
});

export default logger;
