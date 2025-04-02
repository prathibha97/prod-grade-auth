/**
 * Custom error interface for handling service errors with status codes
 */
interface ServiceError extends Error {
  code?: number;
}

/**
 * Safely extracts error message and code from any error
 */
export const handleServiceError = (error: unknown, defaultMessage: string, defaultCode = 500): { message: string; code: number } => {
  if (error instanceof Error) {
    const serviceError = error as ServiceError;
    return {
      message: serviceError.message || defaultMessage,
      code: serviceError.code || defaultCode,
    };
  }

  return { message: defaultMessage, code: defaultCode };
};