import { Request, Response, NextFunction } from "express";
import * as tokenService from "../services/token.service";
import { IUser } from "../../types/user";
import User from "../models/user.model";
import { ApiResponse } from "../../utils/apiResponse";
import { asyncHandler } from "../../utils/asyncHandler";
import config from "../../config/environment";

// Extract token from headers
const extractToken = (req: Request): string | null => {
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    return req.headers.authorization.split(" ")[1];
  }
  return null;
};

// Protect routes
export const protect = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  // 1) Extract token
  const token = extractToken(req);

  if (!token) {
    return ApiResponse.error(res, {
      message: "You are not logged in. Please log in to get access.",
      code: 401,
    });
  }

  try {
    // 2) Verify token
    const decoded = await tokenService.verifyToken(token, "access");

    // 3) Check if user still exists
    const user = await User.findById(decoded.id);
    if (!user) {
      return ApiResponse.error(res, {
        message: "The user belonging to this token no longer exists.",
        code: 401,
      });
    }

    // 4) Check if user is active
    if (!user.isActive) {
      return ApiResponse.error(res, {
        message: "This user account has been deactivated.",
        code: 401,
      });
    }

    // 5) Check if email is verified
    if (config.requireEmailVerification && !user.isEmailVerified) {
      return ApiResponse.error(res, {
        message: "Please verify your email to access this resource.",
        code: 403,
      });
    }

    // 6) Check if password changed after token was issued
    if (user.passwordLastChanged) {
      const passwordChangedTimestamp = user.passwordLastChanged.getTime() / 1000;
      if (decoded.iat && passwordChangedTimestamp > decoded.iat) {
        return ApiResponse.error(res, {
          message: "Password has been changed. Please log in again.",
          code: 401,
        });
      }
    }

    // GRANT ACCESS TO PROTECTED ROUTE
    req.user = user;
    next();
  } catch (error) {
    return ApiResponse.error(res, {
      message: "Invalid or expired token. Please log in again.",
      code: 401,
    });
  }
});

// Restrict to specific roles
export const restrictTo = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return ApiResponse.error(res, {
        message: "You are not logged in.",
        code: 401,
      });
    }

    if (!roles.includes((req.user as IUser).role)) {
      return ApiResponse.error(res, {
        message: "You do not have permission to perform this action",
        code: 403,
      });
    }

    next();
  };
};

// Require MFA
export const requireMfa = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const user = req.user as IUser;

  if (!user.mfaEnabled) {
    return ApiResponse.error(res, {
      message: "Multi-factor authentication is required for this action",
      code: 403,
    });
  }

  next();
});
