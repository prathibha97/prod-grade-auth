import pino from 'pino';
import config from './environment';

const logger = pino({
  level: config.nodeEnv === 'development' ? 'debug' : 'info',
  transport:
    config.nodeEnv === 'development' ? { target: 'pino-pretty' } : undefined,
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export default logger;
