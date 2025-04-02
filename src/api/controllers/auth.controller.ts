import { handleServiceError } from "@/utils/serviceError";
import { Request, Response } from "express";
import { ApiResponse } from "../../utils/apiResponse";
import { asyncHandler } from "../../utils/asyncHandler";
import * as authService from "../services/auth.service";

/**
 * Extracts user ID safely from request object
 * @throws Error if user ID is not available
 */
const extractUserId = (req: Request): string => {
  const userId = req.user?.id;
  if (!userId) {
    throw new Error("User ID not found");
  }
  return userId;
};

/**
 * Register a new user
 */
export const registerUser = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password } = req.body;

  try {
    const result = await authService.registerUser(name, email, password);
    return ApiResponse.success(res, {
      message: "User registered successfully",
      code: 201,
      data: result,
    });
  } catch (error) {
    const { message, code } = handleServiceError(error, "Registration failed", 400);
    return ApiResponse.error(res, { message, code });
  }
});

/**
 * Login a user
 */
export const loginUser = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const ipAddress = req.ip || "unknown";

  if (!email || !password) {
    return ApiResponse.badRequest(res, {
      message: "Please provide email and password",
    });
  }

  try {
    const result = await authService.loginUser(email, password, ipAddress);

    return ApiResponse.success(res, {
      message: result.requireMfa ? "MFA verification required" : "Logged in successfully",
      data: result,
    });
  } catch (error) {
    const { message, code } = handleServiceError(error, "Login failed", 401);
    return ApiResponse.error(res, { message, code });
  }
});

/**
 * Verify MFA token during login
 */
export const verifyMfa = asyncHandler(async (req: Request, res: Response) => {
  const { tempToken, mfaToken, useBackupCode } = req.body;
  const ipAddress = req.ip || "unknown";

  try {
    const result = await authService.verifyMfa(tempToken, mfaToken, useBackupCode, ipAddress);
    return ApiResponse.success(res, {
      message: "Logged in successfully",
      data: result,
    });
  } catch (error) {
    const { message, code } = handleServiceError(error, "MFA verification failed", 401);
    return ApiResponse.error(res, { message, code });
  }
});

/**
 * Logout a user by invalidating their refresh token
 */
export const logoutUser = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return ApiResponse.badRequest(res, {
      message: "Refresh token is required",
    });
  }

  try {
    await authService.logoutUser(refreshToken);
    return ApiResponse.success(res, {
      message: "Logged out successfully",
    });
  } catch (error) {
    const { message, code } = handleServiceError(error, "Failed to logout", 500);
    return ApiResponse.error(res, { message, code });
  }
});

/**
 * Refresh an access token using a valid refresh token
 */
export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return ApiResponse.badRequest(res, {
      message: "Refresh token is required",
    });
  }

  try {
    const result = await authService.refreshToken(refreshToken);
    return ApiResponse.success(res, {
      message: "Tokens refreshed successfully",
      data: result,
    });
  } catch (error) {
    const { message, code } = handleServiceError(error, "Token refresh failed", 401);
    return ApiResponse.error(res, { message, code });
  }
});

/**
 * Initiate password reset process
 */
export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    return ApiResponse.badRequest(res, {
      message: "Email is required",
    });
  }

  try {
    await authService.forgotPassword(email);
    // For security, always return success even if email doesn't exist
    return ApiResponse.success(res, {
      message: "If that email exists in our system, a reset link has been sent",
    });
  } catch (error) {
    // Log the error but don't reveal details to the user
    console.error("Failed to process forgot password request:", error);
    return ApiResponse.error(res, {
      message: "Failed to process request",
      code: 500,
    });
  }
});

/**
 * Reset password using a valid token
 */
export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return ApiResponse.badRequest(res, {
      message: "Token and password are required",
    });
  }

  try {
    await authService.resetPassword(token, password);
    return ApiResponse.success(res, {
      message: "Password has been reset successfully",
    });
  } catch (error) {
    const { message, code } = handleServiceError(error, "Password reset failed", 400);
    return ApiResponse.error(res, { message, code });
  }
});

/**
 * Verify a user's email address
 */
export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.body;

  if (!token) {
    return ApiResponse.badRequest(res, {
      message: "Verification token is required",
    });
  }

  try {
    const message = await authService.verifyEmail(token);
    return ApiResponse.success(res, { message });
  } catch (error) {
    const { message, code } = handleServiceError(error, "Email verification failed", 400);
    return ApiResponse.error(res, { message, code });
  }
});

/**
 * Change password for authenticated user
 */
export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return ApiResponse.badRequest(res, {
      message: "Current password and new password are required",
    });
  }

  try {
    const userId = extractUserId(req);
    await authService.changePassword(userId, currentPassword, newPassword);
    return ApiResponse.success(res, {
      message: "Password changed successfully",
    });
  } catch (error) {
    const { message, code } = handleServiceError(error, "Password change failed", 401);
    return ApiResponse.error(res, { message, code });
  }
});

/**
 * Initialize MFA setup for a user
 */
export const setupMfa = asyncHandler(async (req: Request, res: Response) => {
  try {
    const userId = extractUserId(req);
    const result = await authService.setupMfa(userId);
    return ApiResponse.success(res, {
      message: "MFA setup initialized",
      data: result,
    });
  } catch (error) {
    const { message, code } = handleServiceError(error, "MFA setup failed", 400);
    return ApiResponse.error(res, { message, code });
  }
});

/**
 * Verify MFA setup and enable MFA for user
 */
export const verifyMfaSetup = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.body;

  if (!token) {
    return ApiResponse.badRequest(res, {
      message: "Verification token is required",
    });
  }

  try {
    const userId = extractUserId(req);
    const backupCodes = await authService.verifyMfaSetup(userId, token);
    return ApiResponse.success(res, {
      message: "MFA enabled successfully",
      data: { backupCodes },
    });
  } catch (error) {
    const { message, code } = handleServiceError(error, "MFA verification failed", 400);
    return ApiResponse.error(res, { message, code });
  }
});

/**
 * Disable MFA for a user account
 */
export const disableMfa = asyncHandler(async (req: Request, res: Response) => {
  const { token, useBackupCode } = req.body;

  if (!token) {
    return ApiResponse.badRequest(res, {
      message: "Verification token is required",
    });
  }

  try {
    const userId = extractUserId(req);
    await authService.disableMfa(userId, token, useBackupCode);
    return ApiResponse.success(res, {
      message: "MFA disabled successfully",
    });
  } catch (error) {
    const { message, code } = handleServiceError(error, "Failed to disable MFA", 401);
    return ApiResponse.error(res, { message, code });
  }
});

/**
 * Get current user session information
 */
export const getSession = asyncHandler(async (req: Request, res: Response) => {
  try {
    const userId = extractUserId(req);
    const result = await authService.getSession(userId);
    return ApiResponse.success(res, {
      message: "Session retrieved",
      data: result,
    });
  } catch (error) {
    const { message, code } = handleServiceError(error, "Failed to retrieve session", 404);
    return ApiResponse.error(res, { message, code });
  }
});
