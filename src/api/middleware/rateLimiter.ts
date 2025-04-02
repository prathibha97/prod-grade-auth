import rateLimit from 'express-rate-limit';
import config from '../../config/environment';

export const setupRateLimiter = () => {
  return rateLimit({
    windowMs: config.rateLimitWindowMs, // 15 minutes by default
    max: config.rateLimitMax, // Limit each IP to 100 requests per windowMs
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: {
      success: false,
      message: 'Too many requests from this IP, please try again later.',
    },
  });
};
