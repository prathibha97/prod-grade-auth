import { createServer } from 'http';
import app from './app';
import { connectToDatabase } from './config/database';
import config from './config/environment';
import logger from './config/logger';

const startServer = async (): Promise<void> => {
  try {
    // Connect to MongoDB
    await connectToDatabase();

    const server = createServer(app);

    server.listen(config.port, () => {
      logger.info(
        `Server running in ${config.nodeEnv} mode on port ${config.port}`
      );
    });

    // Handle unhandled rejections
    process.on('unhandledRejection', (err: Error) => {
      logger.error('UNHANDLED REJECTION! Shutting down...');
      logger.error(err.name, err.message);
      server.close(() => {
        process.exit(1);
      });
    });

    // Handle SIGTERM
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received. Shutting down gracefully');
      server.close(() => {
        logger.info('Process terminated');
      });
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
