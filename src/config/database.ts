import mongoose from 'mongoose';
import config from './environment';
import logger from './logger';

export const connectToDatabase = async (): Promise<void> => {
  try {
    mongoose.set('strictQuery', true);
    const conn = await mongoose.connect(config.mongoUri);

    logger.info(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    logger.error('MongoDB connection error:', error);
    process.exit(1);
  }
};
