import dotenv from "dotenv";
import path from "path";
import { Secret, SignOptions } from "jsonwebtoken";

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

interface Config {
  nodeEnv: string;
  port: number;
  mongoUri: string;
  jwtAccessSecret: Secret;
  jwtRefreshSecret: Secret;
  jwtAccessExpiresIn: SignOptions["expiresIn"];
  jwtRefreshExpiresIn: SignOptions["expiresIn"];
  jwtRefreshExpiresInDays: string;
  rateLimitWindowMs: number;
  rateLimitMax: number;
  appName: string;
  baseUrl: string;
  requireEmailVerification: boolean;
  alertOnNewLogin: boolean;
  emailHost: string;
  emailPort: number;
  emailSecure: boolean;
  emailUser: string;
  emailPassword: string;
  emailFrom: string;
}

const config: Config = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT || "5000", 10),
  mongoUri: process.env.MONGO_URI || "mongodb://localhost:27017/myapp",
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || "access_secret_replace_in_production",
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || "refresh_secret_replace_in_production",
  jwtAccessExpiresIn: parseInt(process.env.JWT_ACCESS_EXPIRES_IN || "900", 10),
  jwtRefreshExpiresIn: parseInt(process.env.JWT_REFRESH_EXPIRES_IN || String(7 * 24 * 60 * 60), 10),
  jwtRefreshExpiresInDays: process.env.JWT_REFRESH_EXPIRES_IN_DAYS || "7",
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000", 10), // 15 minutes
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || "100", 10),
  appName: process.env.APP_NAME || "My App",
  baseUrl: process.env.BASE_URL || "http://localhost:3000",
  requireEmailVerification: process.env.REQUIRE_EMAIL_VERIFICATION === "true",
  alertOnNewLogin: process.env.ALERT_ON_NEW_LOGIN === "true",
  emailHost: process.env.EMAIL_HOST || "smtp.example.com",
  emailPort: parseInt(process.env.EMAIL_PORT || "587", 10),
  emailSecure: process.env.EMAIL_SECURE === "true",
  emailUser: process.env.EMAIL_USER || "user@example.com",
  emailPassword: process.env.EMAIL_PASSWORD || "password",
  emailFrom: process.env.EMAIL_FROM || "noreply@example.com",
};

export default config;
