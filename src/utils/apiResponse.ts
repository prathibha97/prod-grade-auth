import { Response } from "express";

/**
 * Standardized response shape for API endpoints
 */
export interface ApiResponseShape<T = unknown> {
  success: boolean;
  message: string;
  code: number;
  data?: T;
  meta?: Record<string, unknown>;
}

/**
 * Options for creating API responses
 */
export interface ApiResponseOptions<T = unknown> {
  message?: string;
  data?: T;
  code?: number;
  meta?: Record<string, unknown>;
}

/**
 * Utility class for consistent API responses
 */
export class ApiResponse {
  /**
   * Creates a success response
   */
  static success<T = unknown>(
    res: Response,
    { message = "Success", data = undefined, code = 200, meta }: ApiResponseOptions<T> = {},
  ): Response<ApiResponseShape<T>> {
    const responseBody: ApiResponseShape<T> = {
      success: true,
      message,
      code,
    };

    if (data !== undefined) {
      responseBody.data = data;
    }

    if (meta) {
      responseBody.meta = meta;
    }

    return res.status(code).json(responseBody);
  }

  /**
   * Creates an error response
   */
  static error<T = unknown>(
    res: Response,
    { message = "Error", code = 500, data = undefined, meta }: ApiResponseOptions<T> = {},
  ): Response<ApiResponseShape<T>> {
    // Ensure client-side error codes are used for client errors
    const statusCode = code >= 400 && code < 600 ? code : 500;

    const responseBody: ApiResponseShape<T> = {
      success: false,
      message,
      code: statusCode,
    };

    if (data !== undefined) {
      responseBody.data = data;
    }

    if (meta) {
      responseBody.meta = meta;
    }

    return res.status(statusCode).json(responseBody);
  }

  /**
   * Creates a not found error response
   */
  static notFound(res: Response, options: Omit<ApiResponseOptions, "code"> = {}): Response {
    return this.error(res, { message: "Not found", code: 404, ...options });
  }

  /**
   * Creates a bad request error response
   */
  static badRequest(res: Response, options: Omit<ApiResponseOptions, "code"> = {}): Response {
    return this.error(res, { message: "Bad request", code: 400, ...options });
  }

  /**
   * Creates an unauthorized error response
   */
  static unauthorized(res: Response, options: Omit<ApiResponseOptions, "code"> = {}): Response {
    return this.error(res, { message: "Unauthorized", code: 401, ...options });
  }

  /**
   * Creates a forbidden error response
   */
  static forbidden(res: Response, options: Omit<ApiResponseOptions, "code"> = {}): Response {
    return this.error(res, { message: "Forbidden", code: 403, ...options });
  }
}
