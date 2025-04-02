declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production' | 'test';
    PORT: string;
    MONGO_URI: string;
    JWT_SECRET: string;
    JWT_EXPIRES_IN: string;
    RATE_LIMIT_WINDOW_MS: string;
    RATE_LIMIT_MAX: string;
  }
}
