import { Request, Response, NextFunction } from 'express';
import logger from '../../config/logger';

const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const startTime = process.hrtime();

  logger.info({
    method: req.method,
    url: req.url,
    requestId: req.requestId,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    msg: 'Request received',
  });

  res.on('finish', () => {
    const elapsedTime = process.hrtime(startTime);
    const elapsedTimeInMs = elapsedTime[0] * 1000 + elapsedTime[1] / 1000000;

    logger.info({
      method: req.method,
      url: req.url,
      requestId: req.requestId,
      statusCode: res.statusCode,
      responseTime: `${elapsedTimeInMs.toFixed(2)}ms`,
      msg: 'Request completed',
    });
  });

  next();
};

export default requestLogger;
