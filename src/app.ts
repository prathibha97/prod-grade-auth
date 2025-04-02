import cors from "cors";
import express, { Application, NextFunction, Request, Response } from "express";
import helmet from "helmet";

import compression from "compression";
import mongoSanitize from "express-mongo-sanitize";
import morgan from "morgan";
import { v4 as uuidv4 } from "uuid";
import errorHandler from "./api/middleware/errorHandler";
import { setupRateLimiter } from "./api/middleware/rateLimiter";
import requestLogger from "./api/middleware/requestLogger";
import routes from "./api/routes";
import config from "./config/environment";

// Initialize express app
const app: Application = express();

// Assign request ID
app.use((req: Request, _res: Response, next: NextFunction) => {
  req.requestId = uuidv4();
  next();
});

// Security middleware
app.use(helmet()); // Set security HTTP headers
app.use(cors()); // Enable CORS
app.use(mongoSanitize()); // Sanitize data against NoSQL injection

// Body parser middleware
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// Compression middleware
// @ts-ignore
app.use(compression());

// Logging middleware
if (config.nodeEnv === "development") {
  app.use(morgan("dev"));
}
app.use(requestLogger);

// Rate limiting
app.use(setupRateLimiter());

// API routes
app.use("/api/v1", routes);

// Health check endpoint
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "UP", timestamp: new Date().toISOString() });
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found",
  });
});

// Global error handler
app.use(errorHandler);

export default app;
